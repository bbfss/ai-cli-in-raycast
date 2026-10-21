require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { conversationMarkdown } = require("../src/chat-text.ts");

test("latest exchange comes first while every question stays before its answer", () => {
  const messages = [
    { id: "1", role: "user", content: "First question" },
    { id: "2", role: "assistant", content: "First answer" },
    { id: "3", role: "user", content: "Next question" },
    { id: "4", role: "assistant", content: "Next answer" },
  ];
  const before = JSON.stringify(messages);
  const output = conversationMarkdown(messages, "/my assets", "", "");
  assert.ok(output.indexOf("Next question") < output.indexOf("Next answer"));
  assert.ok(output.indexOf("Next answer") < output.indexOf("First question"));
  assert.ok(output.indexOf("First question") < output.indexOf("First answer"));
  assert.equal(output.split("\n\n---\n\n").length, 2);
  assert.ok(!output.includes("!["));
  assert.equal(JSON.stringify(messages), before);
});

test("steering and multiple assistant items retain their order within one exchange", () => {
  const messages = [
    { id: "1", role: "user", content: "Question" },
    { id: "2", role: "assistant", content: "First part" },
    { id: "3", role: "assistant", content: "Second part" },
    { id: "4", role: "user", kind: "steer", content: "Use TypeScript" },
    { id: "5", role: "assistant", content: "Final part" },
  ];
  const output = conversationMarkdown(messages, "/assets", "", "");
  const sequence = [
    "Question",
    "First part",
    "Second part",
    "Use TypeScript",
    "Final part",
  ];
  sequence
    .slice(1)
    .forEach((value, i) =>
      assert.ok(output.indexOf(sequence[i]) < output.indexOf(value)),
    );
  assert.ok(!output.includes("\n\n---\n\n"));
  assert.equal(output.match(/\*\*Codex\*\*/g).length, 2);
});

test("multiline user code remains a complete quoted Markdown block", () => {
  const output = conversationMarkdown(
    [
      {
        id: "1",
        role: "user",
        content: "Fix this:\n\n```js\nconst value = 1;\n```",
      },
    ],
    "/assets",
    "",
    "",
  );
  assert.match(output, /> Fix this:\n> \n> ```js\n> const value = 1;\n> ```/);
});

test("conversation renders code blocks with their original language and indentation", () => {
  const output = conversationMarkdown(
    [
      {
        id: "1",
        role: "assistant",
        content: "### Example\n```python\ndef run():\n    return 2 ** 3\n```",
      },
    ],
    "/assets",
    "",
    "",
  );
  assert.match(
    output,
    /### Example\n```python\ndef run\(\):\n    return 2 \*\* 3\n```/,
  );
});

test("streaming reply retains a thinking placeholder", () => {
  const output = conversationMarkdown(
    [{ id: "1", role: "assistant", content: "", status: "streaming" }],
    "/assets",
    "",
    "",
  );
  assert.match(output, /Codex/);
  assert.match(output, /Thinking…/);
});

test("empty conversation directs typing to the persistent input", () => {
  const output = conversationMarkdown([], "/assets", "", "");
  assert.match(output, /What would you like to work on/);
  assert.match(output, /Type your message above, then press Enter to send/);
  assert.doesNotMatch(output, /open|composer|Shift/);
});

test("connection errors take precedence over stale status", () => {
  const output = conversationMarkdown(
    [],
    "/assets",
    "已连接",
    "连接失败\n请重试",
  );
  assert.match(output, /^\*\*Connection Notice\*\* · 连接失败 请重试/);
  assert.ok(!output.includes("已连接"));
});
