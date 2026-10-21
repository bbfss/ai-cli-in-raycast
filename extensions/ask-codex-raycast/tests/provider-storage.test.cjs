require('./load.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {storageKeys}=require('../src/session-storage.ts');
const {connectionSignature}=require('../src/setup-state.ts');
test('Codex retains installed storage while other CLI state cannot collide',()=>{
 const codex=storageKeys('codex'), agy=storageKeys('antigravity');
 assert.equal(codex.library,'ask-codex.conversations.v2');
 assert.equal(codex.model,'ask-chatgpt.model-selection.v1');
 for(const key of Object.keys(codex))assert.notEqual(codex[key],agy[key]);
 assert.equal(new Set([...Object.values(codex),...Object.values(agy)]).size,8);
});
test('CLI connection setup changes only for its own executable settings',()=>{
 const base={codexPath:'/codex',agyPath:'/agy'};
 assert.equal(connectionSignature(base),connectionSignature({...base,agyPath:'/other'}));
 assert.notEqual(connectionSignature(base,'antigravity'),connectionSignature({...base,agyPath:'/other'},'antigravity'));
 assert.notEqual(connectionSignature(base),connectionSignature(base,'antigravity'));
});
