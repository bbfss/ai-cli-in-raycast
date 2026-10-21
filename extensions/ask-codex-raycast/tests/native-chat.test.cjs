require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { storageKeys } = require("../src/session-storage.ts");

// Exercise the production chat callbacks; only the Raycast host and transport
// are replaced. Deferred writes reproduce the provider-switch race.
function chat(t, provider = "antigravity", initialDraft = "") {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const cleanups = new Map();
  const react = {
    useRef(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: value };
      return slots[i];
    },
    useState(value) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = typeof value === "function" ? value() : value;
      return [
        slots[i],
        (next) => {
          slots[i] = typeof next === "function" ? next(slots[i]) : next;
        },
      ];
    },
    useMemo(fn) {
      cursor++;
      return fn();
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, n) => v !== slots[i][n])) {
        slots[i] = deps;
        effects.push(() => {
          cleanups.get(i)?.();
          cleanups.set(i, fn());
        });
      }
    },
  };
  const keys = storageKeys(provider);
  const saved = new Map([
    [keys.model, JSON.stringify({ model: "test-model", effort: "" })],
  ]);
  if (initialDraft)
    saved.set(
      keys.library,
      JSON.stringify({
        version: 2,
        activeId: "test-thread",
        sessions: [
          {
            threadId: "test-thread",
            messages: [],
            draft: initialDraft,
            updatedAt: 1,
          },
        ],
      }),
    );
  let writeGate;
  let switched = 0;
  let started = 0;
  let interrupted = 0;
  let event;
  let writeFailure;
  let sendGate;
  let disposed = false;
  const keyedWriteGates = new Map();
  const launches = [];
  const toasts = [];
  const timeline = [];
  const prompts = [],
    instructions = [];
  const client = {
    currentThreadId: "test-thread",
    currentTurnId: null,
    threadSnapshot: {},
    currentModelSelection: { model: "test-model", effort: "" },
    connect: async () => {},
    startThread: async () => "test-thread",
    resumeThread: async () => "test-thread",
    close() {},
    listModels: async () => [
      { model: "test-model", efforts: [], defaultEffort: "" },
    ],
    async startTurn(prompt) {
      if (sendGate) await sendGate;
      started++;
      prompts.push(prompt);
      this.currentTurnId = "turn";
      event({
        method: "turn/started",
        params: { threadId: this.currentThreadId, turn: { id: "turn" } },
      });
    },
    async steer(prompt) {
      instructions.push(prompt);
    },
    async interrupt() {
      interrupted++;
      this.currentTurnId = null;
      event({
        method: "turn/completed",
        params: {
          threadId: this.currentThreadId,
          turn: { id: "turn", status: "interrupted" },
        },
      });
    },
  };
  const jsx = (type, props) => ({ type, props });
  const Action = Object.assign(() => {}, {
    OpenInBrowser: "browser",
    CopyToClipboard: "copy",
  });
  const api = {
    Action,
    ActionPanel: Object.assign(() => {}, { Section: "section" }),
    Detail: "detail",
    List: Object.assign(() => {}, {
      Item: Object.assign(() => {}, { Detail: "item-detail" }),
    }),
    environment: { assetsPath: "/assets" },
    getPreferenceValues: () => ({}),
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    showToast: async (toast) => {
      toasts.push(toast);
    },
    LaunchType: { UserInitiated: "user" },
    launchCommand: async (options) => {
      launches.push(options);
      timeline.push("launch");
    },
    LocalStorage: {
      getItem: async (key) => saved.get(key),
      setItem: async (key, value) => {
        if (writeGate) await writeGate;
        if (keyedWriteGates.has(key)) await keyedWriteGates.get(key);
        if (writeFailure === key) throw new Error("storage refused");
        saved.set(key, value);
        timeline.push(key);
      },
    },
  };
  const filename = path.resolve(__dirname, "../src/index.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "@raycast/api") return api;
    if (id === "./provider")
      return {
        createProviderClient: (_, options) => {
          event = options.onEvent;
          return client;
        },
        providerCapabilities: (p) => ({
          label: p === "codex" ? "Codex" : "Antigravity",
          supportsSteering: p === "codex",
          supportsEffort: p === "codex",
        }),
      };
    if (id === "./provider-menu") return { ProviderMenu: "providers" };
    if (id === "./model-menu")
      return { ModelMenu: "models", EffortMenu: "efforts" };
    if (id === "./setup") return { SetupWizard: "setup" };
    if (id === "./history") return { useSessionHistory: () => ({}) };
    if (id === "./chat-text")
      return {
        conversationMarkdown: (_, __, status, error) => status + " " + error,
      };
    return require(path.resolve(path.dirname(filename), id + ".ts"));
  };
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  loaded._compile(source + "\nexports.NativeChat = NativeChat;", filename);
  const props = {
    provider,
    arguments: {},
    onProviderChange: async () => {
      switched++;
    },
    onConfigure() {},
    onPromptConsumed() {},
  };
  function render() {
    cursor = 0;
    const tree = loaded.exports.NativeChat(props);
    const pending = effects;
    effects = [];
    pending.forEach((fn) => fn());
    return tree;
  }
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    return [
      node,
      ...[node.props?.children, node.props?.actions, node.props?.detail]
        .flat(Infinity)
        .flatMap(nodes),
    ];
  }
  function find(type) {
    return nodes(render()).find((node) => node.type === type).props;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const cleanup of cleanups.values()) cleanup?.();
  }
  t.after(dispose);
  return {
    async ready() {
      render();
      for (let n = 0; n < 5; n++) {
        await new Promise(setImmediate);
        render();
      }
      assert.equal(find(api.List).isLoading, false);
    },
    input: () => find(api.List),
    send: (text) => {
      if (text !== undefined && text !== find(api.List).searchText)
        find(api.List).onSearchTextChange(text);
      return nodes(render())
        .find((node) => node.type === Action)
        .props.onAction();
    },
    clear: () =>
      nodes(render())
        .find(
          (node) => node.type === Action && node.props.title === "Clear Draft",
        )
        .props.onAction(),
    primary: () => nodes(render()).find((node) => node.type === Action).props,
    row: () => find(api.List.Item),
    providers: () => find("providers"),
    models: () => find("models"),
    markdown: () => find("item-detail").markdown,
    stop: () =>
      nodes(render())
        .find(
          (node) =>
            node.type === Action && node.props.title === "Stop Response",
        )
        .props.onAction(),
    settings: () =>
      nodes(render())
        .find(
          (node) => node.type === Action && node.props.title === "CLI Settings",
        )
        .props.onAction(),
    blockWrites() {
      let release;
      writeGate = new Promise((resolve) => {
        release = resolve;
      });
      return () => {
        release();
        writeGate = null;
      };
    },
    blockWrite(kind) {
      const key = keys[kind];
      let release;
      keyedWriteGates.set(
        key,
        new Promise((resolve) => {
          release = resolve;
        }),
      );
      return () => {
        release();
        keyedWriteGates.delete(key);
      };
    },
    failWrites(kind) {
      writeFailure = kind ? keys[kind] : undefined;
    },
    blockSend() {
      let resolve, reject;
      sendGate = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      return {
        accept: () => resolve(),
        reject: () => reject(new Error("send refused")),
      };
    },
    saved,
    keys,
    launches,
    toasts,
    timeline,
    prompts,
    instructions,
    complete() {
      client.currentTurnId = null;
      event({
        method: "turn/completed",
        params: {
          threadId: client.currentThreadId,
          turn: { id: "turn", status: "completed" },
        },
      });
    },
    dispose,
    get switched() {
      return switched;
    },
    get started() {
      return started;
    },
    get interrupted() {
      return interrupted;
    },
  };
}

