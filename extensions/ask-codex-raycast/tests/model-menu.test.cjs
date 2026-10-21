require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const model = (name, efforts, defaultEffort = "") => ({
  model: name,
  displayName: name,
  efforts,
  defaultEffort,
});

// Execute production menus and callbacks, replacing only the native host.
function menus(overrides = {}) {
  const references = { ModelMenu: [], EffortMenu: [] };
  let active,
    cursor = 0,
    refreshes = 0;
  const selected = [];
  const react = {
    useRef(value) {
      const slot = cursor++;
      if (!(slot in active)) active[slot] = { current: value };
      return active[slot];
    },
  };
  const jsx = (type, props) => ({ type, props });
  const Action = () => {};
  const api = {
    Action,
    ActionPanel: { Submenu: "submenu", Section: "section" },
    Icon: {},
  };
  const filename = path.resolve(__dirname, "../src/model-menu.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "@raycast/api") return api;
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
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
  let props = {
    models: [
      model("A", ["low", "high"], "low"),
      model("B", ["minimal", "medium"], "medium"),
    ],
    selection: { model: "A", effort: "high" },
    current: { model: "A", effort: "low" },
    loading: false,
    ready: true,
    error: "",
    onRefresh: () => {
      refreshes++;
    },
    onSelect: (value) => selected.push(value),
    ...overrides,
  };
  function expand(node) {
    if (!node || typeof node !== "object") return [];
    if (typeof node.type === "function" && node.type !== Action)
      return expand(node.type(node.props));
    return [node, ...[node.props?.children].flat(Infinity).flatMap(expand)];
  }
  function render(kind) {
    active = references[kind];
    cursor = 0;
    return loaded.exports[kind](props);
  }
  return {
    render,
    actions: (kind) =>
      expand(render(kind))
        .filter((node) => node.type === Action)
        .map((node) => node.props),
    sections: (kind) =>
      expand(render(kind))
        .filter((node) => node.type === "section")
        .map((node) => node.props),
    update(change) {
      props = { ...props, ...change };
    },
    selected,
    get refreshes() {
      return refreshes;
    },
  };
}

test("model and effort are independent menus and every open refreshes even a populated catalog", () => {
  const ui = menus();
  assert.equal(ui.render("ModelMenu").props.title, "Model: A");
  assert.equal(ui.render("EffortMenu").props.title, "Effort Level: high");
  assert.equal(ui.render("ModelMenu").props.shortcut.key, "m");
  assert.equal(ui.render("EffortMenu").props.shortcut.key, "e");
  for (const kind of ["ModelMenu", "EffortMenu"]) {
    ui.render(kind).props.onOpen();
    ui.render(kind).props.onOpen();
  }
  assert.equal(ui.refreshes, 4);
  ui.update({ loading: true });
  for (const kind of ["ModelMenu", "EffortMenu"])
    ui.render(kind).props.onOpen();
  assert.equal(ui.refreshes, 4);
  ui.update({ loading: false, ready: false });
  ui.render("ModelMenu").props.onOpen();
  assert.equal(ui.refreshes, 4);
  ui.update({ shortcuts: false });
  assert.equal(ui.render("EffortMenu").props.shortcut, undefined);
});

test("loading, failed and disconnected catalogs hide cached choices including current-model selection", () => {
  for (const [state, caption] of [
    [{ loading: true }, "Loading Models…"],
    [{ error: "CLI catalog failed" }, "Model List Unavailable"],
    [{ ready: false }, "Waiting for Connection"],
  ]) {
    const ui = menus(state);
    for (const kind of ["ModelMenu", "EffortMenu"]) {
      assert.ok(ui.render(kind).props.title.includes(caption));
      const choices = ui.actions(kind);
      assert.ok(
        choices.every((action) =>
          [
            "Loading Models…",
            "Reload Model List",
            "Waiting for Connection",
          ].includes(action.title),
        ),
      );
      assert.equal(
        choices.some(
          (action) => action.title === "Use Current Conversation Model",
        ),
        false,
      );
    }
    assert.deepEqual(ui.selected, []);
  }
});

test("an empty catalog gives an explicit status without invented model or effort options", () => {
  const ui = menus({ models: [] });
  for (const kind of ["ModelMenu", "EffortMenu"]) {
    assert.ok(ui.render(kind).props.title.includes("No Models Available"));
    assert.deepEqual(
      ui.actions(kind).map((action) => action.title),
      ["Refresh Model List"],
    );
    ui.render(kind).props.onOpen();
  }
  assert.equal(ui.refreshes, 2);
});

test("model changes derive effort only from the selected model's current real options", () => {
  for (const [entry, expected] of [
    [model("B", ["minimal", "medium"], "medium"), "medium"],
    [model("B", ["minimal", "medium"], "invalid"), "minimal"],
    [model("B", ["high", "medium"], "medium"), "high"],
    [model("B", [], "high"), ""],
  ]) {
    const ui = menus({ models: [entry] });
    ui.actions("ModelMenu")
      .find((action) => action.title === "B")
      .onAction();
    assert.deepEqual(ui.selected, [{ model: "B", effort: expected }]);
  }
});

test("nonadjustable models keep the independent effort menu and explain the limitation", () => {
  const ui = menus({ models: [model("A", [])] });
  assert.equal(
    ui.render("EffortMenu").props.title,
    "Effort Level: Not adjustable",
  );
  assert.ok(
    ui
      .sections("EffortMenu")
      .some(
        (section) =>
          section.title ===
          "This model does not expose an adjustable effort level.",
      ),
  );
  assert.deepEqual(
    ui.actions("EffortMenu").map((action) => action.title),
    ["Refresh Model List"],
  );
});

test("effort options come only from the current model and unknown future values retain their order", () => {
  const efforts = ["future-b", "high", "future-a", "low", "ultra"];
  const ui = menus({
    models: [model("A", efforts), model("B", ["unrelated"])],
    allowCurrent: false,
  });
  assert.deepEqual(
    ui.actions("EffortMenu").map((action) => action.title),
    ["low", "high", "ultra", "future-b", "future-a", "Refresh Model List"],
  );
  assert.deepEqual(efforts, ["future-b", "high", "future-a", "low", "ultra"]);
  ui.actions("EffortMenu")
    .find((action) => action.title === "future-a")
    .onAction();
  assert.deepEqual(ui.selected, [{ model: "A", effort: "future-a" }]);
  assert.equal(
    ui
      .actions("ModelMenu")
      .some((action) => action.title === "Use Current Conversation Model"),
    false,
  );
});

test("callbacks from an older menu cannot select during refresh failure or use removed catalog entries", () => {
  const ui = menus();
  const oldModel = ui
    .actions("ModelMenu")
    .find((action) => action.title === "B");
  const oldCurrent = ui
    .actions("ModelMenu")
    .find((action) => action.title === "Use Current Conversation Model");
  const oldEffort = ui
    .actions("EffortMenu")
    .find((action) => action.title === "high");
  ui.update({ loading: true });
  ui.render("ModelMenu");
  ui.render("EffortMenu");
  oldModel.onAction();
  oldCurrent.onAction();
  oldEffort.onAction();
  ui.update({ loading: false, error: "failed" });
  ui.render("ModelMenu");
  ui.render("EffortMenu");
  oldModel.onAction();
  oldCurrent.onAction();
  oldEffort.onAction();
  ui.update({ error: "", models: [model("A", ["low"])] });
  ui.render("ModelMenu");
  ui.render("EffortMenu");
  oldModel.onAction();
  oldEffort.onAction();
  assert.deepEqual(ui.selected, []);
});

test("refreshed models and changed current model rerender real choices and invalidate old effort callbacks", () => {
  const ui = menus();
  const oldEffort = ui
    .actions("EffortMenu")
    .find((action) => action.title === "high");
  ui.update({
    models: [model("C", ["medium"])],
    selection: { model: "C", effort: "medium" },
  });
  const modelChoices = ui.actions("ModelMenu").map((action) => action.title);
  assert.ok(modelChoices.includes("C"));
  assert.ok(!modelChoices.includes("A"));
  assert.deepEqual(
    ui.actions("EffortMenu").map((action) => action.title),
    ["medium", "Refresh Model List"],
  );
  oldEffort.onAction();
  assert.deepEqual(ui.selected, []);
  ui.actions("EffortMenu")
    .find((action) => action.title === "medium")
    .onAction();
  assert.deepEqual(ui.selected, [{ model: "C", effort: "medium" }]);
});
