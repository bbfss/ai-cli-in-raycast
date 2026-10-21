import {
  spawn,
  execFile,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, delimiter } from "node:path";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import type { CodexEvent, CodexModel, ModelSelection } from "./codex";
import { expandHome } from "./executable";
import { asRecord, asString } from "./conversations";

type SessionStore = {
  get(id: string): Promise<string | undefined>;
  set(id: string, remote: string): Promise<void>;
};
type Options = {
  onEvent(event: CodexEvent): void;
  cwd?: string;
  agyPath?: string;
  sessions: SessionStore;
};

export function parseAgyModels(output: string): CodexModel[] {
  return output.split(/\r?\n/).flatMap((line) => {
    const [model, ...name] = line.trim().split("\t");
    return name.length && /^[\w./-]+$/.test(model)
      ? [
          {
            model,
            displayName: name.join(" ").trim() || model,
            efforts: [],
            defaultEffort: "",
          },
        ]
      : [];
  });
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(
      command,
      args,
      { env, timeout: 25_000, maxBuffer: 1024 * 1024, windowsHide: true },
      (error, stdout) =>
        error
          ? reject(
              new Error(
                "Antigravity CLI could not complete the connection check. Open agy in your terminal and check its sign-in.",
              ),
            )
          : resolve(stdout),
    ),
  );
}

export async function resolveAgyExecutable(
  explicit?: string,
): Promise<{ command: string; env: NodeJS.ProcessEnv }> {
  const env = {
    ...process.env,
    PATH: [
      join(homedir(), ".local", "bin"),
      "/opt/homebrew/bin",
      "/usr/local/bin",
      process.env.PATH,
    ]
      .filter(Boolean)
      .join(delimiter),
  };
  const requested = explicit?.trim();
  const candidates = requested
    ? [expandHome(requested)]
    : [
        join(
          homedir(),
          ".local",
          "bin",
          process.platform === "win32" ? "agy.exe" : "agy",
        ),
        "/opt/homebrew/bin/agy",
        "/usr/local/bin/agy",
      ];
  if (!requested) {
    try {
      candidates.push(
        ...(
          await run(
            process.platform === "win32" ? "where.exe" : "/usr/bin/which",
            ["agy"],
            env,
          )
        )
          .trim()
          .split(/\r?\n/),
      );
    } catch {
      /* Try standard paths. */
    }
  }
  for (const command of candidates) {
    // Shell wrappers are deliberately excluded: prompts must remain literal argv.
    if (/\.(cmd|bat|ps1)$/i.test(command)) continue;
    try {
      accessSync(
        command,
        process.platform === "win32" ? constants.F_OK : constants.X_OK,
      );
      return {
        command,
        env: { ...env, PATH: [dirname(command), env.PATH].join(delimiter) },
      };
    } catch {
      /* Try next executable. */
    }
  }
  throw new Error(
    "Antigravity CLI (agy) was not found. Install and sign in to agy, or set Antigravity Path to its native executable.",
  );
}

