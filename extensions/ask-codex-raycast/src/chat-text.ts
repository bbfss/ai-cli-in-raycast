import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ChatMessage } from "./conversations";
import { renderMarkdown } from "./markdown";

export function conversationMarkdown(
  messages: ChatMessage[],
  assetsPath: string,
  status: string,
  error: string,
  assistant = "Codex",
) {
  const cards = [...messages].reverse().map((message) => {
    const speaker =
      message.role === "assistant"
        ? assistant
        : message.kind === "steer"
          ? "You · Additional Instructions"
          : "You";
    const avatar =
      message.role === "assistant"
        ? assistant === "Codex"
          ? "command-icon.png"
          : "cli-avatar.svg"
        : "user-avatar.svg";
    const avatarURL = pathToFileURL(join(assetsPath, avatar));
    avatarURL.search = "raycast-width=22&raycast-height=22";
    const body = renderMarkdown(message.content) || "Thinking…";
    return `![${speaker}](<${avatarURL.href}>) **${speaker}**\n\n${body}`;
  });
  const notice = error || status;
  const header = notice
    ? `${error ? "**Connection Notice** · " : ""}${notice.replace(/\r?\n/g, " ")}\n\n`
    : "";
  return (
    header +
    (cards.join("\n\n---\n\n") ||
      "**AI in Raycast**\n\nPress Enter to open the message composer, enter your message, and press Enter to send. Replies and follow-ups will stay in the same conversation.")
  );
}
