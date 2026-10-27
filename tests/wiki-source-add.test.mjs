import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/domain/store.mjs';
const bot=id=>({kind:'bot',id});
function setup(t){const dir=mkdtempSync(join(tmpdir(),'wiki-add-')),path=join(dir,'test.sqlite'),s=createStore(path);t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true});});return {s,path};}
const payload={requestId:'add-one',title:'Useful note',text:'Observed method\nA reproducible result',tags:['process'],origin:'local observation'};
test('raw note addition deduplicates normalized content across bots and replays audit once',t=>{
 const {s}=setup(t);const first=s.command('wiki.source.add',payload,bot('bot-1'));const before=s.read();
 assert.equal(first.result.status,'pending');assert.equal(first.result.duplicate,false);assert.equal(first.result.markdown,undefined);
 assert.deepEqual(s.command('wiki.source.add',payload,bot('bot-1')),first);assert.deepEqual(s.read(),before);
 const duplicate=s.command('wiki.source.add',{...payload,requestId:'other',title:'Different title',tags:['different'],text:'  Observed method\r\nA reproducible result  '},bot('bot-2')).result;
 assert.equal(duplicate.id,first.result.id);assert.equal(duplicate.duplicate,true);assert.equal(s.read().wiki.sources.length,1);assert.equal(s.read().wiki.jobs.length,1);assert.deepEqual(s.read().wiki.sources,before.wiki.sources);
 assert.equal(s.read().wiki.log.filter(x=>x.action==='wiki.source.add').length,2);assert.equal(s.read().inbox.filter(x=>x.kind==='wiki').length,1);
 assert.throws(()=>s.command('wiki.source.add',{...payload,title:'Changed'},bot('bot-1')),e=>e.status===409);
});
test('raw add permission is distinct from user requests and main maintenance; mutation aliases forbidden',t=>{
 const {s}=setup(t);
 for(const actor of [{kind:'user',id:'owner'},bot('missing')])assert.throws(()=>s.command('wiki.source.add',payload,actor),e=>e.status===403);
 const added=s.command('wiki.source.add',payload,bot('bot-3')).result;
 for(const id of ['bot-0','bot-3'])for(const action of ['edit','update','delete','remove','purge'])assert.throws(()=>s.command('wiki.source.'+action,{id:added.id},bot(id)),e=>e.status===403);
 assert.throws(()=>s.command('wiki.job.start',{id:added.jobId,expectedVersion:0},bot('bot-3')),e=>e.status===403);
 assert.throws(()=>s.command('wiki.request',{kind:'add',text:'New page'},bot('bot-3')),e=>e.status===403);
 assert.equal(s.command('wiki.request',{kind:'add',text:'New page'}).result.status,'pending');
 assert.equal(s.command('wiki.job.start',{id:added.jobId,expectedVersion:0},bot('bot-0')).result.status,'ingesting');
});
test('UTF8 size boundaries and metadata validation precede persistence',t=>{
 const {s}=setup(t);const body='한'.repeat(21845)+'a';assert.equal(Buffer.byteLength(body),65536);
 s.command('wiki.source.add',{requestId:'boundary',title:'Boundary',text:body},bot('bot-1'));
 for(const p of [{...payload,text:body+'a'},{...payload,actor:'extra'},{...payload,reason:'extra'},{...payload,requestId:' '},{...payload,tags:Array(21).fill('tag')},{...payload,tags:['x'.repeat(51)]},{...payload,origin:'x'.repeat(1001)}])assert.throws(()=>s.command('wiki.source.add',p,bot('bot-1')),e=>e.status===400);
 assert.equal(s.read().wiki.sources.length,1);
});
test('credential heuristic checks all submitted strings before replay and leaves no SQL traces',t=>{
 const {s,path}=setup(t);s.command('wiki.source.add',payload,bot('bot-1'));const baseline=s.read();
 const secrets=['API_KEY=unique-sensitive-value','"password": "unique-sensitive-value"','토큰: unique-sensitive-value','Authorization: Bearer abcdefghijklmnop','Authorization: Basic dXNlcjpwYXNz','-----BEGIN RSA PRIVATE KEY-----','sk-proj-abcdefghijklmnopqrstuvwxyz','ghp_abcdefghijklmnopqrstuvwxyz','eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature','https://user:unique-sensitive-value@example.test','a'.repeat(64)];
 for(const secret of secrets)for(const key of ['text','title','requestId','origin','tags']){
  const p={...payload,[key]:key==='tags'?[secret]:secret};
  assert.throws(()=>s.command('wiki.source.add',p,bot('bot-1')),e=>e.status===400&&!e.message.includes(secret));
 }
 assert.deepEqual(s.read(),baseline);const db=new DatabaseSync(path);const rows=db.prepare('SELECT payload,result FROM requests').all();assert.equal(rows.length,1);assert.ok(!JSON.stringify(rows).includes('unique-sensitive-value'));db.close();
 const ordinary=s.command('wiki.source.add',{requestId:'ordinary',title:'Password management',text:'Use token rotation. Keep the API key private. Secret handling is documented.'},bot('bot-2'));assert.equal(ordinary.result.duplicate,false);
});
