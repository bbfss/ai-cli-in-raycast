require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const {
  storageKeys,
  resolveModelPolicy,
} = require("../src/session-storage.ts");

const entry = (model, efforts = [], defaultEffort = "") => ({
  model,
  displayName: model,
  efforts,
  defaultEffort,
});
const fixed = (model = "A", effort = "low") =>
  JSON.stringify({ mode: "fixed", selection: { model, effort } });

function form(
  t,
  {
    raw,
    catalog = [entry("A", ["low", "high"])],
    connectGate = Promise.resolve(),
    readError = "",
    preferences = {},
    onSaved,
  } = {},
) {
  const slots = [],
    clients = [],
    toasts = [],
    writes = [];
  let cursor = 0,
    mountEffect,
    cleanup,
    started = false,
    responder,
    writeGate,
    pops = 0,
    preferencesOpened = 0;
  const keys = storageKeys("codex");
  const stored = new Map([[keys.model, '{"model":"recent","effort":"high"}']]);
  if (raw !== undefined) stored.set(keys.modelPolicy, raw);
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
      mountEffect = fn;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const Action = Object.assign(() => {}, { SubmitForm: "submit" });
  const api = {
    Action,
    ActionPanel: "panel",
    Form: Object.assign(() => {}, {
      Description: "description",
      Dropdown: Object.assign(() => {}, { Item: "option" }),
    }),
    getPreferenceValues: () => ({ ...preferences }),
    useNavigation: () => ({
      pop: () => {
        pops++;
      },
    }),
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    openExtensionPreferences() {
      preferencesOpened++;
    },
    showToast: async (toast) => {
      toasts.push(toast);
    },
    LocalStorage: {
      getItem: async (key) => {
        if (readError) throw new Error(readError);
        return stored.get(key);
      },
      setItem: async (key, value) => {
        if (writeGate) await writeGate;
        stored.set(key, value);
        writes.push([key, value]);
      },
    },
  };
  const filename = path.resolve(__dirname, "../src/model-settings.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "@raycast/api") return api;
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "./provider")
      return {
        providerCapabilities: () => ({ label: "Codex" }),
        createProviderClient: () => {
          const client = {
            checks: 0,
            lists: 0,
            closed: false,
            connect: () => connectGate,
            checkAuthentication: async () => {
              client.checks++;
            },
            listModels: async () => {
              client.lists++;
              return responder ? responder() : catalog;
            },
            close() {
              client.closed = true;
            },
            startTurn() {
              throw new Error("settings must not send inference");
            },
          };
          clients.push(client);
          return client;
        },
      };
    return require(path.resolve(path.dirname(filename), id + ".ts"));
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
  function render() {
    cursor = 0;
    return loaded.exports.ModelSettings({ provider: "codex", onSaved });
  }
  function nodes(node) {
    return !node || typeof node !== "object"
      ? []
      : [
          node,
          ...[node.props?.children, node.props?.actions]
            .flat(Infinity)
            .flatMap(nodes),
        ];
  }
  function field(id) {
    return nodes(render()).find((node) => node.props.id === id)?.props;
  }
  function action(title) {
    return nodes(render()).find(
      (node) => node.type === Action && node.props.title === title,
    )?.props;
  }
  t.after(() => cleanup?.());
  return {
    mount(probe = false) {
      render();
      cleanup = mountEffect();
      if (probe) {
        cleanup();
        cleanup = mountEffect();
      }
      started = true;
    },
    async flush() {
      await new Promise((resolve) => setTimeout(resolve, 15));
      await new Promise(setImmediate);
      render();
    },
    async ready() {
      if (!started) this.mount();
      await this.flush();
    },
    field,
    descriptions: () =>
      nodes(render())
        .filter((node) => node.type === "description")
        .map((node) => node.props),
    choose(id, value) {
      field(id).onChange(value);
    },
    submit: () =>
      nodes(render())
        .find((node) => node.type === "submit")
        .props.onSubmit(),
    refresh: () => action("Refresh Model List").onAction(),
    retry: () => action("Retry").onAction(),
    changeStrategy: () => action("Change Default Strategy").onAction(),
    strategy: () =>
      nodes(render()).find(
        (node) =>
          node.type === "description" &&
          node.props.title === "Default Strategy",
      )?.props.text,
    setNativeStrategy(mode) {
      preferences = { ...preferences, codexModelStrategy: mode };
      cleanup?.();
      render();
      cleanup = mountEffect();
    },
    setCatalog(next) {
      catalog = next;
      responder = undefined;
    },
    failCatalog() {
      responder = async () => {
        throw new Error("catalog failed");
      };
    },
    deferCatalog() {
      let resolve, reject;
      const gate = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      responder = () => gate;
      return {
        resolve(next) {
          catalog = next;
          responder = undefined;
          resolve(next);
        },
        reject() {
          reject(new Error("catalog failed"));
        },
      };
    },
    blockWrite() {
      let release;
      writeGate = new Promise((resolve) => {
        release = resolve;
      });
      return () => {
        writeGate = undefined;
        release();
      };
    },
    clearReadError() {
      readError = "";
    },
    unmount() {
      cleanup?.();
      cleanup = undefined;
    },
    clients,
    toasts,
    writes,
    stored,
    keys,
    get pops() {
      return pops;
    },
    get preferencesOpened() {
      return preferencesOpened;
    },
  };
}