test("native conversation keeps the input and one detail row on the same page", async (t) => {
  const ui = chat(t);
  await ui.ready();
  assert.equal(ui.input().filtering, false);
  assert.equal(ui.input().throttle, false);
  assert.equal(ui.input().isShowingDetail, true);
  assert.equal(ui.input().selectedItemId, "conversation");
  assert.equal(ui.row().id, "conversation");
  assert.equal(ui.primary().title, "Send Message");
  ui.input().onSearchTextChange("literal $HOME `text`");
  await ui.send();
  assert.deepEqual(ui.prompts, ["literal $HOME `text`"]);
  assert.equal(ui.input().searchText, "");
});

test("non-steering reply permits drafting but neither auto-sends nor makes Stop the Enter action", async (t) => {
  const ui = chat(t);
  await ui.ready();
  await ui.send("first");
  ui.input().onSearchTextChange("next draft");
  assert.equal(ui.primary().title, "Wait for Response");
  assert.match(ui.row().subtitle, /Keep drafting/);
  await ui.send();
  assert.equal(ui.interrupted, 0);
  assert.equal(ui.started, 1);
  assert.equal(ui.input().searchText, "next draft");
  ui.complete();
  await new Promise(setImmediate);
  assert.equal(ui.started, 1);
  assert.equal(ui.primary().title, "Send Message");
  await ui.send();
  assert.deepEqual(ui.prompts, ["first", "next draft"]);
});

