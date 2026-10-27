import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {createStore} from '../server/domain/store.mjs';
const main={kind:'bot',id:'bot-0'};
const create=(s,p)=>s.command('bot.create',p,main);
const setup=t=>{const s=createStore(':memory:');t.after(()=>s.close());return s;};
test('creation preserves existing profiles and tasks and replays exactly once',t=>{
 const s=setup(t);s.command('task.publish',{title:'Existing',type:'solo',boss:'bot-1',description:'Keep'});
 const before=s.read(),payload={requestId:'new',name:' New bot ',role:'Research',avatar:'/assets/face.png'};
 const result=create(s,payload),after=s.read();assert.equal(result.result.id,'bot-7');assert.equal(result.result.name,'New bot');
 assert.deepEqual(after.tasks,before.tasks);assert.deepEqual(after.bots.slice(1,7),before.bots.slice(1));
 assert.deepEqual({...after.bots[0],lastReportAt:before.bots[0].lastReportAt},before.bots[0]);
 assert.deepEqual(create(s,payload),result);assert.deepEqual(s.read(),after);
 assert.throws(()=>create(s,{...payload,name:'Different'}),e=>e.status===409);
 assert.equal(result.result.instructions,'');assert.equal(result.result.appliedAt,null);assert.equal(result.result.instructionVersion,0);
});
test('creation requires main actor and valid idempotency and profile fields',t=>{
 const s=setup(t),before=s.read();
 for(const actor of [{kind:'user',id:'owner'},{kind:'bot',id:'bot-1'}]) assert.throws(()=>s.command('bot.create',{requestId:'x',name:'Bot'},actor),e=>e.status===403);
 for(const p of [{name:'Bot'},{requestId:' ',name:'Bot'},{requestId:'x',name:' '},{requestId:'x',name:'Bot',id:'bot-55'},{requestId:'x',name:'Bot',avatar:'/assets/../bad'},{requestId:'x',name:'Bot',role:3}])assert.throws(()=>create(s,p),e=>e.status===400);
 assert.deepEqual(s.read(),before);
});
test('creation inherits shared preferences without acknowledging and persists beyond ten bots',t=>{
 const dir=mkdtempSync(join(tmpdir(),'grok-create-'));let s=createStore(join(dir,'live.sqlite'));t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true});});
 s.command('bot.cli',{id:'bot-0',expectedVersion:0,tool:'codex',usage:'active'});
 s.command('bot.cliAll',{id:'bot-0',expectedRevision:s.read().revision,enabled:true});
 for(let i=7;i<14;i++){const b=create(s,{requestId:`r${i}`,name:`Bot ${i}`}).result;assert.equal(b.id,`bot-${i}`);assert.equal(b.cliUsage.codex,'active');assert.equal(b.instructionVersion,1);assert.equal(b.appliedVersion,0);assert.equal(b.appliedAt,null);assert.ok(s.read().inbox.some(e=>e.targetId===b.id&&!e.acknowledgedAt));}
 s.close();s=createStore(join(dir,'live.sqlite'));assert.equal(s.read().bots.length,14);assert.equal(create(s,{requestId:'after-restart',name:'Next'}).result.id,'bot-14');
});
test('simultaneous independent writers allocate unique permanent suffixes',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'grok-concurrent-')),path=join(dir,'live.sqlite');const s=createStore(path);s.close();t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const moduleUrl=new URL('../server/domain/store.mjs',import.meta.url).href;
 const workers=Array.from({length:4},(_,i)=>new Worker(`const {parentPort,workerData}=require('node:worker_threads');(async()=>{const {createStore}=await import(workerData.moduleUrl);const s=createStore(workerData.path);parentPort.postMessage('ready');parentPort.once('message',()=>{try{parentPort.postMessage(s.command('bot.create',{requestId:'parallel'+workerData.i,name:'Parallel'},{kind:'bot',id:'bot-0'}).result.id);}finally{s.close();}});})();`,{eval:true,workerData:{moduleUrl,path,i}}));
 await Promise.all(workers.map(w=>new Promise((resolve,reject)=>{w.once('message',resolve);w.once('error',reject);})));const results=await Promise.all(workers.map(w=>new Promise((resolve,reject)=>{w.once('message',resolve);w.once('error',reject);w.postMessage('go');})));
 await Promise.all(workers.map(w=>w.terminate()));assert.deepEqual(results.sort(),['bot-7','bot-8','bot-9','bot-10'].sort());const verify=createStore(path);assert.equal(verify.read().bots.length,11);verify.close();
});