test("opening checks the real catalog once through the development mount probe, with no inference", async (t) => {
  const ui = form(t, { raw: fixed() });
  ui.mount(true);
  await ui.flush();
  assert.equal(ui.clients.length, 1);
  assert.equal(ui.clients[0].checks, 1);
  assert.equal(ui.clients[0].lists, 1);
  assert.equal(ui.clients[0].closed, true);
  assert.equal(ui.field("mode"), undefined);
  assert.equal(ui.strategy(), "Fixed Model and Effort");
  assert.equal(ui.field("model").value, "A");
  assert.equal(ui.field("effort").value, "low");
  assert.deepEqual(ui.writes, []);
});

test("fixed mode requires an explicit valid pair and refreshes again before saving only its independent policy", async (t) => {
  const ui = form(t, { preferences: { codexModelStrategy: "fixed" } });
  await ui.ready();
  await ui.submit();
  assert.deepEqual(ui.writes, []);
  ui.choose("model", "A");
  await ui.submit();
  assert.deepEqual(ui.writes, []);
  ui.choose("effort", "low");
  await ui.submit();
  assert.equal(ui.clients.length, 2);
  assert.deepEqual(JSON.parse(ui.stored.get(ui.keys.modelPolicy)), {
    mode: "fixed",
    selection: { model: "A", effort: "low" },
  });
  assert.equal(
    ui.stored.get(ui.keys.model),
    '{"model":"recent","effort":"high"}',
  );
  assert.equal(ui.pops, 1);
});

test("nonadjustable models have no invented effort options and save an empty effort", async (t) => {
  const ui = form(t, { raw: fixed("A", "obsolete"), catalog: [entry("A")] });
  await ui.ready();
  assert.equal(ui.field("effort"), undefined);
  assert.ok(
    ui
      .descriptions()
      .some((description) => description.text === "Not adjustable"),
  );
  await ui.submit();
  assert.deepEqual(JSON.parse(ui.stored.get(ui.keys.modelPolicy)), {
    mode: "fixed",
    selection: { model: "A", effort: "" },
  });
});

test("fixed mode cannot save while a refresh is pending or after a failed refresh", async (t) => {
  const ui = form(t, { raw: fixed() });
  await ui.ready();
  const gate = ui.deferCatalog();
  const refreshing = ui.refresh();
  await ui.flush();
  assert.equal(ui.field("model").value, "");
  await ui.submit();
  assert.deepEqual(ui.writes, []);
  gate.reject();
  await refreshing;
  await ui.submit();
  assert.deepEqual(ui.writes, []);
  ui.setCatalog([entry("A", ["low"])]);
  await ui.refresh();
  await ui.submit();
  assert.equal(ui.writes.length, 1);
});

