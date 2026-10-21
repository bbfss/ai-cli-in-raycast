import { t } from "./i18n";
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
          ? t("You · Additional Instructions")
          : t("You");
    const avatar =
      message.role === "assistant"
        ? assistant === "Codex"
          ? "suite-icon.png"
          : "cli-avatar.svg"
        : "user-avatar.svg";
    const avatarURL = pathToFileURL(join(assetsPath, avatar));
    avatarURL.search = "raycast-width=22&raycast-height=22";
    const body = renderMarkdown(message.content) || t("Thinking…");
    return `![${speaker}](<${avatarURL.href}>) **${speaker}**\n\n${body}`;
  });
  const notice = error || status;
  const header = notice
    ? `${error ? `**${t("Connection Notice")}** · ` : ""}${notice.replace(/\r?\n/g, " ")}\n\n`
    : "";
  return (
    header +
    (cards.join("\n\n---\n\n") ||
      `### ${assistant} in Raycast\n\n${t("Press Enter to open the message composer.")}`)
  );
}
