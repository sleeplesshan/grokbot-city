import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../server/domain.mjs';
function setup(t){const store=createStore(':memory:');t.after(()=>store.close());return store;}
function preference(s,id,tool,usage){return s.command('bot.cli',{id,expectedVersion:s.read().bots.find(b=>b.id===id).version,tool,usage}).result;}
function toggle(s,enabled){return s.command('bot.cliAll',{id:'bot-0',expectedRevision:s.read().revision,enabled}).result;}

test('shared CLI enable overwrites preferences and notifies only changed bots without acknowledging',t=>{
 const s=setup(t);preference(s,'bot-0','codex','active');preference(s,'bot-1','codex','active');preference(s,'bot-2','other','occasional');
 const before=s.read();toggle(s,true);const after=s.read();
 assert.equal(after.bots[0].cliApplyAll,true);assert.ok(after.bots.every(b=>JSON.stringify(b.cliUsage)===JSON.stringify(after.bots[0].cliUsage)));
 for(const i of [0,1])assert.equal(after.bots[i].instructionVersion,before.bots[i].instructionVersion);
 for(const i of [2,3,4,5,6])assert.equal(after.bots[i].instructionVersion,before.bots[i].instructionVersion+1);
 assert.equal(after.inbox.length-before.inbox.length,5);assert.ok(after.bots.every(b=>b.appliedVersion===0&&b.appliedAt===null));
});

test('shared preferences propagate persistently and disabling keeps latest individual values',t=>{
 const s=setup(t);toggle(s,true);preference(s,'bot-0','claudeCode','occasional');
 assert.ok(s.read().bots.every(b=>b.cliUsage.claudeCode==='occasional'));
 const before=s.read();assert.throws(()=>preference(s,'bot-1','codex','active'),e=>e.status===409);assert.deepEqual(s.read(),before);
 toggle(s,false);const disabled=s.read();assert.ok(disabled.bots.every(b=>b.cliUsage.claudeCode==='occasional'));assert.equal(disabled.inbox.length,before.inbox.length);
 preference(s,'bot-1','claudeCode','never');assert.equal(s.read().bots[0].cliUsage.claudeCode,'occasional');assert.equal(s.read().bots[1].cliUsage.claudeCode,'never');
});

test('repeated CLI values and toggles do not create fake instruction revisions',t=>{
 const s=setup(t);preference(s,'bot-0','codex','never');assert.equal(s.read().inbox.length,0);toggle(s,true);
 const before=s.read();toggle(s,true);preference(s,'bot-0','codex','never');const after=s.read();
 assert.equal(after.inbox.length,before.inbox.length);assert.deepEqual(after.bots,before.bots);
});

test('CLI sharing rejects stale revisions, subordinate controllers and bot callers atomically',t=>{
 const s=setup(t);const baseline=s.read();
 for(const [payload,actor,status] of [
  [{id:'bot-0',expectedRevision:-1,enabled:true},undefined,409],
  [{id:'bot-1',expectedRevision:0,enabled:true},undefined,403],
  [{id:'bot-0',expectedRevision:0,enabled:true},{kind:'bot',id:'bot-0'},403],
  [{id:'bot-0',expectedRevision:0,enabled:'yes'},undefined,400],
 ]){assert.throws(()=>s.command('bot.cliAll',payload,actor),e=>e.status===status);assert.deepEqual(s.read(),baseline);}
 toggle(s,true);const before=s.read();assert.throws(()=>s.command('bot.cli',{id:'bot-0',expectedVersion:0,tool:'codex',usage:'active'}),e=>e.status===409);assert.deepEqual(s.read(),before);
});

test('shared preference settings remain isolated from another workspace',t=>{
 const live=setup(t),demo=setup(t);toggle(demo,true);preference(demo,'bot-0','codex','active');
 assert.ok(live.read().bots.every(b=>b.cliUsage.codex==='never'));assert.equal(!!live.read().bots[0].cliApplyAll,false);assert.equal(live.read().inbox.length,0);
});
