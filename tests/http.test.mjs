import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { request } from "node:http";

// Copy the dependency-free server into a temporary root: these tests never
// touch the real application's DBs, configuration, key, or running process.
test("isolated HTTP security and workspace boundaries", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "grokbot-http-"));
  cpSync(new URL("../server", import.meta.url), join(dir, "server"), {
    recursive: true,
  });
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ["server/index.mjs"], {
    cwd: dir,
    env: { ...process.env, PORT: String(port) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
    rmSync(dir, { recursive: true, force: true });
  });
  await Promise.race([
    new Promise((resolve, reject) => {
      child.stdout.on("data", (data) => {
        if (data.toString().includes("Grokbot City")) resolve();
      });
      child.on("error", reject);
      child.on("exit", (code) => reject(new Error(`Server exited ${code}`)));
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Server start timed out")),
        10000,
      );
      timer.unref();
    }),
  ]);
  const base = `http://127.0.0.1:${port}`;
  const post = (path, headers = {}, payload = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
  await t.test("health and browser session work", async () => {
    assert.equal((await fetch(base + "/api/health")).status, 200);
    const response = await fetch(base + "/api/state");
    const state = await response.json();
    assert.equal(state.bots.length, 7);
    assert.equal(state.workspace, "live");
    assert.match(
      response.headers.get("set-cookie"),
      /HttpOnly; SameSite=Strict/,
    );
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
  });
  await t.test(
    "unknown session cannot bypass CSRF using literal missing",
    async () => {
      const response = await post("/api/command", {
        Cookie: "city=abcdef",
        "X-CSRF-Token": "missing",
      });
      assert.equal(response.status, 403);
    },
  );
  await t.test(
    "invalid bot credentials fail closed including multibyte values",
    async () => {
      for (const token of ["invalid", "é".repeat(64)]) {
        const response = await fetch(base + "/api/state", {
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(response.status, 401);
      }
    },
  );
  await t.test(
    "untrusted host and unexpected proxy identity are denied",
    async () => {
      const status = await new Promise((resolve, reject) => {
        const req = request(
          base + "/api/state",
          { headers: { Host: "untrusted.example" } },
          (res) => {
            res.resume();
            resolve(res.statusCode);
          },
        );
        req.on("error", reject);
        req.end();
      });
      assert.equal(status, 403);
      assert.equal(
        (
          await fetch(base + "/api/state", {
            headers: { "Tailscale-User-Login": "stranger@example.test" },
          })
        ).status,
        403,
      );
    },
  );
  const sessionResponse = await fetch(base + "/api/state");
  const initial = await sessionResponse.json();
  const sessionHeaders = {
    Cookie: sessionResponse.headers.get("set-cookie").split(";")[0],
    "X-CSRF-Token": initial.csrf,
  };
  await t.test("valid CSRF cannot be reused cross-origin", async () => {
    assert.equal(
      (
        await post("/api/command", {
          ...sessionHeaders,
          Origin: "https://untrusted.example",
        })
      ).status,
      403,
    );
  });
  await t.test("removed simulation routes and workspaces cannot read or mutate live data", async () => {
    for(const path of ['/api/demo/reset','/api/demo/step']) assert.equal((await post(path,sessionHeaders)).status,404);
    for(const path of ['/api/state','/api/sync','/api/events','/api/wiki/index','/api/health']) {
      assert.equal((await fetch(base+path+'?workspace=demo')).status,400);
      assert.equal((await fetch(base+path,{headers:{'X-Workspace':'demo'}})).status,400);
      assert.equal((await fetch(base+path+'?workspace=demo',{headers:{'X-Workspace':'live'}})).status,400);
    }
    assert.equal((await post('/api/command',{...sessionHeaders,'X-Workspace':'demo'},{action:'task.publish',payload:{title:'Must not create'}})).status,400);
    const live = await (await fetch(base + "/api/state")).json();
    assert.equal(live.revision, initial.revision);
    assert.deepEqual(live.tasks, []);
    assert.equal(existsSync(join(dir,'data/demo.sqlite')),false);
  });
  await t.test('monitor requests reach main sync only and acknowledge through the API', async()=>{
    const response=await post('/api/command',sessionHeaders,{action:'monitor.request',payload:{requestId:'monitor-http'}});
    assert.equal(response.status,200);
    const event=(await response.json()).result;
    const token=readFileSync(join(dir,'data/bot.key'),'utf8').trim();
    const headers={Authorization:`Bearer ${token}`,'X-Bot-Id':'bot-0'};
    const main=await (await fetch(base+'/api/sync',{headers})).json();
    assert.ok(main.inbox.some(e=>e.id===event.id));
    const member=await (await fetch(base+'/api/sync',{headers:{...headers,'X-Bot-Id':'bot-1'}})).json();
    assert.ok(!member.inbox.some(e=>e.id===event.id));
    assert.equal((await post('/api/command',headers,{action:'monitor.ack',payload:{id:event.id,requestId:'monitor-http-ack',summary:'Reviewed; no pending tasks.'}})).status,200);
    const after=await (await fetch(base+'/api/sync',{headers})).json();
    assert.ok(!after.inbox.some(e=>e.id===event.id));
  });
  await t.test(
    "authenticated CLI writes get bot attribution without a browser session",
    async () => {
      const token = readFileSync(join(dir, "data/bot.key"), "utf8").trim();
      const response = await post(
        "/api/command",
        { Authorization: `Bearer ${token}`, "X-Bot-Id": "bot-0" },
        {
          action: "bot.update",
          payload: { id: "bot-1", expectedVersion: 0, name: "Initialized bot" },
        },
      );
      assert.equal(response.status, 200);
      const live = await (await fetch(base + "/api/state")).json();
      assert.equal(live.history[0].actor.kind, "bot");
    },
  );
  await t.test('compact sync omits history and Markdown; retrospective download is authenticated and denied in trash',async()=>{
    const token=readFileSync(join(dir,'data/bot.key'),'utf8').trim();const botHeaders={Authorization:`Bearer ${token}`,'X-Bot-Id':'bot-0'};
    const write=async(action,payload)=>(await(await post('/api/command',botHeaders,{action,payload})).json()).result;
    let task=await write('task.publish',{title:'HTTP test fixture',type:'solo',boss:'bot-0'});
    task=await write('task.dispatch',{id:task.id,expectedVersion:task.version,enabled:true});
    task=await write('task.ack',{id:task.id,version:task.publishedVersion,dispatchId:task.dispatchId});
    task=await write('task.report',{id:task.id,runId:task.runs[0].id,expectedVersion:task.version,status:'done',progress:100});
    task=(await(await post('/api/command',sessionHeaders,{action:'task.archive',payload:{id:task.id,expectedVersion:task.version}})).json()).result;
    const markdown='# Technical stack\nNode\n# Results\nVerified';
    task=(await(await post('/api/command',botHeaders,{action:'task.retrospective',payload:{id:task.id,expectedVersion:task.version,retrospectiveRequestId:task.retrospectiveRequestId,markdown}})).json()).result;
    const sync=await(await fetch(base+'/api/sync',{headers:botHeaders})).json();assert.ok(sync.tasks.some(t=>t.retrospectiveReady));assert.equal(sync.history,undefined);assert.ok(!JSON.stringify(sync).includes(markdown));
    const targeted=await(await fetch(base+`/api/task?id=${task.id}`,{headers:botHeaders})).json();assert.equal(targeted.task.id,task.id);assert.equal(targeted.history,undefined);
    const download=await fetch(base+`/api/retrospective?id=${task.id}`,{headers:botHeaders});assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/attachment; filename="retrospective-[a-f0-9-]+\.md"/);assert.equal(await download.text(),markdown);
    assert.equal((await fetch(base+`/api/retrospective?id=${task.id}`,{headers:{Authorization:'Bearer bad'}})).status,401);
    await post('/api/command',sessionHeaders,{action:'task.trash',payload:{id:task.id,expectedVersion:task.version}});
    assert.equal((await fetch(base+`/api/retrospective?id=${task.id}`,{headers:botHeaders})).status,404);
  });
  await t.test('wiki targeted endpoints and compact index expose independent bot jobs without raw Markdown',async()=>{
    const token=readFileSync(join(dir,'data/bot.key'),'utf8').trim(),headers={Authorization:`Bearer ${token}`,'X-Bot-Id':'bot-0'};
    let job=(await(await post('/api/command',sessionHeaders,{action:'wiki.request',payload:{kind:'add',text:'New independent wiki page'}})).json()).result;
    const sync=await(await fetch(base+'/api/sync',{headers})).json();assert.ok(sync.inbox.some(e=>e.kind==='wiki'&&e.targetId===job.id));
    const other=await(await fetch(base+'/api/sync',{headers:{...headers,'X-Bot-Id':'bot-1'}})).json();assert.ok(!other.inbox.some(e=>e.kind==='wiki'));
    const write=async(action,payload)=>(await(await post('/api/command',headers,{action,payload:{id:job.id,expectedVersion:job.version,attemptId:job.attemptId,...payload}})).json()).result;
    job=await write('wiki.job.start',{});job=await write('wiki.stage',{pages:[{id:'http-page',title:'HTTP wiki',summary:'Compact summary',markdown:'# PRIVATE_MARKDOWN_BODY',sourceIds:[],expectedVersion:0}]});
    let index=await(await fetch(base+'/api/wiki/index',{headers})).json();assert.equal(index.pages.length,0);assert.equal(index.jobs.find(j=>j.id===job.id).stagedCount,1);
    job=await write('wiki.commit',{semanticReview:'Reviewed this test request.'});index=await(await fetch(base+'/api/wiki/index',{headers})).json();assert.equal(index.pages.length,1);assert.ok(!JSON.stringify(index).includes('PRIVATE_MARKDOWN_BODY'));
    const page=await(await fetch(base+'/api/wiki/page?id=http-page',{headers})).json();assert.equal(page.page.markdown,'# PRIVATE_MARKDOWN_BODY');
    const targeted=await(await fetch(base+`/api/wiki/job?id=${job.id}`,{headers})).json();assert.equal(targeted.job.status,'done');
    assert.equal((await fetch(base+'/api/wiki/index',{headers:{Authorization:'Bearer bad'}})).status,401);
  });
  await t.test('live SSE connects with snapshot revision and reconnects current', async () => {
    const open=async workspace=>{
      const controller=new AbortController();const response=await fetch(base+`/api/events?workspace=${workspace}`,{signal:controller.signal});
      assert.match(response.headers.get('content-type'),/text\/event-stream/);
      const reader=response.body.getReader();const decode=value=>new TextDecoder().decode(value);
      return {controller,reader,next:async()=>decode((await reader.read()).value)};
    };
    const live=await open('live');
    try {
      assert.match(await live.next(),/"workspace":"live"/);
      const response=await post('/api/command',sessionHeaders,{action:'category.color',payload:{category:'',color:'mint',expectedRevision:(await (await fetch(base+'/api/state')).json()).revision}});
      assert.equal(response.status,200);assert.match(await live.next(),/event: change/);
      const reconnect=await open('live');try { const text=await reconnect.next();const state=await (await fetch(base+'/api/state')).json();assert.match(text,new RegExp(`"revision":${state.revision}`)); } finally {reconnect.controller.abort();}
    } finally {live.controller.abort();}
    assert.equal((await fetch(base+'/api/events',{headers:{Authorization:'Bearer wrong'}})).status,401);
  });
  await t.test('CLI defaults compact sync and supports compact or full writes',async()=>{
    mkdirSync(join(dir,'scripts'));cpSync(new URL('../scripts/bot.mjs',import.meta.url),join(dir,'scripts/bot.mjs'));
    const configPath=join(dir,'data/config.json');const config=JSON.parse(readFileSync(configPath,'utf8'));config.port=port;writeFileSync(configPath,JSON.stringify(config));
    const cli=args=>new Promise((resolve,reject)=>{const proc=spawn(process.execPath,['scripts/bot.mjs',...args],{cwd:dir,windowsHide:true});let out='',err='';proc.stdout.on('data',c=>out+=c);proc.stderr.on('data',c=>err+=c);proc.on('error',reject);proc.on('exit',code=>code?reject(new Error(err)):resolve(JSON.parse(out)));});
    const sync=await cli([]);assert.ok(Array.isArray(sync.tasks));assert.equal(sync.history,undefined);
    writeFileSync(join(dir,'source-note.json'),JSON.stringify({requestId:'cli-source-note',title:'CLI observation',text:'Independent reusable note',tags:['testing']}));
    const note=await cli(['wiki.source.add','--file','source-note.json','--bot','bot-2']);assert.equal(note.result.status,'pending');assert.equal(note.result.duplicate,false);assert.ok(note.result.jobId);assert.equal(note.result.markdown,undefined);
    assert.deepEqual(await cli(['wiki.source.add','--file','source-note.json','--bot','bot-2']),note);
    const raw=await cli(['wiki.source','--id',note.result.id]);assert.equal(raw.source.botId,'bot-2');assert.equal(raw.source.markdown,'Independent reusable note');
    writeFileSync(join(dir,'source-secret.json'),JSON.stringify({requestId:'cli-secret-note',title:'Rejected',text:'API_KEY=do-not-persist-this'}));
    await assert.rejects(cli(['wiki.source.add','--file','source-secret.json']),/Potential credential/);
    await assert.rejects(cli(['wiki.source.add','--file','source-note.json','--bot','bot-missing']),/403/);
    for(const action of ['wiki.source.edit','wiki.source.delete'])await assert.rejects(cli([action,'--file','source-note.json']),/403/);
    writeFileSync(join(dir,'source-malformed.json'),'api_key=synthetic-secret-never-print');
    const malformed=await new Promise((resolve,reject)=>{const proc=spawn(process.execPath,['scripts/bot.mjs','wiki.source.add','--file','source-malformed.json'],{cwd:dir,windowsHide:true});let out='',err='';proc.stdout.on('data',c=>out+=c);proc.stderr.on('data',c=>err+=c);proc.on('error',reject);proc.on('exit',code=>resolve({code,out,err}));});
    assert.equal(malformed.code,1);assert.equal(malformed.out,'');assert.match(malformed.err,/Invalid payload JSON/);assert.ok(!malformed.err.includes('synthetic-secret'));assert.ok(!malformed.err.includes('api_key'));
    writeFileSync(join(dir,'create-bot.json'),JSON.stringify({name:'CLI-created bot',requestId:'cli-create-bot'}));
    const createdBot=await cli(['bot.create','--file','create-bot.json']);assert.equal(createdBot.result.id,'bot-7');
    assert.deepEqual(await cli(['bot.create','--file','create-bot.json']),createdBot);
    await assert.rejects(cli(['bot.create','--file','create-bot.json','--bot','bot-1']),/409|403/);
    const freshBot=await cli(['bot.get','--id',createdBot.result.id]);assert.equal(freshBot.bot.name,'CLI-created bot');
    await assert.rejects(cli(['sync','--workspace','demo']),/Only the live workspace/);
    writeFileSync(join(dir,'payload.json'),JSON.stringify({title:'CLI task',type:'solo',boss:'bot-0',description:'Long body'}));
    const compact=await cli(['task.publish','--file','payload.json']);assert.equal(compact.result.draft,undefined);assert.equal(compact.result.publishedVersion,1);assert.ok(compact.result.id);
    const task=await cli(['task.get','--id',compact.result.id]);assert.equal(task.task.draft.description,'Long body');
    const token=readFileSync(join(dir,'data/bot.key'),'utf8').trim();
    const write=async(action,payload)=>(await(await post('/api/command',{Authorization:`Bearer ${token}`},{action,payload})).json()).result;
    let current=await write('flow.submit',{id:task.task.id,expectedVersion:task.task.version,version:task.task.publishedVersion,flowRequestId:task.task.flowRequestId,nodes:[{id:'one',title:'First',description:'GRAPH_DETAIL_NOT_IN_SYNC',botId:'bot-0'}],edges:[]});
    current=await write('task.dispatch',{id:current.id,expectedVersion:current.version,enabled:true});current=await write('task.ack',{id:current.id,version:current.publishedVersion,dispatchId:current.dispatchId});
    const graphSync=await cli(['sync']);assert.equal(graphSync.tasks.find(t=>t.id===current.id).flowVersion,1);assert.ok(!JSON.stringify(graphSync).includes('GRAPH_DETAIL_NOT_IN_SYNC'));
    writeFileSync(join(dir,'node.json'),JSON.stringify({id:current.id,runId:current.runs[0].id,expectedVersion:current.version,nodeId:'one',status:'active',progress:25}));
    const updated=await cli(['node.update','--file','node.json']);assert.equal(updated.result.node.nodeId,'one');assert.equal(updated.result.run.progress,25);assert.equal(updated.result.run.subtasks,undefined);
    const full=await cli(['task.publish','--file','payload.json','--full']);assert.equal(full.result.draft.description,'Long body');
  });
});
