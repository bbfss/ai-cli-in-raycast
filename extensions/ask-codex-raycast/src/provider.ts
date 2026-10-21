import { LocalStorage } from "@raycast/api";
import {
  CodexAppServer,
  type CodexEvent,
  type CodexModel,
  type ModelSelection,
  type SandboxMode,
} from "./codex";
import { AntigravityClient } from "./provider-antigravity";
export type ProviderId = "codex" | "antigravity";
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
    label: provider === "codex" ? "Codex" : "Antigravity",
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
    liveSearch: boolean;
  },
): ChatClient {
  if (provider === "codex") return new CodexAppServer(options);
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
