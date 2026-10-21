import { t } from "./i18n";
import type { ChatMessage } from "./conversations";
import { renderMarkdown } from "./markdown";

export function conversationMarkdown(
  messages: ChatMessage[],
  _assetsPath: string,
  status: string,
  error: string,
  assistant = "Codex",
) {
  // Keep the latest exchange in view without reversing question/answer order.
  // Steering and multiple assistant items stay in their original turn order.
  const rounds: ChatMessage[][] = [];
  for (const message of messages) {
    if (!rounds.length || (message.role === "user" && message.kind !== "steer"))
      rounds.push([]);
    rounds[rounds.length - 1].push(message);
  }
  const cards = rounds.reverse().map((round) =>
    round
      .map((message, index) => {
        const body = renderMarkdown(message.content) || t("Thinking…");
        if (message.role === "user") {
          const label =
            message.kind === "steer" ? t("Additional Instructions") : t("You");
          // Quote every line so multiline prompts and fenced code remain a
          // single, readable question block in Raycast's native Markdown.
          return `**${label}**\n\n${body
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")}`;
        }
        return round[index - 1]?.role === "assistant"
          ? body
          : `**${assistant}**\n\n${body}`;
      })
      .join("\n\n"),
  );
  const notice = error || status;
  const header = notice
    ? `${error ? `**${t("Connection Notice")}** · ` : ""}${notice.replace(/\r?\n/g, " ")}\n\n`
    : "";
  return (
    header +
    (cards.join("\n\n---\n\n") ||
      `### ${t("What would you like to work on?")}\n\n${t("Type your message above, then press Enter to send.")}`)
  );
}
