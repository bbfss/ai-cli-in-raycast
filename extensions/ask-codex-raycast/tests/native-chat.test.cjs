require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { storageKeys } = require('../src/session-storage.ts');

// Exercise the production chat callbacks; only the Raycast host and transport
// are replaced. Deferred writes reproduce the provider-switch race.
function chat(t, provider = 'antigravity') {
  const slots = []; let cursor = 0; let effects = []; const cleanups = new Map();
  const react = {
    useRef(value) { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useMemo(fn) { cursor++; return fn(); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, n) => v !== slots[i][n])) { slots[i] = deps; effects.push(() => { cleanups.get(i)?.(); cleanups.set(i, fn()); }); } },
  };
  const keys = storageKeys(provider);
  const saved = new Map([[keys.model, JSON.stringify({ model: 'test-model', effort: '' })]]);
  let writeGate; let switched = 0; let started = 0; let event;
  const client = {
    currentThreadId: 'test-thread', currentTurnId: null, threadSnapshot: {}, currentModelSelection: { model: 'test-model', effort: '' },
    connect: async () => {}, startThread: async () => 'test-thread', close() {},
    listModels: async () => [{ model: 'test-model', efforts: [], defaultEffort: '' }],
    async startTurn() { started++; this.currentTurnId = 'turn'; event({ method: 'turn/started', params: { threadId: this.currentThreadId, turn: { id: 'turn' } } }); },
    async interrupt() { this.currentTurnId = null; event({ method: 'turn/completed', params: { threadId: this.currentThreadId, turn: { id: 'turn', status: 'interrupted' } } }); },
  };
  const jsx = (type, props) => ({ type, props });
  const Action = Object.assign(() => {}, { OpenInBrowser: 'browser', CopyToClipboard: 'copy' });
  const api = {
    Action, ActionPanel: Object.assign(() => {}, { Section: 'section' }), Detail: 'detail', List: 'list',
    environment: { assetsPath: '/assets' }, getPreferenceValues: () => ({}), Icon: {},
    Keyboard: { Shortcut: { Common: {} } }, Toast: { Style: {} }, showToast: async () => {},
    LocalStorage: { getItem: async key => saved.get(key), setItem: async (key, value) => { if (writeGate) await writeGate; saved.set(key, value); } },
  };
  const filename = path.resolve(__dirname, '../src/index.tsx');
  const loaded = new Module(filename, module); loaded.filename = filename;
  loaded.require = id => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@raycast/api') return api;
    if (id === './provider') return { createProviderClient: (_, options) => { event = options.onEvent; return client; }, providerCapabilities: p => ({ label: p === 'codex' ? 'Codex' : 'Antigravity', supportsSteering: p === 'codex', supportsEffort: p === 'codex' }) };
    if (id === './provider-menu') return { ProviderMenu: 'providers' };
    if (id === './message-composer') return { MessageComposer: 'composer' };
    if (id === './model-menu') return { ModelMenu: 'models', EffortMenu: 'efforts' };
    if (id === './setup') return { SetupWizard: 'setup' };
    if (id === './history') return { useSessionHistory: () => ({}) };
    if (id === './chat-text') return { conversationMarkdown: (_, __, status, error) => status + ' ' + error };
    return require(path.resolve(path.dirname(filename), id + '.ts'));
  };
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, fileName: filename }).outputText;
  loaded._compile(source + '\nexports.NativeChat = NativeChat;', filename);
  const props = { provider, arguments: {}, onProviderChange: async () => { switched++; }, onConfigure() {}, onPromptConsumed() {} };
  function render() { cursor = 0; const tree = loaded.exports.NativeChat(props); const pending = effects; effects = []; pending.forEach(fn => fn()); return tree; }
  function nodes(node) { if (!node || typeof node !== 'object') return []; return [node, ...[node.props?.children, node.props?.actions].flat(Infinity).flatMap(nodes)]; }
  function find(type) { return nodes(render()).find(node => node.type === type).props; }
  t.after(() => { for (const cleanup of cleanups.values()) cleanup?.(); });
  return {
    async ready() { render(); for (let n = 0; n < 5; n++) { await new Promise(setImmediate); render(); } assert.equal(find('composer').ready, true); },
    composer: () => find('composer'), providers: () => find('providers'), markdown: () => render().props.markdown,
    stop: () => nodes(render()).find(node => node.type === Action && node.props.title === 'Stop Response').props.onAction(),
    blockWrites() { let release; writeGate = new Promise(resolve => { release = resolve; }); return () => { release(); writeGate = null; }; },
    get switched() { return switched; }, get started() { return started; },
  };
}

test('provider switch blocks sending and another switch until old storage is durable', async t => {
  const ui = chat(t); await ui.ready(); ui.composer().onChange('unsent draft');
  const release = ui.blockWrites();
  const switching = ui.providers().onSelect('codex');
  assert.equal(await ui.composer().onSend('must not start'), false);
  await ui.providers().onSelect('codex');
  assert.equal(ui.started, 0); assert.equal(ui.switched, 0);
  release(); await switching; assert.equal(ui.switched, 1);
});

test('selecting the current provider is a no-op and an active reply blocks switching', async t => {
  const ui = chat(t); await ui.ready(); await ui.providers().onSelect('antigravity'); assert.equal(ui.switched, 0);
  assert.equal(await ui.composer().onSend('hello'), true);
  assert.equal(ui.started, 1); await ui.providers().onSelect('codex'); assert.equal(ui.switched, 0);
});

for (const provider of ['codex', 'antigravity']) test(`${provider} stop completion cannot be overwritten by a late stopping label`, async t => {
  const ui = chat(t, provider); await ui.ready(); await ui.composer().onSend('hello');
  if (provider === 'antigravity') assert.doesNotMatch(ui.markdown(), /steer/);
  await ui.stop();
  assert.match(ui.markdown(), /Stopped/); assert.doesNotMatch(ui.markdown(), /Stopping/);
});
