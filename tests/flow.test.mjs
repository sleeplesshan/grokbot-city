import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../server/domain.mjs';
import {seedDemo,stepDemo} from './helpers/demo.mjs';
const main={kind:'bot',id:'bot-0'},worker={kind:'bot',id:'bot-1'};
const nodes=[{id:'research',title:'Research',description:'Gather facts',botId:'bot-1'},{id:'build',title:'Build',description:'Implement',botId:'bot-2'}];
const edges=[{source:'research',target:'build',label:'evidence'}];
test('demo seed attaches plans and steps update existing nodes without duplicate subtasks',t=>{
 const s=createStore(':memory:');t.after(()=>s.close());seedDemo(s);
 const running=s.read().tasks.filter(x=>x.runs.length);
 assert.ok(running.length>0);
 for(const task of running) {
  const run=task.runs.at(-1);assert.deepEqual(run.flowPlan,task.flowPlan);
  assert.equal(run.subtasks.length,run.flowPlan.nodes.length);
  assert.equal(new Set(run.subtasks.map(n=>n.nodeId)).size,run.subtasks.length);
 }
 while(s.read().inbox.some(e=>!e.acknowledgedAt&&!e.cancelledAt)) stepDemo(s);
 const task=s.read().tasks.find(x=>x.stage==='monitor'&&x.runs.at(-1)?.status!=='done');
 const before=task.runs.at(-1),ids=before.subtasks.map(n=>n.id),node=before.subtasks.find(n=>n.status!=='done');
 const next=stepDemo(s).result;
 assert.equal(next.id,task.id);assert.deepEqual(next.runs.at(-1).subtasks.map(n=>n.id),ids);
 assert.equal(next.runs.at(-1).subtasks.find(n=>n.id===node.id).progress,Math.min(100,node.progress+20));
 assert.equal(s.read().history[0].action,'node.update');
 let draft=s.command('task.publish',{title:'Fresh demo brief',type:'solo',boss:'bot-0'}).result;
 draft=s.command('task.dispatch',{id:draft.id,expectedVersion:draft.version,enabled:true}).result;
 const planned=stepDemo(s).result;assert.equal(planned.id,draft.id);assert.ok(planned.flowPlan);assert.equal(planned.runs.length,0);
 const accepted=stepDemo(s).result;assert.equal(accepted.stage,'monitor');assert.deepEqual(accepted.runs[0].flowPlan,planned.flowPlan);
});
function setup(t){const s=createStore(':memory:');t.after(()=>s.close());const task=s.command('task.publish',{title:'Flow task',type:'team',boss:'bot-1',members:['bot-2'],routine:true,category:'Work'}).result;return {s,task};}
function flow(s,t,ns=nodes,es=edges){return s.command('flow.submit',{id:t.id,expectedVersion:t.version,version:t.publishedVersion,flowRequestId:t.flowRequestId,nodes:ns,edges:es},worker).result;}
function start(s,t){t=s.command('task.dispatch',{id:t.id,expectedVersion:t.version,enabled:true}).result;return s.command('task.ack',{id:t.id,version:t.publishedVersion,dispatchId:t.dispatchId},main).result;}
function update(s,t,nodeId,status,extra={}){return s.command('node.update',{id:t.id,expectedVersion:t.version,runId:t.runs.at(-1).id,nodeId,status,...extra},worker).result;}
test('flow validates references, DAG, owners, duplicate IDs and stale tokens atomically',t=>{
 const {s,task}=setup(t);const before=s.read();
 for(const [ns,es] of [[nodes,[...edges,{source:'build',target:'research'}]],[nodes,[{source:'missing',target:'build'}]],[[nodes[0],nodes[0]],[]],[[{...nodes[0],botId:'bot-6'}],[]],[[null],[]]]) {assert.throws(()=>flow(s,task,ns,es));assert.deepEqual(s.read(),before);}
 const newer=s.command('task.publish',{id:task.id,expectedVersion:task.version,...task.draft,title:'Changed'}).result;
 assert.throws(()=>s.command('flow.submit',{id:newer.id,expectedVersion:newer.version,version:task.publishedVersion,flowRequestId:task.flowRequestId,nodes,edges},main),e=>e.status===409);
 assert.ok(s.read().inbox.find(e=>e.flowRequestId===task.flowRequestId).cancelledAt);assert.equal(flow(s,newer).flowPlan.version,2);
});
test('parallel node progress aggregates once without dependency execution',t=>{
 let {s,task}=setup(t);task=start(s,flow(s,task));assert.equal(task.runs[0].status,'active');assert.ok(task.runs[0].subtasks.every(x=>x.status==='waiting'));
 task=update(s,task,'build','active',{progress:40,note:'Parallel',blocked:true});task=update(s,task,'research','active',{progress:20});
 assert.equal(task.runs[0].progress,30);assert.equal(task.runs[0].subtasks.filter(x=>x.status==='active').length,2);
 task=update(s,task,'build','active',{progress:60});assert.equal(task.runs[0].subtasks.find(x=>x.nodeId==='build').note,'Parallel');assert.equal(task.runs[0].blocked,true);
 assert.throws(()=>s.command('subtask.upsert',{id:task.id,expectedVersion:task.version,runId:task.runs[0].id,title:'Extra',botId:'bot-1',status:'waiting',progress:0},worker),e=>e.status===409);
 task=update(s,task,'build','done');task=update(s,task,'research','done');assert.equal(task.runs[0].progress,100);
 const old=structuredClone(task.runs[0]);task=s.command('run.create',{id:task.id,expectedVersion:task.version},worker).result;
 assert.deepEqual(task.runs[0],old);assert.ok(task.runs[1].subtasks.every(x=>x.progress===0));assert.notEqual(task.runs[1].subtasks[0].id,old.subtasks[0].id);
 assert.throws(()=>update(s,task,'build','active',{runId:old.id}),e=>e.status===409);
});
test('flow arriving late leaves legacy reports intact and cannot adopt unmapped reports',t=>{
 let {s,task}=setup(t);task=start(s,task);task=s.command('subtask.upsert',{id:task.id,expectedVersion:task.version,runId:task.runs[0].id,title:'Legacy',botId:'bot-1',status:'active',progress:20},worker).result;
 const old=structuredClone(task.runs[0]);task=flow(s,task);assert.deepEqual(task.runs[0],old);
 assert.throws(()=>s.command('run.adopt',{id:task.id,expectedVersion:task.version,runId:old.id},main),e=>e.status===409);
});
test('adoption maps stable nodes preserves reports and rejects deleting reported nodes',t=>{
 let {s,task}=setup(t);task=start(s,flow(s,task));task=update(s,task,'research','active',{progress:40});const oldSub=task.runs[0].subtasks[0];
 task=s.command('task.publish',{id:task.id,expectedVersion:task.version,...task.draft,title:'Revision'}).result;
 task=flow(s,task,[nodes[1]],[]);assert.equal(task.runs[0].flowPlan.version,1);
 assert.throws(()=>s.command('run.adopt',{id:task.id,expectedVersion:task.version,runId:task.runs[0].id},main),e=>e.status===409);
 task=s.command('task.publish',{id:task.id,expectedVersion:task.version,...task.draft,title:'Safe revision'}).result;
 task=flow(s,task,[{...nodes[0],title:'Research revised'},nodes[1]],edges);task=s.command('run.adopt',{id:task.id,expectedVersion:task.version,runId:task.runs[0].id},main).result;
 assert.equal(task.runs[0].subtasks[0].id,oldSub.id);assert.equal(task.runs[0].subtasks[0].progress,40);assert.equal(task.runs[0].flowPlan.version,3);
});
test('category rename retains flow token and archive cancels it',t=>{
 let {s,task}=setup(t);const token=task.flowRequestId;s.command('category.update',{category:'Work',name:'New',color:'mint',expectedRevision:s.read().revision});task=s.read().tasks[0];assert.equal(task.flowRequestId,token);
 task=start(s,task);task=s.command('task.report',{id:task.id,expectedVersion:task.version,runId:task.runs[0].id,status:'done',progress:100},worker).result;task=s.command('task.archive',{id:task.id,expectedVersion:task.version}).result;
 assert.equal(task.flowRequestId,null);assert.ok(s.read().inbox.find(e=>e.flowRequestId===token).cancelledAt);
});
test('late adoption accepts untouched runs but rejects reported parent progress',t=>{
 let {s,task}=setup(t);task=start(s,task);task=flow(s,task);task=s.command('run.adopt',{id:task.id,expectedVersion:task.version,runId:task.runs[0].id},main).result;assert.equal(task.runs[0].subtasks.length,2);
 let other=s.command('task.publish',{title:'Reported parent',type:'team',boss:'bot-1',members:['bot-2']}).result;other=start(s,other);
 other=s.command('task.report',{id:other.id,expectedVersion:other.version,runId:other.runs[0].id,status:'active',progress:40},worker).result;other=flow(s,other);
 assert.throws(()=>s.command('run.adopt',{id:other.id,expectedVersion:other.version,runId:other.runs[0].id},main),e=>e.status===409);
});
