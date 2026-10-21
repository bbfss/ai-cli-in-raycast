import { LocalStorage } from "@raycast/api";
import {
  CodexAppServer,
  type CodexEvent,
  type CodexModel,
  type ModelSelection,
  type SandboxMode,
} from "./codex";
import { AntigravityClient } from "./provider-antigravity";
import { CliChatClient } from "./provider-cli";
import type { CliProviderId } from "./cli-protocols";
export type ProviderId = "codex" | "antigravity" | CliProviderId;
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  codex: "Codex",
  antigravity: "Antigravity",
  qoder: "Qoder",
  "qoder-cn": "Qoder CN",
  workbuddy: "WorkBuddy",
  gemini: "Gemini",
};
export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && Object.hasOwn(PROVIDER_LABELS, value);
}
export interface ChatClient {
  readonly currentThreadId: string | null;
  readonly currentTurnId: string | null;
  readonly threadSnapshot: Record<string, unknown>;
  readonly currentModelSelection: ModelSelection;
  connect(): Promise<void>;
  checkAuthentication(): Promise<void>;
  listModels(): Promise<CodexModel[]>;
  startThread(): Promise<string>;
  resumeThread(id: string): Promise<string>;
  startTurn(prompt: string, selection?: ModelSelection | null): Promise<void>;
  steer(prompt: string): Promise<void>;
  interrupt(): Promise<void>;
  close(): void;
}
export function providerCapabilities(provider: ProviderId) {
  return {
    label: PROVIDER_LABELS[provider],
    supportsSteering: provider === "codex",
    supportsEffort: provider === "codex",
  };
}
export function createProviderClient(
  provider: ProviderId,
  options: {
    onEvent(event: CodexEvent): void;
    sandbox: SandboxMode;
    cwd?: string;
    codexPath?: string;
    agyPath?: string;
    qoderPath?: string;
    qoderCnPath?: string;
    workbuddyPath?: string;
    geminiPath?: string;
    liveSearch: boolean;
  },
): ChatClient {
  if (provider === "codex") return new CodexAppServer(options);
  if (provider !== "antigravity")
    return new CliChatClient({
      ...options,
      provider,
      cliPath: {
        qoder: options.qoderPath,
        "qoder-cn": options.qoderCnPath,
        workbuddy: options.workbuddyPath,
        gemini: options.geminiPath,
      }[provider],
      sessions: {
        get: (id) =>
          LocalStorage.getItem<string>(
            `ai-in-raycast.${provider}-session.${id}`,
          ),
        set: (id, remote) =>
          LocalStorage.setItem(
            `ai-in-raycast.${provider}-session.${id}`,
            remote,
          ),
      },
    });
  return new AntigravityClient({
    ...options,
    sessions: {
      get: (id) =>
        LocalStorage.getItem<string>(`ai-in-raycast.agy-session.${id}`),
      set: (id, remote) =>
        LocalStorage.setItem(`ai-in-raycast.agy-session.${id}`, remote),
    },
  });
}
