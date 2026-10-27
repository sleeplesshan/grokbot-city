import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../server/domain.mjs';
import {wikiIndex,wikiLinks} from '../server/wiki.mjs';
import {stepDemo} from './helpers/demo.mjs';
const bot={kind:'bot',id:'bot-0'};
test('wiki links exclude fenced, indented, inline and escaped code examples',()=>{
 const markdown='[[real]]\n~~~md\n[[tilde-code]]\n~~~\n````md\n```\n[[nested-fence-code]]\n````\n    [[indented-code]]\n\t[[tab-code]]\n``[[inline-code]]``\n\\[[escaped]]\n[[real|Alias]]\n[[self]]';
 assert.deepEqual(wikiLinks(markdown),['real','self']);
});
test('invalid staged page gives input error and leaves the job intact',t=>{
 const s=setup(t);const job=command(s,request(s),'wiki.job.start');const before=s.read();
 assert.throws(()=>command(s,job,'wiki.stage',{pages:[null]}),e=>e.status===400);assert.deepEqual(s.read(),before);
});
function setup(t){const s=createStore(':memory:');t.after(()=>s.close());return s;}
function archive(s){let task=s.command('task.publish',{title:'Knowledge source',description:'Evidence',criteria:'Verified',type:'solo',boss:'bot-0'}).result;task=s.command('task.dispatch',{id:task.id,expectedVersion:task.version,enabled:true}).result;task=s.command('task.ack',{id:task.id,version:task.publishedVersion,dispatchId:task.dispatchId},bot).result;task=s.command('task.report',{id:task.id,runId:task.runs[0].id,expectedVersion:task.version,status:'done',progress:100},bot).result;return s.command('task.archive',{id:task.id,expectedVersion:task.version}).result;}
function request(s,kind='add',extra={}){return s.command('wiki.request',{kind,text:'Maintain knowledge',...extra}).result;}
function command(s,job,action,p={}){return s.command(action,{id:job.id,expectedVersion:job.version,attemptId:job.attemptId,...p},bot).result;}
const page=(id,markdown,expectedVersion=0)=>({id,title:id,summary:'Summary',markdown,sourceIds:[],expectedVersion});
function publish(s,pages){let job=command(s,request(s),'wiki.job.start');job=command(s,job,'wiki.stage',{pages});return command(s,job,'wiki.commit',{semanticReview:'Reviewed claims and links.'});}