test("saving validates a fresh catalog and rejects a model or effort removed since opening", async (t) => {
  for (const replacement of [[entry("B", ["low"])], [entry("A", ["high"])]]) {
    const ui = form(t, { raw: fixed() });
    await ui.ready();
    ui.setCatalog(replacement);
    await ui.submit();
    assert.deepEqual(ui.writes, []);
    assert.equal(ui.pops, 0);
    assert.equal(
      ui.toasts.at(-1).title,
      "The fixed default is no longer available. Choose a model and effort level again.",
    );
  }
});

test("native last strategy does not depend on the catalog or erase a broken stored policy", async (t) => {
  const raw = '{"mode":"fixed",';
  const ui = form(t, { raw, preferences: { codexModelStrategy: "last" } });
  ui.failCatalog();
  await ui.ready();
  assert.equal(ui.strategy(), "Use Last Selection");
  assert.equal(ui.field("mode"), undefined);
  await ui.submit();
  assert.deepEqual(ui.writes, []);
  assert.equal(ui.stored.get(ui.keys.modelPolicy), raw);
  assert.equal(
    resolveModelPolicy(raw, "codex", { codexModelStrategy: "last" }).mode,
    "last",
  );
  assert.equal(ui.clients.length, 1);
  assert.equal(ui.pops, 1);
});

test("leaving while connecting or validating prevents later checks, persistence and navigation", async (t) => {
  let release;
  const connecting = form(t, {
    raw: fixed(),
    connectGate: new Promise((resolve) => {
      release = resolve;
    }),
  });
  connecting.mount();
  await connecting.flush();
  connecting.unmount();
  release();
  await connecting.flush();
  assert.equal(connecting.clients[0].checks, 0);
  assert.equal(connecting.clients[0].closed, true);
  assert.deepEqual(connecting.writes, []);
  const ui = form(t, { raw: fixed() });
  await ui.ready();
  const gate = ui.deferCatalog();
  const saving = ui.submit();
  await ui.flush();
  ui.unmount();
  gate.resolve([entry("A", ["low"])]);
  await saving;
  assert.deepEqual(ui.writes, []);
  assert.equal(ui.pops, 0);
});

test("save locks edited fields and a storage completion after leaving cannot pop another page", async (t) => {
  const ui = form(t, { raw: fixed() });
  await ui.ready();
  const release = ui.blockWrite();
  const saving = ui.submit();
  await ui.flush();
  ui.choose("effort", "high");
  assert.equal(ui.field("effort").value, "low");
  ui.unmount();
  release();
  await saving;
  assert.equal(ui.pops, 0);
  assert.equal(ui.toasts.length, 0);
});

test("failed policy reads cannot overwrite unknown defaults and can be retried", async (t) => {
  const ui = form(t, { raw: fixed(), readError: "storage failed" });
  await ui.ready();
  await ui.submit();
  assert.deepEqual(ui.writes, []);
  ui.clearReadError();
  await ui.retry();
  assert.equal(ui.strategy(), "Fixed Model and Effort");
  await ui.submit();
  assert.equal(ui.writes.length, 1);
});

test("native preferences are the sole strategy control and switching back to fixed restores its saved pair", async (t) => {
  const raw = fixed("A", "high");
  const ui = form(t, { raw, preferences: { codexModelStrategy: "last" } });
  await ui.ready();
  assert.equal(ui.field("mode"), undefined);
  assert.equal(ui.field("model"), undefined);
  ui.changeStrategy();
  assert.equal(ui.preferencesOpened, 1);
  await ui.submit();
  assert.deepEqual(ui.writes, []);
  assert.equal(ui.stored.get(ui.keys.modelPolicy), raw);
  ui.setNativeStrategy("fixed");
  await ui.flush();
  assert.equal(ui.strategy(), "Fixed Model and Effort");
  assert.equal(ui.field("model").value, "A");
  assert.equal(ui.field("effort").value, "high");
});

