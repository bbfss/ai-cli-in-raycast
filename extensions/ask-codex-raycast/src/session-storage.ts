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