test("steering is available only for a capable active provider", async (t) => {
  const ui = chat(t, "codex");
  await ui.ready();
  await ui.send("first");
  ui.input().onSearchTextChange("additional instructions");
  assert.equal(ui.primary().title, "Send Instructions");
  await ui.send();
  assert.deepEqual(ui.instructions, ["additional instructions"]);
  assert.deepEqual(ui.prompts, ["first"]);
});

test("an existing multiline draft is visible, resists search normalization, and sends its original text", async (t) => {
  const raw = "  first\r\n```raw\n**still visible**\n```\nlast  ";
  const ui = chat(t, "antigravity", raw);
  await ui.ready();
  assert.equal(ui.primary().title, "Send Saved Multiline Draft");
  assert.ok(ui.markdown().includes(raw));
  ui.input().onSearchTextChange(raw.replace(/[\r\n]+/g, " "));
  assert.equal(ui.input().searchText, raw);
  assert.equal(ui.toasts.at(-1).title, "Multiline draft preserved");
  await ui.send();
  assert.deepEqual(ui.prompts, [raw]);
});

test("multiline drafts require an explicit Clear Draft before replacement", async (t) => {
  const ui = chat(t, "antigravity", "first\nsecond");
  await ui.ready();
  ui.input().onSearchTextChange("");
  assert.equal(ui.input().searchText, "first\nsecond");
  ui.clear();
  assert.equal(ui.input().searchText, "");
  ui.input().onSearchTextChange("replacement");
  await ui.send();
  assert.deepEqual(ui.prompts, ["replacement"]);
});

for (const next of ["new draft", "pending message", ""])
  test(`send acknowledgement preserves newer draft edits: ${next || "explicit clear"}`, async (t) => {
    const ui = chat(t);
    await ui.ready();
    ui.input().onSearchTextChange("pending message");
    const gate = ui.blockSend();
    const sending = ui.send("pending message");
    await new Promise(setImmediate);
    assert.equal(ui.input().searchText, "pending message");
    ui.input().onSearchTextChange(next);
    gate.accept();
    await sending;
    assert.equal(ui.input().searchText, next);
  });

test("failed send cannot restore input deliberately cleared while waiting", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onSearchTextChange("pending message");
  const gate = ui.blockSend();
  const sending = ui.send("pending message");
  await new Promise(setImmediate);
  ui.input().onSearchTextChange("");
  gate.reject();
  await sending;
  assert.equal(ui.input().searchText, "");
});

test("unacknowledged input is persisted when the command closes", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onSearchTextChange("keep until accepted");
  const gate = ui.blockSend();
  const sending = ui.send("keep until accepted");
  await new Promise(setImmediate);
  ui.input();
  ui.dispose();
  gate.accept();
  await sending;
  await new Promise(setImmediate);
  assert.equal(
    JSON.parse(ui.saved.get(ui.keys.library)).sessions[0].draft,
    "keep until accepted",
  );
});