test('wiki archive and result sources are immutable, deduplicated, and survive task purge',t=>{
 const s=setup(t);let task=archive(s);assert.equal(s.read().wiki.sources.length,1);
 task=s.command('task.retrospective',{id:task.id,expectedVersion:task.version,retrospectiveRequestId:task.retrospectiveRequestId,markdown:'# Verified result'},bot).result;
 const sources=structuredClone(s.read().wiki.sources);assert.equal(sources.length,2);
 task=s.command('task.restore',{id:task.id,expectedVersion:task.version}).result;
 // Move via trash after completed history remains intact; no task mutation may cascade into wiki.
 task=s.command('task.dispatch',{id:task.id,expectedVersion:task.version,enabled:true}).result;task=s.command('task.ack',{id:task.id,version:task.publishedVersion,dispatchId:task.dispatchId},bot).result;
 task=s.command('task.report',{id:task.id,runId:task.runs.at(-1).id,expectedVersion:task.version,status:'done',progress:100},bot).result;
 task=s.command('task.archive',{id:task.id,expectedVersion:task.version}).result;
 const count=s.read().wiki.sources.length;
 task=s.command('task.retrospective',{id:task.id,expectedVersion:task.version,retrospectiveRequestId:task.retrospectiveRequestId,markdown:'# Verified result'},bot).result;assert.equal(s.read().wiki.sources.length,count);
 task=s.command('task.trash',{id:task.id,expectedVersion:task.version}).result;const wiki=structuredClone(s.read().wiki);
 s.command('trash.empty',{expectedRevision:s.read().revision,confirm:true,count:1});assert.deepEqual(s.read().wiki,wiki);assert.ok(s.read().wiki.sources.some(x=>x.hash===sources[0].hash));
});
test('wiki staging is unpublished until structural and semantic checks commit atomically',t=>{
 const s=setup(t);let job=command(s,request(s),'wiki.job.start');
 job=command(s,job,'wiki.stage',{pages:[page('alpha','# A\n[[beta]]'),page('beta','# B\n[[alpha|Alpha]]')]});
 assert.equal(job.status,'linting');assert.equal(s.read().wiki.pages.length,0);assert.deepEqual(job.findings,[]);
 assert.throws(()=>command(s,job,'wiki.commit',{semanticReview:''}));assert.equal(s.read().wiki.pages.length,0);
 job=command(s,job,'wiki.commit',{semanticReview:'Reviewed both claims against sources.'});assert.equal(job.status,'done');
 assert.equal(s.read().wiki.pages.length,2);assert.deepEqual(wikiIndex(s.read()).graph.edges,[{source:'alpha',target:'beta'},{source:'beta',target:'alpha'}]);
 assert.equal(s.read().wiki.log.filter(x=>x.action==='publish').length,1);
});
test('wiki unresolved links are findings not invented graph nodes; retry rejects stale attempts',t=>{
 const s=setup(t);let job=command(s,request(s),'wiki.job.start');const old=job.attemptId;
 job=command(s,job,'wiki.stage',{pages:[page('a','[[missing]]')]});assert.equal(job.findings[0].type,'unresolved-link');assert.equal(wikiIndex(s.read()).graph.nodes.length,0);
 assert.throws(()=>command(s,job,'wiki.commit',{semanticReview:'Reviewed'}),e=>e.status===409);
 job=command(s,job,'wiki.job.retry');assert.notEqual(job.attemptId,old);
 assert.throws(()=>command(s,job,'wiki.stage',{attemptId:old,pages:[page('a','No links')]}),e=>e.status===409);
});
test('wiki page version conflicts prevent partial publish and deletion requires explicit target plus repaired backlinks',t=>{
 const s=setup(t);publish(s,[page('a','[[b]]'),page('b','Original')]);
 let slow=command(s,request(s),'wiki.job.start');slow=command(s,slow,'wiki.stage',{pages:[page('b','Stale edit',1),page('c','New page')]});publish(s,[page('b','Newer edit',1)]);
 assert.throws(()=>command(s,slow,'wiki.commit',{semanticReview:'Reviewed'}),e=>e.status===409);assert.equal(s.read().wiki.pages.some(p=>p.id==='c'),false);
 let del=command(s,request(s,'delete',{pageId:'b',expectedPageVersion:2}),'wiki.job.start');del=command(s,del,'wiki.stage',{pages:[{id:'b',operation:'delete',expectedVersion:2}]});assert.ok(del.findings.length);
 assert.throws(()=>command(s,del,'wiki.commit',{semanticReview:'Reviewed'}),e=>e.status===409);
 del=command(s,del,'wiki.stage',{pages:[{id:'b',operation:'delete',expectedVersion:2},page('a','Link removed by explicit deletion request',1)]});command(s,del,'wiki.commit',{semanticReview:'Removed backlinks and reviewed deletion.'});
 assert.ok(s.read().wiki.pages.find(p=>p.id==='b').deletedAt);assert.equal(wikiIndex(s.read()).graph.nodes.length,1);
 assert.ok(s.read().wiki.log.some(e=>e.pages?.some(p=>p.id==='b'&&p.markdown==='Original')));
});
test('only main bot can stage wiki and demo runs truthful multi-click ingest then lint then publication',t=>{
 const s=setup(t);const job=request(s);assert.throws(()=>s.command('wiki.job.start',{id:job.id,expectedVersion:job.version},{kind:'bot',id:'bot-1'}),e=>e.status===403);
 assert.throws(()=>s.command('wiki.job.start',{id:job.id,expectedVersion:job.version}),e=>e.status===403);
 assert.equal(stepDemo(s).result.status,'ingesting');assert.equal(s.read().wiki.pages.length,0);
 assert.equal(stepDemo(s).result.status,'linting');assert.equal(s.read().wiki.pages.length,0);
 assert.equal(stepDemo(s).result.status,'done');assert.equal(s.read().wiki.pages.length,2);assert.ok(s.read().wiki.pages.every(p=>p.markdown.includes('데모')));
});