test("a fixed strategy change during fresh validation prevents the old save from completing", async (t) => {
  const raw = fixed();
  const ui = form(t, { raw, preferences: { codexModelStrategy: "fixed" } });
  await ui.ready();
  const gate = ui.deferCatalog();
  const saving = ui.submit();
  await ui.flush();
  ui.setNativeStrategy("last");
  gate.resolve([entry("A", ["low"])]);
  await saving;
  await ui.flush();
  assert.deepEqual(ui.writes, []);
  assert.equal(ui.stored.get(ui.keys.modelPolicy), raw);
  assert.equal(ui.pops, 0);
});

test("successful inline repair invokes onSaved instead of popping another view", async (t) => {
  let completed = 0;
  const ui = form(t, {
    raw: fixed(),
    preferences: { codexModelStrategy: "fixed" },
    onSaved: () => {
      completed++;
    },
  });
  await ui.ready();
  await ui.submit();
  assert.equal(completed, 1);
  assert.equal(ui.pops, 0);
  assert.equal(ui.writes.length, 1);
});

test("each CLI settings row opens its own defaults first and retains preferences, path copy and detection", async (t) => {
  const { PROVIDERS } = require("../src/session-storage.ts");
  const definitions = PROVIDERS.map((entry) => ({
    id: entry.id,
    label: entry.title,
    preference: entry.id,
  }));
  const slots = [];
  let cursor = 0,
    mountEffect;
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
      mountEffect = fn;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const Action = Object.assign(() => {}, {
    Push: "push",
    CopyToClipboard: "copy",
  });
  const Metadata = Object.assign(() => {}, {
    Label: "label",
    Separator: "separator",
  });
  const api = {
    Action,
    ActionPanel: "panel",
    List: Object.assign(() => {}, {
      Section: "section",
      Item: Object.assign(() => {}, {
        Detail: Object.assign(() => {}, { Metadata }),
      }),
    }),
    getPreferenceValues: () => ({}),
    Color: {},
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    showToast: async () => {},
    openExtensionPreferences() {},
  };
  const filename = path.resolve(__dirname, "../src/cli-settings.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "@raycast/api") return api;
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "./i18n") return require("../src/i18n.ts");
    if (id === "./model-settings") return { ModelSettings: "defaults" };
    if (id === "./cli-detection")
      return {
        CLI_DEFINITIONS: definitions,
        CliDetectionController: class {
          async scan(_preferences, emit) {
            for (const entry of definitions)
              emit({
                provider: entry.id,
                status: "found",
                source: "manual",
                path: `/installed/${entry.id}`,
                configuredPath: `/installed/${entry.id}`,
                checkedAt: 1,
              });
          }
          cancel() {}
        },
      };
    throw new Error("Unexpected dependency: " + id);
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
  const render = () => {
    cursor = 0;
    return loaded.exports.default();
  };
  const nodes = (node) =>
    !node || typeof node !== "object"
      ? []
      : [
          node,
          ...[node.props?.children, node.props?.actions]
            .flat(Infinity)
            .flatMap(nodes),
        ];
  render();
  const cleanup = mountEffect();
  t.after(cleanup);
  await new Promise(setImmediate);
  const rows = nodes(render()).filter(
    (node) => node.type === api.List.Item && node.props.id !== "preferences",
  );
  assert.equal(rows.length, 6);
  for (const row of rows) {
    const actions = nodes(row.props.actions).filter((node) =>
      [Action, "push", "copy"].includes(node.type),
    );
    assert.equal(actions[0].type, "push");
    assert.equal(actions[0].props.target.type, "defaults");
    assert.equal(actions[0].props.target.props.provider, row.props.id);
    assert.ok(
      actions.some(
        (node) => node.props.title === "Language and CLI Preferences",
      ),
    );
    assert.ok(actions.some((node) => node.props.title === "Copy CLI Path"));
    assert.ok(actions.some((node) => node.props.title === "Detect CLIs Again"));
  }
});
