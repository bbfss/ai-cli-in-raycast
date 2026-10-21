require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Run production composer callbacks with a deterministic React/Raycast host.
function composer(t, onSend = async () => true, options = {}) {
  const slots = [],
    toasts = [];
  let cursor = 0,
    effect,
    cleanup,
    stopped = 0;
  const react = {
    useRef(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = { current: value };
      return slots[id];
    },
    useState(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = value;
      return [
        slots[id],
        (next) => {
          slots[id] = typeof next === "function" ? next(slots[id]) : next;
        },
      ];
    },
    useEffect(fn) {
      cursor++;
      effect = fn;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const Action = Object.assign(() => {}, { CopyToClipboard: "copy" });
  const api = {
    Action,
    ActionPanel: { Submenu: "submenu", Section: "section" },
    Icon: {},
    Toast: { Style: {} },
    showToast: async (toast) => {
      toasts.push(toast);
    },
  };
  const filename = path.resolve(__dirname, "../src/message-composer.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "@raycast/api") return api;
    if (id === "./i18n") return require("../src/i18n.ts");
    throw new Error("Unexpected component dependency: " + id);
  };
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    }).outputText,
    filename,
  );
  const props = {
    draft: "",
    busy: false,
    canSteer: false,
    ready: true,
    ...options,
    onChange: (text) => {
      props.draft = text;
    },
    onSend,
    onStop: () => {
      stopped++;
    },
  };
  function render() {
    cursor = 0;
    return loaded.exports.MessageComposer(props);
  }
  function nodes(node) {
    return !node || typeof node !== "object"
      ? []
      : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  }
  function actions() {
    return nodes(render()).filter((node) => node.type === Action);
  }
  render();
  cleanup = effect();
  t.after(() => cleanup?.());
  return {
    open() {
      render().props.onOpen();
      render().props.onSearchTextChange("");
    },
    type(text) {
      render().props.onSearchTextChange(text);
    },
    send() {
      return actions()[0].props.onAction();
    },
    clear() {
      return actions()
        .find((node) => node.props.title === "Clear Draft")
        .props.onAction();
    },
    stop() {
      return actions()
        .find((node) => node.props.title === "Stop Response")
        .props.onAction();
    },
    title: () => render().props.title,
    primary: () => actions()[0].props.title,
    preview: () =>
      nodes(render()).find((node) => node.type === "section").props.title,
    unmount() {
      cleanup?.();
      cleanup = undefined;
    },
    toasts,
    get draft() {
      return props.draft;
    },
    get stopped() {
      return stopped;
    },
  };
}

test("opening reset preserves an explicitly labeled saved draft including multiline content", async (t) => {
  const raw = "  first\nsecond  ";
  let sent;
  const ui = composer(
    t,
    async (text) => {
      sent = text;
      return true;
    },
    { draft: raw },
  );
  ui.open();
  assert.equal(ui.primary(), "Send Saved Draft");
  await ui.send();
  assert.equal(sent, raw);
});

test("an empty visible query cannot secretly send the recoverable draft", async (t) => {
  const sent = [];
  const ui = composer(t, async (text) => {
    sent.push(text);
    return true;
  });
  ui.open();
  ui.type("recover me");
  ui.type("");
  await ui.send();
  assert.deepEqual(sent, []);
  assert.equal(ui.draft, "recover me");
  assert.equal(
    ui.toasts.at(-1).title,
    "Enter a message in the input field first",
  );
  ui.open();
  assert.equal(ui.primary(), "Send Saved Draft");
  await ui.send();
  assert.deepEqual(sent, ["recover me"]);
});

for (const replacement of ["second message", "first message"])
  test(`late acknowledgement preserves newer ${replacement === "first message" ? "identical" : "different"} input`, async (t) => {
    let accept;
    const sent = [];
    const ui = composer(t, (text) => {
      sent.push(text);
      return sent.length === 1
        ? new Promise((resolve) => {
            accept = resolve;
          })
        : Promise.resolve(true);
    });
    ui.open();
    ui.type("first message");
    const pending = ui.send();
    ui.type("");
    ui.open();
    ui.type(replacement);
    accept(true);
    await pending;
    assert.equal(ui.preview(), "Pending · " + replacement);
    assert.equal(ui.draft, replacement);
    await ui.send();
    assert.deepEqual(sent, ["first message", replacement]);
  });

test("failed submission leaves the visible message available for retry", async (t) => {
  const sent = [];
  const ui = composer(t, async (text) => {
    sent.push(text);
    return false;
  });
  ui.open();
  ui.type("retry me");
  await ui.send();
  assert.equal(ui.preview(), "Pending · retry me");
  assert.equal(ui.draft, "retry me");
  await ui.send();
  assert.deepEqual(sent, ["retry me", "retry me"]);
});

test("duplicate pending submissions call the parent only once", async (t) => {
  let accept,
    count = 0;
  const ui = composer(t, () => {
    count++;
    return new Promise((resolve) => {
      accept = resolve;
    });
  });
  ui.open();
  ui.type("one submission");
  const pending = ui.send();
  await ui.send();
  assert.equal(count, 1);
  accept(true);
  await pending;
});

test("explicit clearing during a pending send cannot be undone by its acknowledgement", async (t) => {
  let accept;
  const ui = composer(
    t,
    () =>
      new Promise((resolve) => {
        accept = resolve;
      }),
  );
  ui.open();
  ui.type("pending");
  const pending = ui.send();
  ui.clear();
  accept(true);
  await pending;
  assert.equal(ui.draft, "");
  assert.equal(ui.preview(), "Type a message, press Enter to send");
  ui.open();
  assert.equal(ui.primary(), "Send Message");
});

test("busy non-steering composer keeps Stop explicit while the primary action waits", async (t) => {
  const ui = composer(t, async () => false, { busy: true, canSteer: false });
  ui.open();
  ui.type("next draft");
  assert.equal(ui.title(), "Write Next Message");
  assert.equal(ui.primary(), "Wait for Response");
  await ui.send();
  assert.equal(ui.stopped, 0);
  assert.equal(ui.draft, "next draft");
  ui.stop();
  assert.equal(ui.stopped, 1);
});

test("a capable busy composer sends additional instructions and exposes Stop separately", async (t) => {
  let sent;
  const ui = composer(
    t,
    async (text) => {
      sent = text;
      return true;
    },
    { busy: true, canSteer: true },
  );
  ui.open();
  ui.type("additional instructions");
  assert.equal(ui.title(), "Add Instructions");
  assert.equal(ui.primary(), "Send Instructions");
  await ui.send();
  assert.equal(sent, "additional instructions");
  assert.equal(ui.stopped, 0);
});

test("unmount suppresses late host input and acknowledgement changes", async (t) => {
  let accept;
  const ui = composer(
    t,
    () =>
      new Promise((resolve) => {
        accept = resolve;
      }),
  );
  ui.open();
  ui.type("pending");
  const pending = ui.send();
  ui.unmount();
  ui.type("stale host input");
  accept(true);
  await pending;
  assert.equal(ui.draft, "pending");
  assert.equal(ui.preview(), "Pending · pending");
});
