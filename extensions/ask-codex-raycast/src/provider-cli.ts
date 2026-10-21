import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import type { CodexEvent, CodexModel, ModelSelection } from "./codex";
import {
  buildCliArgs,
  parseCliEvent,
  parseCliModels,
  type CliProviderId,
} from "./cli-protocols";
import {
  resolveCliExecutable,
  runCli,
  type CliExecutable,
} from "./cli-executable";
import { expandHome } from "./executable";

type Options = {
  provider: CliProviderId;
  cliPath?: string;
  cwd?: string;
  onEvent(event: CodexEvent): void;
  sessions: {
    get(id: string): Promise<string | undefined>;
    set(id: string, remote: string): Promise<void>;
  };
};
function bounded<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** Vendor protocols share lifecycle, but never a session store or latest-session fallback. */
export class CliChatClient {
  private executable: CliExecutable | null = null;
  private child: ChildProcessWithoutNullStreams | null = null;
  private closed = false;
  private threadId: string | null = null;
  private remoteId: string | undefined;
  private turnId: string | null = null;
  private selection: ModelSelection = { model: "", effort: "" };
  private catalog: CodexModel[] = [];
  private stop: (() => void) | null = null;
  private stopped: Promise<void> = Promise.resolve();
  constructor(private readonly options: Options) {}
  get currentThreadId() {
    return this.threadId;
  }
  get currentTurnId() {
    return this.turnId;
  }
  get currentModelSelection() {
    return { ...this.selection };
  }
  get threadSnapshot(): Record<string, unknown> {
    return { cwd: this.options.cwd || "", turns: [] };
  }
  private checkOpen() {
    if (this.closed) throw new Error("Connection closed");
  }
  async connect() {
    this.checkOpen();
    this.executable = await resolveCliExecutable(
      this.options.provider,
      this.options.cliPath,
    );
    this.checkOpen();
  }
  async checkAuthentication() {
    this.checkOpen();
    if (!this.executable) throw new Error("CLI is not connected");
    // A local version check is deliberately not presented as proof of sign-in.
    await runCli(this.executable, ["--version"]);
    this.checkOpen();
  }
  async listModels() {
    this.checkOpen();
    if (!this.executable) throw new Error("CLI is not connected");
    this.catalog = [];
    const provider = this.options.provider;
    const output =
      provider === "gemini"
        ? ""
        : await runCli(this.executable, [
            provider === "workbuddy" ? "--help" : "--list-models",
          ]);
    this.checkOpen();
    this.catalog = [
      {
        model: "__cli_default__",
        displayName: "CLI Default",
        efforts: [],
        defaultEffort: "",
      },
      ...parseCliModels(provider, output),
    ];
    return this.catalog;
  }
  async startThread() {
    this.checkOpen();
    if (this.child)
      throw new Error(
        "Stop the active response before starting another session.",
      );
    this.threadId = `${this.options.provider}:${randomUUID()}`;
    this.remoteId = undefined;
    return this.threadId;
  }
  async resumeThread(id: string) {
    this.checkOpen();
    if (this.child)
      throw new Error("Stop the active response before switching sessions.");
    if (
      !id.startsWith(`${this.options.provider}:`) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        id.slice(this.options.provider.length + 1),
      )
    )
      throw new Error("This session belongs to a different CLI.");
    const remote = await this.options.sessions.get(id);
    this.checkOpen();
    if (!remote)
      throw new Error(
        "CLI session mapping is unavailable. Start a new session.",
      );
    buildCliArgs(this.options.provider, {
      prompt: "",
      model: "",
      remoteId: remote,
    });
    this.threadId = id;
    this.remoteId = remote;
    return id;
  }
  async startTurn(prompt: string, selection?: ModelSelection | null) {
    this.checkOpen();
    if (!this.executable) throw new Error("CLI is not connected");
    if (this.child)
      throw new Error("Wait for the response to finish, or stop it first.");
    if (
      !selection?.model ||
      !this.catalog.some((model) => model.model === selection.model)
    )
      throw new Error("Select an available CLI model before sending.");
    if (!this.threadId) await this.startThread();
    this.checkOpen();
    if (this.child)
      throw new Error("Wait for the response to finish, or stop it first.");
    this.selection = { model: selection.model, effort: "" };
    const threadId = this.threadId!;
    const turnId = randomUUID();
    const itemId = randomUUID();
    const args = buildCliArgs(this.options.provider, {
      prompt,
      model: selection.model,
      remoteId: this.remoteId,
    });
    const child = spawn(
      this.executable.command,
      [...this.executable.prefix, ...args],
      {
        env: this.executable.env,
        cwd: this.options.cwd ? expandHome(this.options.cwd) : homedir(),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32",
      },
    );
    this.child = child;
    this.turnId = turnId;
    let resolveStopped!: () => void;
    this.stopped = new Promise((resolve) => {
      resolveStopped = resolve;
    });
    const reader = createInterface({ input: child.stdout });
    let outcome: { status: string; error?: string } | undefined;
    let remote = this.remoteId;
    let seenSession = false;
    let bytes = 0;
    let text = "";
    let persistenceError = false;
    let persist = Promise.resolve();
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const emit = (method: string, params: Record<string, unknown>) =>
      this.options.onEvent({ method, params: { threadId, turnId, ...params } });
    const kill = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      if (process.platform === "win32")
        execFile(
          "taskkill.exe",
          ["/PID", String(child.pid), "/T", "/F"],
          { windowsHide: true, timeout: 5000 },
          () => {},
        );
      else {
        try {
          process.kill(-child.pid, signal);
        } catch {
          /* Already exited. */
        }
      }
    };
    const finish = (status: string, error?: string) => {
      if (outcome) return;
      outcome = { status, error };
      clearTimeout(timer);
      reader.close();
      if (child.exitCode === null && child.signalCode === null) {
        kill("SIGTERM");
        killTimer = setTimeout(() => kill("SIGKILL"), 1500);
        killTimer.unref();
      }
    };
    const timer = setTimeout(
      () =>
        finish(
          "failed",
          "CLI response timed out. Retry or continue in your terminal.",
        ),
      310_000,
    );
    this.stop = () => {
      if (outcome) kill("SIGKILL");
      else finish("interrupted");
    };
    child.stdin.on("error", () => {});
    child.stdin.end();
    child.stderr.on("data", () => {}); // Drain private diagnostics without logging or displaying them.
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 16 * 1024 * 1024)
        finish("failed", "CLI output exceeded the supported size.");
    });
    reader.on("line", (line) => {
      if (outcome) return;
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        return;
      }
      const step = parseCliEvent(this.options.provider, value);
      if (step.sessionId) {
        if (remote && remote !== step.sessionId) {
          finish(
            "failed",
            "The CLI returned a different conversation. The saved session was not changed.",
          );
          return;
        }
        try {
          buildCliArgs(this.options.provider, {
            prompt: "",
            model: "",
            remoteId: step.sessionId,
          });
        } catch {
          finish("failed", "The CLI returned an invalid session ID.");
          return;
        }
        seenSession = true;
        if (!remote) {
          remote = step.sessionId;
          const id = remote;
          persist = bounded(
            Promise.resolve().then(() =>
              this.options.sessions.set(threadId, id),
            ),
            5000,
            "Session save timed out",
          )
            .then(() => {
              if (this.threadId === threadId) this.remoteId = id;
            })
            .catch(() => {
              persistenceError = true;
              finish(
                "failed",
                "Could not save the CLI session. Start a new session before retrying.",
              );
            });
        }
      }
      if (step.delta !== undefined) {
        text += step.delta;
        emit("item/agentMessage/delta", { itemId, delta: step.delta });
      }
      if (step.text !== undefined) {
        text = step.text;
        emit("item/completed", {
          item: { id: itemId, type: "agentMessage", text },
        });
      }
      if (step.result) {
        if (step.result === "completed" && !seenSession)
          finish(
            "failed",
            "The CLI did not confirm its session ID. Start a new session.",
          );
        else finish(step.result, step.error);
      }
    });
    child.on("error", () => finish("failed", "Could not launch the CLI."));
    child.once("close", () => {
      // A detached group's leader can exit while descendants ignore SIGTERM.
      if (process.platform !== "win32") kill("SIGKILL");
      clearTimeout(timer);
      clearTimeout(killTimer);
      reader.close();
      void persist.then(() => {
        const result = persistenceError
          ? {
              status: "failed",
              error:
                "Could not save the CLI session. Start a new session before retrying.",
            }
          : outcome || {
              status: "failed",
              error:
                "The CLI exited before completing its response. Check sign-in in your terminal.",
            };
        if (this.child === child) {
          this.child = null;
          this.turnId = null;
          this.stop = null;
        }
        if (result.status === "completed")
          emit("item/completed", {
            item: { id: itemId, type: "agentMessage", text },
          });
        emit("turn/completed", {
          turn: {
            id: turnId,
            status: result.status,
            ...(result.error ? { error: { message: result.error } } : {}),
          },
        });
        resolveStopped();
      });
    });
    emit("turn/started", { turn: { id: turnId } });
  }
  async steer(): Promise<void> {
    throw new Error(
      "This CLI does not support steering here. Stop the response or wait for it to finish.",
    );
  }
  async interrupt() {
    if (!this.child) return;
    this.stop?.();
    await bounded(
      this.stopped,
      12_000,
      "The CLI has not stopped yet. Close it in your terminal before continuing.",
    );
  }
  close() {
    this.closed = true;
    this.stop?.();
  }
}
