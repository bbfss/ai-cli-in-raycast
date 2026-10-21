require("./load.cjs");
const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { setLanguage, uiLanguage, t } = require("../src/i18n.ts");
const { conversationMarkdown } = require("../src/chat-text.ts");

afterEach(() => setLanguage("en"));

test("language selection accepts explicit supported values and safely defaults to English", () => {
  for (const value of [undefined, null, "auto", "de", {}, "EN"]) {
    assert.equal(setLanguage(value), "en");
    assert.equal(uiLanguage(), "en");
    assert.equal(t("CLI Settings"), "CLI Settings");
  }
  assert.equal(setLanguage("zh-CN"), "zh-CN");
  assert.equal(t("CLI Settings"), "CLI 设置");
  assert.equal(setLanguage("zh-TW"), "zh-TW");
  assert.equal(t("CLI Settings"), "CLI 設定");
  assert.equal(t("Save and Start Chatting"), "儲存並開始對話");
});

test("placeholder substitution preserves opaque values, missing tokens, and unknown diagnostics", () => {
  setLanguage("zh-CN");
  assert.equal(
    t("Connecting to {provider}…", { provider: "Gemini {provider} $&" }),
    "正在连接 Gemini {provider} $&…",
  );
  assert.equal(t("Connecting to {provider}…"), "正在连接 {provider}…");
  assert.equal(
    t("backend ERR_UNSUPPORTED_CLIENT: {detail}", {
      detail: "user's raw diagnostic",
    }),
    "backend ERR_UNSUPPORTED_CLIENT: user's raw diagnostic",
  );
  assert.equal(t("{constructor} {count}", { count: 0 }), "{constructor} 0");
});

test("localized renderer translates interface copy while preserving conversation and provider text", () => {
  setLanguage("zh-TW");
  const empty = conversationMarkdown([], "/assets", "", "", "Qoder CN");
  assert.match(empty, /想聊點什麼/);
  assert.match(empty, /在上方輸入訊息，按 Enter 傳送/);
  assert.doesNotMatch(empty, /\| --- \|/);
  const messages = [
    { id: "user", role: "user", content: "CLI Settings" },
    {
      id: "assistant",
      role: "assistant",
      content: "Model: gpt-6.1-sol\n**Answer**",
    },
  ];
  const rendered = conversationMarkdown(
    messages,
    "/assets",
    "",
    "CLI raw error",
    "Gemini",
  );
  assert.match(rendered, /\*\*連線提示\*\* · CLI raw error/);
  assert.match(rendered, /CLI Settings/);
  assert.match(rendered, /Model: gpt-6.1-sol *\n\*\*Answer\*\*/);
  assert.match(rendered, /\*\*你\*\*/);
  assert.match(rendered, /\*\*Gemini\*\*/);
  assert.equal(messages[0].content, "CLI Settings");
});
