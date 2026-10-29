import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../server/domain/store.mjs';

test('monitoring requests are deduplicated, main-only acknowledged, and repeatable after completion',()=>{
  const store=createStore(':memory:');
  const main={kind:'bot',id:'bot-0'},member={kind:'bot',id:'bot-1'};
  try {
    assert.throws(()=>store.command('monitor.request',{requestId:'forbidden'},member),e=>e.status===403);
    const request=store.command('monitor.request',{requestId:'first'}).result;
    assert.equal(request.kind,'monitor');assert.equal(request.recipient,'bot-0');
    assert.equal(store.command('monitor.request',{requestId:'first'}).result.id,request.id);
    assert.equal(store.command('monitor.request',{requestId:'second'}).result.id,request.id);
    assert.equal(store.read().inbox.length,1);
    assert.throws(()=>store.command('monitor.ack',{id:request.id,requestId:'bad',summary:'done'},member),e=>e.status===403);
    assert.throws(()=>store.command('monitor.ack',{id:request.id,requestId:'empty'},main),e=>e.status===400);
    const payload={id:request.id,requestId:'ack',summary:'Reviewed active tasks; no changes needed.'};
    const result=store.command('monitor.ack',payload,main).result;
    assert.ok(result.acknowledgedAt);assert.equal(result.summary,payload.summary);
    assert.deepEqual(store.command('monitor.ack',payload,main).result,result);
    assert.throws(()=>store.command('monitor.ack',{...payload,requestId:'stale'},main),e=>e.status===409);
    assert.notEqual(store.command('monitor.request',{requestId:'next'}).result.id,request.id);
    assert.equal(store.read().tasks.length,0);
  } finally {store.close();}
});
