import type { ProviderId } from "./provider";

export const PROVIDERS = [
  {
    id: "codex",
    title: "Codex CLI",
    description: "Streaming local Codex conversations",
  },
  {
    id: "antigravity",
    title: "Antigravity CLI",
    description: "Chat through your installed agy CLI",
  },
  { id: "qoder", title: "Qoder CLI", description: "International Qoder CLI" },
  {
    id: "qoder-cn",
    title: "Qoder CN CLI",
    description: "Qoder CN with its own sign-in and sessions",
  },
  {
    id: "workbuddy",
    title: "WorkBuddy CLI",
    description: "WorkBuddy's installed command-line client",
  },
  {
    id: "gemini",
    title: "Gemini CLI",
    description: "Google Gemini CLI with its own sessions",
  },
];
export const ACTIVE_PROVIDER_KEY = "ai-in-raycast.active-provider.v1";
export function storageKeys(provider: ProviderId) {
  if (provider === "codex")
    return {
      library: "ask-codex.conversations.v2",
      legacy: "ask-codex.current-conversation.v1",
      model: "ask-chatgpt.model-selection.v1",
      setup: "codex-in-raycast.setup.v1",
    };
  const prefix = `ai-in-raycast.${provider}`;
  return {
    library: `${prefix}.conversations.v2`,
    legacy: `${prefix}.legacy`,
    model: `${prefix}.model.v1`,
    setup: `${prefix}.setup.v1`,
  };
}
