require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { AntigravityClient, parseAgyModels } = require('../src/provider-antigravity.ts');

test('AGY catalog ignores progress text and preserves model identities and labels', () => {
  assert.deepEqual(parseAgyModels('Fetching available models...\ngemini-high\tGemini High\n'), [{ model:'gemini-high', displayName:'Gemini High', efforts:[], defaultEffort:'' }]);
});

test('AGY conversation mapping survives restart and explicit resume; streamed completion has stable identity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'raycast-agy-'));
  const cli = join(dir, 'agy');
  writeFileSync(cli, `#!${process.execPath}\nconst args=process.argv.slice(2);if(args[0]==='models'){console.log('test-model\\tTest Model');process.exit(0)};const id=args.includes('--conversation')?args[args.indexOf('--conversation')+1]:'remote-123';console.log(JSON.stringify({event:'init',conversation_id:id}));console.log(JSON.stringify({event:'step_update',step_update:{step_type:'agent_response',text_delta:'Hello'}}));console.log(JSON.stringify({event:'result',result:{status:'SUCCESS',conversation_id:id,response:id+':'+args.at(-1)}}));`,{mode:0o700});
  const saved = new Map();
  const sessions = { get: async id => saved.get(id), set: async (id, remote) => { saved.set(id,remote); } };
  async function run(id,prompt) {
    const events=[];
    let resolve;const done=new Promise(r=>resolve=r);
    const client=new AntigravityClient({agyPath:cli,cwd:dir,sessions,onEvent:e=>{events.push(e);if(e.method==='turn/completed')resolve();}});
    await client.connect();await client.checkAuthentication();
    const local=id?await client.resumeThread(id):await client.startThread();
    await client.startTurn(prompt,{model:'test-model',effort:''});
    await done;client.close();return {local,events};
  }
  try {
    const first=await run(null,'literal $(echo unsafe)');
    assert.equal(saved.get(first.local),'remote-123');
    const next=await run(first.local,'follow-up');
    assert.equal(next.local,first.local);
    assert.equal(next.events.find(e=>e.method==='item/completed').params.item.text,'remote-123:follow-up');
    assert.equal(next.events.find(e=>e.method==='item/agentMessage/delta').params.itemId,next.events.find(e=>e.method==='item/completed').params.item.id);
    assert.equal(next.events.at(-1).params.turn.status,'completed');
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('AGY rejects a Codex thread before reading any foreign session storage', async () => {
  const client=new AntigravityClient({onEvent:()=>{},sessions:{get:async()=>{throw Error('must not read');},set:async()=>{}}});
  await assert.rejects(client.resumeThread('codex-thread'),/different CLI/);
});
