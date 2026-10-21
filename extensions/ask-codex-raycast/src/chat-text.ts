import { t } from "./i18n";
import type { ChatMessage } from "./conversations";
import { renderMarkdown } from "./markdown";

/** Newest exchanges first; preserve the original order inside each exchange. */
export function conversationGroups(messages: ChatMessage[]): ChatMessage[][] {
  const groups: ChatMessage[][] = [];
  for (const message of messages) {
    if (!groups.length || (message.role === "user" && message.kind !== "steer"))
      groups.push([]);
    groups[groups.length - 1].push(message);
  }
  return groups.reverse();
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const wideCharacter =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}]/u;

/** Approximate native list width without truncating words or Unicode clusters. */
export function splitChatLines(text: string, maxWidth = 80): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r\n|[\r\n]/)) {
    const parts = [...graphemes.segment(paragraph)].map((part) => part.segment);
    if (!parts.length) {
      lines.push("");
      continue;
    }
    let start = 0,
      index = 0,
      width = 0,
      boundary = -1;
    while (index < parts.length) {
      const size = wideCharacter.test(parts[index]) ? 5 : 3;
      if (index > start && width + size > maxWidth * 3) {
        const end = boundary > start ? boundary : index;
        lines.push(parts.slice(start, end).join(""));
        start = end;
        index = end;
        width = 0;
        boundary = -1;
        continue;
      }
      width += size;
      if (
        /\s/u.test(parts[index]) ||
        /[，。！？、；：,.!?;:]/u.test(parts[index])
      )
        boundary = index + 1;
      index += 1;
    }
    if (start < parts.length) lines.push(parts.slice(start).join(""));
  }
  return lines;
}

export function conversationMarkdown(
  messages: ChatMessage[],
  _assetsPath: string,
  status: string,
  error: string,
  assistant = "Codex",
) {
  // Keep the latest exchange in view without reversing question/answer order.
  // Steering and multiple assistant items stay in their original turn order.
  const cards = conversationGroups(messages).map((round) =>
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
