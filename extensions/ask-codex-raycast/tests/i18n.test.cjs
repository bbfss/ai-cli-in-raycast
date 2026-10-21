require("./load.cjs");
const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { setLanguage, uiLanguage, t } = require("../src/i18n.ts");
const { conversationMarkdown } = require("../src/chat-text.ts");
const {
  parseLibrary,
  conversationTitle,
  filterSessions,
} = require("../src/conversations.ts");

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
  assert.match(empty, /按 Enter 開始輸入/);
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

test("conversation format failures remain fail-closed and use the chosen language", () => {
  const raw = '{"version":99,"sessions":[]}';
  for (const [language, expected] of [
    ["zh-CN", "无法识别对话记录格式。原始记录已保留，请勿清除扩展数据。"],
    ["zh-TW", "無法辨識對話記錄格式。原始記錄已保留，請勿清除擴充功能資料。"],
  ]) {
    setLanguage(language);
    assert.throws(() => parseLibrary(raw), { message: expected });
  }
});

test("history localizes only its generated fallback and filtering never persists the label", () => {
  const sessions = Object.freeze([
    Object.freeze({
      threadId: "draft",
      messages: Object.freeze([]),
      draft: "New Chat",
    }),
    Object.freeze({
      threadId: "title",
      title: "New Chat",
      messages: Object.freeze([]),
    }),
    Object.freeze({
      threadId: "prompt",
      messages: Object.freeze([
        Object.freeze({ id: "user", role: "user", content: "New Chat" }),
      ]),
    }),
  ]);
  const original = JSON.stringify(sessions);
  for (const [language, label] of [
    ["zh-CN", "新对话"],
    ["zh-TW", "新對話"],
  ]) {
    setLanguage(language);
    assert.equal(conversationTitle(sessions[0]), label);
    assert.equal(conversationTitle(sessions[1]), "New Chat");
    assert.equal(conversationTitle(sessions[2]), "New Chat");
    assert.deepEqual(
      filterSessions(sessions, label).map((session) => session.threadId),
      ["draft"],
    );
    assert.deepEqual(
      filterSessions(sessions, "New Chat").map((session) => session.threadId),
      ["title", "prompt"],
    );
    assert.equal(JSON.stringify(sessions), original);
  }
  setLanguage("en");
  assert.equal(conversationTitle(sessions[0]), "New Chat");
});