test("provider switch blocks sending and another switch until old storage is durable", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onSearchTextChange("unsent draft");
  const release = ui.blockWrites();
  const switching = ui.providers().onSelect("codex");
  await ui.send();
  await ui.providers().onSelect("codex");
  assert.equal(ui.started, 0);
  assert.equal(ui.switched, 0);
  release();
  await switching;
  assert.equal(ui.switched, 1);
});

test("selecting the current provider is a no-op and an active reply blocks switching", async (t) => {
  const ui = chat(t);
  await ui.ready();
  await ui.providers().onSelect("antigravity");
  assert.equal(ui.switched, 0);
  await ui.send("hello");
  assert.equal(ui.started, 1);
  await ui.providers().onSelect("codex");
  assert.equal(ui.switched, 0);
});

for (const provider of ["codex", "antigravity"])
  test(`${provider} stop completion cannot be overwritten by a late stopping label`, async (t) => {
    const ui = chat(t, provider);
    await ui.ready();
    await ui.send("hello");
    if (provider === "antigravity") assert.doesNotMatch(ui.markdown(), /steer/);
    await ui.stop();
    assert.match(ui.markdown(), /Stopped/);
    assert.doesNotMatch(ui.markdown(), /Stopping/);
  });

test("opening CLI Settings during a reply neither launches another command nor interrupts the reply", async (t) => {
  const ui = chat(t);
  await ui.ready();
  await ui.send("continue this reply");
  await ui.settings();
  assert.deepEqual(ui.launches, []);
  assert.equal(ui.interrupted, 0);
  assert.match(ui.toasts.at(-1).title, /Stop the Current Reply First/);
});

test("CLI Settings waits for the latest draft and model to be saved and locks competing actions", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const releaseLibrary = ui.blockWrite("library");
  const releaseModel = ui.blockWrite("model");
  ui.input().onSearchTextChange("draft kept before settings");
  ui.models().onSelect({ model: "new-model", effort: "" });
  const pending = ui.settings();
  await new Promise(setImmediate);
  await ui.send();
  await ui.providers().onSelect("codex");
  await ui.settings();
  assert.equal(ui.switched, 0);
  assert.equal(ui.started, 0);
  assert.deepEqual(ui.launches, []);
  releaseLibrary();
  await new Promise(setImmediate);
  assert.deepEqual(ui.launches, []);
  releaseModel();
  await pending;
  assert.equal(
    JSON.parse(ui.saved.get(ui.keys.library)).sessions[0].draft,
    "draft kept before settings",
  );
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), {
    model: "new-model",
    effort: "",
  });
  assert.deepEqual(ui.launches, [{ name: "cli-settings", type: "user" }]);
  const launchIndex = ui.timeline.indexOf("launch");
  assert.ok(ui.timeline.lastIndexOf(ui.keys.library) < launchIndex);
  assert.ok(ui.timeline.lastIndexOf(ui.keys.model) < launchIndex);
});

for (const kind of ["library", "model"])
  test(`CLI Settings does not launch when ${kind} persistence fails and permits a successful retry`, async (t) => {
    const ui = chat(t);
    await ui.ready();
    ui.input().onSearchTextChange("preserve after failed save");
    ui.failWrites(kind);
    if (kind === "model")
      ui.models().onSelect({ model: "new-model", effort: "" });
    await ui.settings();
    assert.deepEqual(ui.launches, []);
    assert.equal(ui.input().searchText, "preserve after failed save");
    assert.equal(ui.toasts.at(-1).title, "Could Not Open CLI Settings");
    assert.equal(ui.toasts.at(-1).message, "storage refused");
    ui.failWrites();
    if (kind === "model")
      ui.models().onSelect({ model: "new-model", effort: "" });
    await ui.settings();
    assert.equal(ui.launches.length, 1);
  });

test("CLI Settings does not launch after the conversation closes during a pending save", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onSearchTextChange("saved on close");
  const release = ui.blockWrites();
  const pending = ui.settings();
  ui.dispose();
  release();
  await pending;
  assert.deepEqual(ui.launches, []);
});