/** One explicit AGY conversation per local thread; never resumes the CLI's latest session. */
export class AntigravityClient {
  private executable: Awaited<ReturnType<typeof resolveAgyExecutable>> | null =
    null;
  private child: ChildProcessWithoutNullStreams | null = null;
  private threadId: string | null = null;
  private remoteId: string | undefined;
  private turnId: string | null = null;
  private selection: ModelSelection = { model: "", effort: "" };
  private closed = false;
  private stop: (() => void) | null = null;
  private catalog: CodexModel[] = [];
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
  async connect() {
    this.executable = await resolveAgyExecutable(this.options.agyPath);
    if (this.closed) throw new Error("Connection closed");
  }
  async checkAuthentication() {
    if (!(await this.listModels()).length)
      throw new Error(
        "No Antigravity models available. Open agy in your terminal and sign in.",
      );
  }
  async listModels() {
    if (!this.executable) throw new Error("Antigravity is not connected");
    this.catalog = parseAgyModels(
      await run(this.executable.command, ["models"], this.executable.env),
    );
    return this.catalog;
  }
  async startThread() {
    if (this.child)
      throw new Error(
        "Stop the active response before starting another session.",
      );
    this.threadId = `antigravity:${randomUUID()}`;
    this.remoteId = undefined;
    return this.threadId;
  }
  async resumeThread(id: string) {
    if (this.child)
      throw new Error("Stop the active response before switching sessions.");
    if (!/^antigravity:[0-9a-f-]{36}$/.test(id))
      throw new Error("This session belongs to a different CLI.");
    const remote = await this.options.sessions.get(id);
    if (!remote)
      throw new Error(
        "Antigravity session mapping is unavailable. Start a new session.",
      );
    this.threadId = id;
    this.remoteId = remote;
    return id;
  }
  async startTurn(prompt: string, selection?: ModelSelection | null) {
    if (this.closed || !this.executable)
      throw new Error("Antigravity is not connected");
    if (this.child)
      throw new Error(
        "Wait for Antigravity to finish, or stop its current response.",
      );
    if (!this.threadId) await this.startThread();
    if (
      !selection?.model ||
      !this.catalog.some((m) => m.model === selection.model)
    )
      throw new Error("Select an available Antigravity model before sending.");
    this.selection = { model: selection.model, effort: "" };
    const threadId = this.threadId!;
    const turnId = randomUUID();
    const itemId = randomUUID();
    const args = [
      "--model",
      selection.model,
      "--sandbox",
      "--mode",
      "plan",
      "--disable-slash-commands",
      "--output-format",
      "stream-json",
      "--print-timeout",
      "300s",
      ...(this.remoteId
        ? ["--conversation", this.remoteId]
        : ["--new-project"]),
      "--print",
      prompt,
    ];
    const child = spawn(this.executable.command, args, {
      env: this.executable.env,
      cwd: this.options.cwd ? expandHome(this.options.cwd) : homedir(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    });
    this.child = child;
    this.turnId = turnId;
    const reader = createInterface({ input: child.stdout });
    let done = false,
      bytes = 0,
      resultSeen = false;
    let persist = Promise.resolve();
    const emit = (method: string, params: Record<string, unknown>) =>
      this.options.onEvent({ method, params: { threadId, turnId, ...params } });
    const terminate = (signal: NodeJS.Signals) => {
      if (child.pid && process.platform !== "win32") {
        try {
          process.kill(-child.pid, signal);
        } catch {
          /* Already exited. */
        }
      } else if (child.pid) {
        execFile(
          "taskkill.exe",
          ["/PID", String(child.pid), "/T", "/F"],
          { windowsHide: true },
          () => {},
        );
      }
    };
    const finish = (status: string, error?: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reader.close();
      if (child.exitCode === null && child.signalCode === null) {
        terminate("SIGTERM");
        const kill = setTimeout(() => {
          terminate("SIGKILL");
        }, 1500);
        kill.unref();
      }
      this.turnId = null;
      this.stop = null;
      emit("turn/completed", {
        turn: {
          id: turnId,
          status,
          ...(error ? { error: { message: error } } : {}),
        },
      });
    };
    const timer = setTimeout(
      () =>
        finish(
          "failed",
          "Antigravity timed out. You can retry or continue in agy.",
        ),
      310_000,
    );
    this.stop = () => finish("interrupted");
    child.stdin.end();
    child.stdin.on("error", () => {});
    child.stderr.on("data", () => {}); // Drain stderr; it can contain private CLI diagnostics.
    emit("turn/started", { turn: { id: turnId } });
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 16 * 1024 * 1024)
        finish("failed", "Antigravity output exceeded the supported size.");
    });
    reader.on("line", (line) => {
      if (done) return;
      let data: Record<string, unknown>;
      try {
        data = asRecord(JSON.parse(line));
      } catch {
        return;
      }
      if (data.event === "init") {
        const remote = asString(data.conversation_id);
        if (!remote) {
          finish("failed", "Antigravity did not return a conversation ID.");
          return;
        }
        this.remoteId = remote;
        persist = this.options.sessions.set(threadId, remote).catch(() => {
          finish(
            "failed",
            "Could not save the Antigravity session. Try again.",
          );
        });
      }
      if (data.event === "step_update") {
        const step = asRecord(data.step_update);
        if (
          step.step_type === "agent_response" &&
          typeof step.text_delta === "string"
        )
          emit("item/agentMessage/delta", { itemId, delta: step.text_delta });
        if (
          /permission|approval|user_input_required/i.test(
            asString(step.step_type),
          )
        )
          finish(
            "failed",
            "Antigravity needs interactive approval. Continue this conversation in agy.",
          );
      }
      if (data.event === "result") {
        resultSeen = true;
        const result = asRecord(data.result);
        void persist.then(() => {
          if (done) return;
          if (result.status === "SUCCESS") {
            emit("item/completed", {
              item: {
                id: itemId,
                type: "agentMessage",
                text: asString(result.response),
              },
            });
            finish("completed");
          } else
            finish(
              "failed",
              "Antigravity could not complete the response. Check the conversation in agy.",
            );
        });
      }
    });
    child.on("error", () =>
      finish("failed", "Could not launch Antigravity CLI."),
    );
    child.on("close", () => {
      if (this.child === child) this.child = null;
      if (!resultSeen)
        finish("failed", "Antigravity exited before completing the response.");
    });
  }
  async steer(): Promise<void> {
    throw new Error(
      "Antigravity does not support steering here. Stop the response or wait for it to finish.",
    );
  }
  async interrupt() {
    const child = this.child;
    if (!child) return;
    const stopped = new Promise<void>((resolve) =>
      child.once("close", () => resolve()),
    );
    this.stop?.();
    await stopped;
  }
  close() {
    this.closed = true;
    this.stop?.();
  }
}
