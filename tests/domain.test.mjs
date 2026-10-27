import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/domain/store.mjs";
import { DatabaseSync } from "node:sqlite";
import { stepDemo } from "./helpers/demo.mjs";

test('demo step handles retrospective and routine requests with preserved execution history',t=>{
  const store=memory(t);
  let archived=report(store,publish(store),{status:'done',progress:100});
  archived=store.command('task.archive',{id:archived.id,expectedVersion:archived.version}).result;
  const archivedRuns=structuredClone(archived.runs),request=archived.retrospectiveRequestId;
  const retrospective=stepDemo(store).result;
  assert.equal(retrospective.id,archived.id);assert.equal(retrospective.location,'library');
  assert.match(retrospective.retrospective.markdown,/가상 결과서/);assert.equal(retrospective.retrospective.requestId,request);
  assert.deepEqual(retrospective.runs,archivedRuns);
  assert.ok(store.read().inbox.find(e=>e.retrospectiveRequestId===request).acknowledgedAt);
  let routine=publish(store,{routine:true});routine=report(store,routine,{status:'done',progress:100,note:'Verified completion'});
  const completed=structuredClone(routine.runs[0]);const next=stepDemo(store).result;
  assert.equal(next.id,routine.id);assert.equal(next.runs.length,2);assert.deepEqual(next.runs[0],completed);
  assert.equal(next.runs[1].status,'waiting');assert.equal(next.runs[1].progress,0);
  assert.ok(store.read().inbox.find(e=>e.kind==='routine'&&e.runId===completed.id).acknowledgedAt);
});

test('category rename preserves dispatch and run snapshots while updating current metadata', t=>{
  const store=memory(t);const pending=dispatch(store,brief(store,{category:'Old'}));const running=publish(store,{category:'Old'});
  const history=structuredClone(store.read().history);
  store.command('category.update',{category:'Old',name:' New ',color:'sky',expectedRevision:store.read().revision});
  const s=store.read(),p=s.tasks.find(x=>x.id===pending.id),r=s.tasks.find(x=>x.id===running.id);
  assert.equal(p.draft.category,'New');assert.equal(p.published.category,'New');assert.equal(p.dispatchId,pending.dispatchId);assert.equal(p.publishedVersion,pending.publishedVersion);assert.equal(p.version,pending.version+1);
  assert.equal(r.runs[0].brief.category,'Old');assert.deepEqual(s.history.slice(1),history);accept(store,p);
  brief(store,{category:'Collision'});assert.throws(()=>store.command('category.update',{category:'New',name:'Collision',color:'sky',expectedRevision:store.read().revision}),e=>e.status===409);
});

test('retrospective requests cancel stale submissions and retain prior Markdown across rearchive', t=>{
  const store=memory(t);let task=report(store,publish(store),{status:'done',progress:100});
  task=store.command('task.archive',{id:task.id,expectedVersion:task.version}).result;
  const firstRequest=task.retrospectiveRequestId;
  const payload={id:task.id,expectedVersion:task.version,retrospectiveRequestId:firstRequest,markdown:'# Results\nVerified',requestId:'retro-write'};
  assert.throws(()=>store.command('task.retrospective',payload,worker),e=>e.status===403);
  task=store.command('task.retrospective',payload,main).result;
  assert.equal(task.retrospective.markdown,payload.markdown);assert.equal(task.retrospectiveRequestId,null);
  assert.equal(store.command('task.retrospective',payload,main).result.version,task.version);
  task=store.command('task.restore',{id:task.id,expectedVersion:task.version}).result;
  assert.equal(task.stage,'brief');
  task=accept(store,dispatch(store,task));
  task=report(store,task,{status:'done',progress:100});
  task=store.command('task.archive',{id:task.id,expectedVersion:task.version}).result;
  assert.notEqual(task.retrospectiveRequestId,firstRequest);assert.equal(task.retrospective.markdown,payload.markdown);
  assert.throws(()=>store.command('task.retrospective',{...payload,requestId:'stale',expectedVersion:task.version},main),e=>e.status===409);
  task=store.command('task.trash',{id:task.id,expectedVersion:task.version}).result;assert.equal(task.retrospectiveRequestId,null);
  task=store.command('task.restore',{id:task.id,expectedVersion:task.version}).result;assert.ok(task.retrospectiveRequestId);
});

test('routine completion requests next run once and freezes earlier run reports', t=>{
  const store=memory(t);let task=publish(store,{routine:true});task=report(store,task,{status:'done',progress:100});
  const oldRun=task.runs[0].id;assert.equal(store.read().inbox.filter(e=>e.kind==='routine'&&!e.cancelledAt).length,1);
  task=report(store,task,{status:'done',progress:100});assert.equal(store.read().inbox.filter(e=>e.kind==='routine'&&!e.cancelledAt).length,1);
  assert.throws(()=>store.command('run.create',{id:task.id,expectedVersion:task.version}),e=>e.status===403);
  task=store.command('run.create',{id:task.id,expectedVersion:task.version},worker).result;
  assert.equal(task.runs[1].status,'waiting');assert.equal(task.runs[1].progress,0);assert.ok(store.read().inbox.find(e=>e.kind==='routine').acknowledgedAt);
  assert.throws(()=>report(store,task,{runId:oldRun,status:'active',progress:1}),e=>e.status===409);
});

test('library migration queues a missing retrospective once',t=>{
  const dir=mkdtempSync(join(tmpdir(),'grokbot-retro-migration-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'db.sqlite');let store=createStore(path);
  let task=report(store,publish(store),{status:'done',progress:100});task=store.command('task.archive',{id:task.id,expectedVersion:task.version}).result;
  const s=store.read();delete s.tasks[0].retrospectiveRequestId;delete s.tasks[0].retrospective;s.inbox=s.inbox.filter(e=>e.kind!=='retrospective');store.close();
  const db=new DatabaseSync(path);db.prepare('UPDATE state SET json=? WHERE id=1').run(JSON.stringify(s));db.close();
  store=createStore(path);const id=store.read().tasks[0].retrospectiveRequestId;assert.ok(id);store.close();store=createStore(path);
  try {assert.equal(store.read().tasks[0].retrospectiveRequestId,id);assert.equal(store.read().inbox.filter(e=>e.kind==='retrospective').length,1);}finally{store.close();}
});

test('CLI preferences version instructions without executing tools', t => {
  const store=memory(t); assert.deepEqual(store.read().bots[1].cliUsage,{codex:'never',claudeCode:'never',other:'never'});
  const result=store.command('bot.cli',{id:'bot-1',expectedVersion:0,tool:'codex',usage:'active'}).result;
  assert.equal(result.instructionVersion,1);assert.equal(result.appliedVersion,0);assert.equal(result.cliUsage.codex,'active');assert.equal(store.read().inbox[0].kind,'instruction');
  assert.throws(()=>store.command('bot.cli',{id:'bot-1',expectedVersion:result.version,tool:'shell',usage:'active'}));
});

test('category colors validate revisions and support literal object keys', t => {
  const store=memory(t);brief(store,{category:'__proto__'});
  store.command('category.color',{category:'__proto__',color:'mint',expectedRevision:store.read().revision});
  assert.equal(store.read().categoryColors.__proto__,'mint');
  assert.throws(()=>store.command('category.color',{category:'__proto__',color:'red',expectedRevision:store.read().revision}));
  assert.throws(()=>store.command('category.color',{category:'__proto__',color:'sky',expectedRevision:0}),e=>e.status===409);
});

test('archive and trash restore original placement and freeze execution', t => {
  const store=memory(t);let task=publish(store,{routine:true});
  assert.throws(()=>store.command('task.archive',{id:task.id,expectedVersion:task.version}),e=>e.status===409);
  task=report(store,task,{status:'done',progress:100});
  task=store.command('task.archive',{id:task.id,expectedVersion:task.version}).result;
  assert.equal(task.location,'library');
  assert.throws(()=>report(store,task),e=>e.status===409);
  assert.throws(()=>store.command('run.create',{id:task.id,expectedVersion:task.version},main),e=>e.status===409);
  task=store.command('task.trash',{id:task.id,expectedVersion:task.version}).result;
  assert.equal(task.previousLocation,'library');
  assert.throws(()=>accept(store,task),e=>e.status===409);
  task=store.command('task.restore',{id:task.id,expectedVersion:task.version}).result;assert.equal(task.location,'library');
  task=store.command('task.restore',{id:task.id,expectedVersion:task.version}).result;assert.equal(task.location,'active');assert.equal(task.ready,false);
});

test('purge requires explicit count and revision and removes task replay and history', t => {
  const store=memory(t);let task=publish(store);
  task=report(store,task,{status:'done',progress:100,requestId:'last-report'});
  const payload={id:task.id,expectedVersion:task.version,requestId:'trash-record'};
  task=store.command('task.trash',payload).result;const revision=store.read().revision;
  assert.throws(()=>store.command('trash.empty',{expectedRevision:revision,confirm:true,count:2}),e=>e.status===409);
  assert.throws(()=>store.command('trash.empty',{expectedRevision:revision-1,confirm:true,count:1}),e=>e.status===409);
  store.command('trash.empty',{expectedRevision:revision,confirm:true,count:1});
  assert.equal(store.read().tasks.length,0);assert.ok(store.read().history.every(h=>h.targetId!==task.id));assert.ok(store.read().inbox.every(e=>e.targetId!==task.id));
  assert.throws(()=>store.command('task.trash',payload),e=>e.status===404);
});

test('activity is bounded, expires, and a stale stop cannot stop a newer session', t => {
  const store=memory(t);const task=publish(store);const history=store.read().history.length;
  const activity=(sessionId,active)=>store.command('bot.activity',{targetId:task.id,sessionId,active},worker);
  assert.throws(()=>store.command('bot.activity',{targetId:task.id,sessionId:'s',active:true}),e=>e.status===403);
  activity('first',true);activity('second',true);activity('first',false);
  const state=store.read();assert.equal(state.activities.length,1);assert.equal(state.activities[0].sessionId,'second');assert.equal(state.history.length,history);
  assert.ok(Date.parse(state.activities[0].expiresAt)>Date.now()+29000);
  activity('second',false);assert.equal(store.read().activities.length,0);
  assert.throws(()=>store.command('bot.activity',{targetId:'missing',sessionId:'s',active:true},worker),e=>e.status===404);
  activity('expiry',true);const future=Date.now()+31000;t.mock.method(Date,'now',()=>future);
  assert.equal(store.read().activities.length,0);
});

const main = { kind: "bot", id: "bot-0" };
const worker = { kind: "bot", id: "bot-1" };
function memory(t) {
  const store = createStore(":memory:");
  t.after(() => store.close());
  return store;
}
function brief(store, fields = {}) {
  return store.command("task.publish", {
    title: "Verified delivery",
    description: "Build and verify",
    type: "solo",
    boss: "bot-1",
    ...fields,
  }).result;
}
function dispatch(store, task, enabled = true) {
  return store.command('task.dispatch', { id: task.id, expectedVersion: task.version, enabled }).result;
}
function accept(store, task, extra = {}) {
  return store.command('task.ack', { id: task.id, version: task.publishedVersion, dispatchId: task.dispatchId, ...extra }, main).result;
}
function publish(store, fields = {}) {
  return accept(store, dispatch(store, brief(store, fields)));
}
function report(store, task, fields = {}, actor = worker) {
  return store.command(
    "task.report",
    {
      id: task.id,
      expectedVersion: task.version,
      runId: task.runs.at(-1).id,
      status: "active",
      progress: 40,
      ...fields,
    },
    actor,
  ).result;
}
function instruction(store, text) {
  const bot = store.read().bots[1];
  return store.command("instruction.publish", {
    id: bot.id,
    expectedVersion: bot.version,
    text,
  }).result;
}

test("initial production data has seven empty profiles and no fictional work", (t) => {
  const s = memory(t).read();
  assert.equal(s.bots.length, 7);
  assert.equal(new Set(s.bots.map((b) => b.id)).size, 7);
  assert.ok(s.bots.every((b) => b.instructions === "" && b.appliedAt === null));
  assert.deepEqual(s.tasks, []);
  assert.deepEqual(s.inbox, []);
});

test("draft instructions create no notification; publishing requires a matching version", (t) => {
  const store = memory(t);
  store.command("instruction.save", {
    id: "bot-1",
    expectedVersion: 0,
    text: "Draft",
  });
  assert.equal(store.read().inbox.length, 0);
  assert.throws(
    () =>
      store.command("instruction.publish", {
        id: "bot-1",
        expectedVersion: 0,
        text: "Stale",
      }),
    (e) => e.status === 409,
  );
  instruction(store, "Published");
  const s = store.read();
  assert.equal(s.bots[1].instructionVersion, 1);
  assert.equal(s.bots[1].appliedVersion, 0);
  assert.equal(
    s.inbox[0].message,
    "Hey Grokbot, your information has been updated!",
  );
});

test("old acknowledgements leave the newer instruction notification pending", (t) => {
  const store = memory(t);
  instruction(store, "First");
  instruction(store, "Second");
  store.command("instruction.ack", { id: "bot-1", version: 1 }, worker);
  const s = store.read();
  assert.equal(s.bots[1].appliedVersion, 1);
  assert.equal(s.inbox.find((e) => e.version === 2).acknowledgedAt, null);
  assert.ok(s.inbox.find((e) => e.version === 1).acknowledgedAt);
});

test("a late old acknowledgement preserves latest applied attribution", (t) => {
  const store = memory(t);
  instruction(store, "First");
  instruction(store, "Second");
  store.command("instruction.ack", { id: "bot-1", version: 2 }, worker);
  const before = store.read().bots[1];
  store.command("instruction.ack", {
    id: "bot-1",
    version: 1,
    reason: "Historical correction",
  });
  const after = store.read().bots[1];
  assert.equal(after.appliedVersion, 2);
  assert.equal(after.appliedAt, before.appliedAt);
  assert.equal(after.appliedSource, before.appliedSource);
});

test("manual acknowledgement requires correction reason and records attribution", (t) => {
  const store = memory(t);
  instruction(store, "First");
  assert.throws(
    () => store.command("instruction.ack", { id: "bot-1", version: 1 }),
    /reason/i,
  );
  store.command("instruction.ack", {
    id: "bot-1",
    version: 1,
    reason: "Verified separately",
  });
  const s = store.read();
  assert.equal(s.bots[1].appliedSource, "user");
  assert.equal(s.history[0].reason, "Verified separately");
});

test("unrelated bots cannot acknowledge instructions or main-bot task inbox", (t) => {
  const store = memory(t);
  instruction(store, "First");
  assert.throws(
    () =>
      store.command(
        "instruction.ack",
        { id: "bot-1", version: 1 },
        { kind: "bot", id: "bot-2" },
      ),
    (e) => e.status === 403,
  );
  const task = publish(store);
  assert.throws(
    () => store.command("task.ack", { id: task.id, version: 1 }, worker),
    (e) => e.status === 403,
  );
  store.command("task.ack", { id: task.id, version: 1 }, main);
  assert.equal(store.read().tasks[0].acceptedVersion, 1);
});

test("team selection excludes Boss and rejects duplicates and more than five members atomically", (t) => {
  const store = memory(t);
  for (const members of [
    ["bot-1"],
    ["bot-2", "bot-2"],
    ["bot-0", "bot-2", "bot-3", "bot-4", "bot-5", "bot-6"],
  ]) {
    assert.throws(
      () => publish(store, { type: "team", members }),
      /team members/i,
    );
  }
  assert.equal(store.read().tasks.length, 0);
  assert.equal(store.read().revision, 0);
  assert.equal(
    publish(store, {
      type: "team",
      members: ["bot-0", "bot-2", "bot-3", "bot-4", "bot-5"],
    }).published.members.length,
    5,
  );
});

test("request IDs replay exactly once and reject a changed payload", (t) => {
  const store = memory(t);
  const payload = {
    id: "bot-1",
    expectedVersion: 0,
    text: "One",
    requestId: "request-1",
  };
  const result = store.command("instruction.publish", payload);
  assert.deepEqual(store.command("instruction.publish", payload), result);
  assert.equal(store.read().history.length, 1);
  assert.equal(store.read().inbox.length, 1);
  assert.throws(
    () => store.command("instruction.publish", { ...payload, text: "Two" }),
    (e) => e.status === 409,
  );
});

test("stale report and unassigned actor do not alter persisted progress", (t) => {
  const store = memory(t);
  const task = publish(store);
  report(store, task);
  assert.throws(
    () => report(store, task, { progress: 60 }),
    (e) => e.status === 409,
  );
  const current = store.read().tasks[0];
  assert.throws(
    () => report(store, current, {}, { kind: "bot", id: "bot-2" }),
    (e) => e.status === 403,
  );
  assert.equal(store.read().tasks[0].runs[0].progress, 40);
});

test("subtasks aggregate progress and prevent contradictory direct parent reports", (t) => {
  const store = memory(t);
  let task = publish(store, { type: "team", members: ["bot-2"] });
  const upsert = (fields) => {
    task = store.command(
      "subtask.upsert",
      {
        id: task.id,
        expectedVersion: task.version,
        runId: task.runs[0].id,
        ...fields,
      },
      worker,
    ).result;
  };
  upsert({ title: "First", botId: "bot-1", status: "done", progress: 100 });
  upsert({ title: "Second", botId: "bot-2", status: "waiting", progress: 0 });
  assert.equal(task.runs[0].progress, 50);
  assert.equal(task.runs[0].status, "active");
  assert.throws(() => report(store, task), /subtasks/i);
  upsert({
    subtaskId: task.runs[0].subtasks[1].id,
    title: "Second",
    botId: "bot-2",
    status: "done",
    progress: 100,
  });
  assert.equal(task.runs[0].progress, 100);
  assert.equal(task.runs[0].status, "done");
});

test("invalid subtask owner rolls back the entire command", (t) => {
  const store = memory(t);
  const task = publish(store);
  const before = store.read();
  assert.throws(
    () =>
      store.command(
        "subtask.upsert",
        {
          id: task.id,
          expectedVersion: task.version,
          runId: task.runs[0].id,
          title: "Wrong owner",
          botId: "bot-2",
          status: "active",
          progress: 20,
        },
        worker,
      ),
    /owner/i,
  );
  assert.deepEqual(store.read(), before);
});

test("progress never stores active status alongside 100 percent after rounding", (t) => {
  const store = memory(t);
  const task = publish(store);
  try {
    report(store, task, { progress: 99.9 });
  } catch (e) {
    assert.equal(e.status, 400);
  }
  const run = store.read().tasks[0].runs[0];
  assert.ok(!(run.status === "active" && run.progress === 100));
});

test("routine runs retain previous completed history and start waiting", (t) => {
  const store = memory(t);
  let task = publish(store, { routine: true, schedule: "Daily" });
  assert.throws(
    () =>
      store.command(
        "run.create",
        { id: task.id, expectedVersion: task.version },
        main,
      ),
    /Complete/i,
  );
  task = report(store, task, {
    status: "done",
    progress: 100,
    note: "Delivered",
  });
  const completed = structuredClone(task.runs[0]);
  task = store.command(
    "run.create",
    { id: task.id, expectedVersion: task.version },
    main,
  ).result;
  assert.equal(task.runs.length, 2);
  assert.deepEqual(task.runs[0], completed);
  assert.equal(task.runs[1].status, "waiting");
  assert.equal(task.runs[1].progress, 0);
  assert.notEqual(task.runs[1].id, completed.id);
});

test("file-backed state survives close/reopen and demo reset stays isolated", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "grokbot-domain-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let production = createStore(join(dir, "production.sqlite"));
  publish(production);
  const saved = production.read();
  production.close();
  production = createStore(join(dir, "production.sqlite"));
  const demo = createStore(join(dir, "demo.sqlite"));
  try {
    assert.deepEqual(production.read(), saved);
    publish(demo, { title: "Fictional" });
    demo.reset();
    assert.equal(demo.read().tasks.length, 0);
    assert.deepEqual(production.read(), saved);
  } finally {
    production.close();
    demo.close();
  }
});

test("republishing keeps the active run snapshot until explicit adoption", (t) => {
  const store = memory(t);
  let task = publish(store);
  task = store.command("task.publish", {
    id: task.id,
    expectedVersion: task.version,
    ...task.published,
    title: "Revised delivery",
    boss: "bot-2",
  }).result;
  assert.equal(task.runs[0].brief.title, "Verified delivery");
  assert.equal(task.runs[0].instructionVersion, 1);
  task = report(store, task);
  assert.throws(
    () => report(store, task, {}, { kind: "bot", id: "bot-2" }),
    (e) => e.status === 403,
  );
  task = store.command(
    "run.adopt",
    { id: task.id, expectedVersion: task.version, runId: task.runs[0].id },
    main,
  ).result;
  assert.equal(task.runs[0].brief.title, "Revised delivery");
  assert.equal(task.runs[0].instructionVersion, 2);
  assert.throws(
    () => report(store, task),
    (e) => e.status === 403,
  );
  report(store, task, {}, { kind: "bot", id: "bot-2" });
});

test("completed non-routine run is immutable to adoption and next run needs a new publication", (t) => {
  const store = memory(t);
  let task = publish(store);
  task = report(store, task, { status: "done", progress: 100 });
  assert.throws(
    () =>
      store.command(
        "run.create",
        { id: task.id, expectedVersion: task.version },
        main,
      ),
    /new version/i,
  );
  assert.throws(
    () =>
      store.command(
        "run.adopt",
        { id: task.id, expectedVersion: task.version, runId: task.runs[0].id },
        main,
      ),
    /Completed/i,
  );
  const oldRun = structuredClone(task.runs[0]);
  task = store.command("task.publish", {
    id: task.id,
    expectedVersion: task.version,
    ...task.published,
    title: "Follow-up",
  }).result;
  task = store.command(
    "run.create",
    { id: task.id, expectedVersion: task.version },
    main,
  ).result;
  assert.deepEqual(task.runs[0], oldRun);
  assert.equal(task.runs[1].instructionVersion, 2);
  assert.equal(task.runs[1].brief.title, "Follow-up");
});

test("updating another subtask preserves unresolved blocker details", (t) => {
  const store = memory(t);
  let task = publish(store, { type: "team", members: ["bot-2"] });
  const update = (fields) => {
    task = store.command(
      "subtask.upsert",
      {
        id: task.id,
        expectedVersion: task.version,
        runId: task.runs[0].id,
        ...fields,
      },
      main,
    ).result;
  };
  update({
    title: "Blocked work",
    botId: "bot-1",
    status: "active",
    progress: 20,
    blocked: true,
    note: "Awaiting input",
  });
  const blockedId = task.runs[0].subtasks[0].id;
  update({
    title: "Independent work",
    botId: "bot-2",
    status: "done",
    progress: 100,
  });
  assert.equal(task.runs[0].blocked, true);
  assert.equal(task.runs[0].note, "Blocked work: Awaiting input");
  assert.equal(task.runs[0].subtasks[0].note, "Awaiting input");
  update({
    subtaskId: blockedId,
    title: "Blocked work",
    botId: "bot-1",
    status: "done",
    progress: 100,
    blocked: true,
    note: "Resolved",
  });
  assert.equal(task.runs[0].blocked, false);
  assert.equal(task.runs[0].note, "");
});

test("adoption rejects removing owners of existing subtasks atomically", (t) => {
  const store = memory(t);
  let task = publish(store, { type: "team", members: ["bot-2"] });
  task = store.command(
    "subtask.upsert",
    {
      id: task.id,
      expectedVersion: task.version,
      runId: task.runs[0].id,
      title: "Owned work",
      botId: "bot-2",
      status: "waiting",
      progress: 0,
    },
    main,
  ).result;
  task = store.command("task.publish", {
    id: task.id,
    expectedVersion: task.version,
    ...task.published,
    type: "solo",
  }).result;
  const before = store.read();
  assert.throws(
    () =>
      store.command(
        "run.adopt",
        { id: task.id, expectedVersion: task.version, runId: task.runs[0].id },
        main,
      ),
    /Reassign/i,
  );
  assert.deepEqual(store.read(), before);
});

test("almost completed subtasks cannot round an unfinished parent to 100 percent", (t) => {
  const store = memory(t);
  let task = publish(store);
  for (const [index, progress] of [100, 100, 99].entries()) {
    task = store.command(
      "subtask.upsert",
      {
        id: task.id,
        expectedVersion: task.version,
        runId: task.runs[0].id,
        title: `Part ${index}`,
        botId: "bot-1",
        status: progress === 100 ? "done" : "active",
        progress,
      },
      main,
    ).result;
  }
  assert.equal(task.runs[0].status, "active");
  assert.ok(task.runs[0].progress < 100);
});

test('adoption reassigns removed owners atomically and preserves subtask work', t => {
  const store = memory(t); let task = publish(store, { type: 'team', members: ['bot-2'] });
  task = store.command('subtask.upsert', { id: task.id, expectedVersion: task.version, runId: task.runs[0].id, title: 'Owned work', botId: 'bot-2', status: 'active', progress: 40, note: 'Evidence saved', blocked: true }, main).result;
  const subtask = structuredClone(task.runs[0].subtasks[0]);
  task = store.command('task.publish', { id: task.id, expectedVersion: task.version, ...task.published, type: 'solo', boss: 'bot-3' }).result;
  const before = store.read();
  assert.throws(() => store.command('run.adopt', { id: task.id, expectedVersion: task.version, runId: task.runs[0].id, reassign: { [subtask.id]: 'bot-6' } }, main), /reassign/i);
  assert.deepEqual(store.read(), before);
  task = store.command('run.adopt', { id: task.id, expectedVersion: task.version, runId: task.runs[0].id, reassign: { [subtask.id]: 'bot-3' } }, main).result;
  assert.deepEqual(task.runs[0].subtasks[0], { ...subtask, botId: 'bot-3' });
  assert.equal(task.runs[0].brief.boss, 'bot-3');
  assert.equal(task.runs[0].instructionVersion, 2);
});

test('brief publication and dispatch remain separate from execution until main bot acceptance', t => {
  const store = memory(t); let task = brief(store);
  assert.equal(task.stage, 'brief'); assert.equal(task.ready, false); assert.deepEqual(task.runs, []);
  assert.equal(store.read().inbox.filter(e=>e.kind==='task').length, 0);
  assert.throws(() => store.command('run.create', { id: task.id, expectedVersion: task.version }, main), e => e.status === 409);
  task = dispatch(store, task);
  assert.equal(task.stage, 'brief'); assert.equal(task.ready, true); assert.deepEqual(task.runs, []);
  assert.equal(store.read().inbox[0].dispatchId, task.dispatchId);
  const payload = { id: task.id, version: task.publishedVersion, dispatchId: task.dispatchId };
  assert.throws(() => store.command('task.ack', { ...payload, reason: 'Manual override' }), e => e.status === 403);
  assert.throws(() => store.command('task.ack', payload, worker), e => e.status === 403);
  task = accept(store, task, { requestId: 'initial-start' });
  assert.equal(task.stage, 'monitor'); assert.equal(task.ready, false);
  assert.equal(task.runs.length, 1); assert.equal(task.runs[0].status, 'active'); assert.equal(task.runs[0].progress, 0);
  store.command('task.ack', { ...payload, requestId: 'initial-start' }, main);
  assert.equal(store.read().tasks[0].runs.length, 1);
  assert.throws(() => dispatch(store, task, false), e => e.status === 409);
});

test('cancelled dispatch tokens cannot start tasks after OFF or a subsequent ON', t => {
  const store = memory(t); const pending = dispatch(store, brief(store));
  let task = dispatch(store, pending, false);
  assert.throws(() => accept(store, pending), e => e.status === 409);
  assert.ok(store.read().inbox[0].cancelledAt);
  task = dispatch(store, task);
  assert.notEqual(task.dispatchId, pending.dispatchId);
  assert.throws(() => accept(store, pending), e => e.status === 409);
  task = accept(store, task);
  assert.equal(task.runs.length, 1);
});

test('editing a pending brief cancels its start request and requires a fresh version snapshot', t => {
  const store = memory(t); const pending = dispatch(store, brief(store));
  let task = store.command('task.save', { id: pending.id, expectedVersion: pending.version, ...pending.draft, title: 'Changed after request' }).result;
  assert.equal(task.ready, false); assert.equal(task.dispatchId, null);
  assert.throws(() => accept(store, pending), e => e.status === 409);
  task = dispatch(store, task);
  assert.equal(task.published.title, 'Changed after request');
  assert.equal(task.publishedVersion, pending.publishedVersion + 1);
  assert.throws(() => accept(store, { ...task, publishedVersion: pending.publishedVersion }), e => e.status === 409);
  task = accept(store, task); assert.equal(task.runs[0].brief.title, 'Changed after request');
});

test('brief and monitoring stages are disjoint and completed routines stay in monitoring', t => {
  const store = memory(t); brief(store); dispatch(store, brief(store));
  let routine = publish(store, { routine: true }); routine = report(store, routine, { status: 'done', progress: 100 });
  const state = store.read();
  assert.equal(state.tasks.filter(x => x.stage === 'brief').length, 2);
  assert.equal(state.tasks.filter(x => x.stage === 'monitor').length, 1);
  assert.equal(routine.stage, 'monitor');
  routine = store.command('run.create', { id: routine.id, expectedVersion: routine.version }, main).result;
  assert.equal(routine.stage, 'monitor'); assert.equal(routine.runs.length, 2);
});

test('legacy migration retains accepted or actually reported zero-progress work', t => {
  const dir = mkdtempSync(join(tmpdir(), 'grokbot-migration-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'legacy.sqlite'); let store = createStore(path);
  const running = publish(store); const state = store.read(); store.close();
  const template = structuredClone(running); delete state.schemaVersion;
  state.tasks = ['unstarted', 'accepted', 'reported-zero', 'completed'].map((id, index) => {
    const task = structuredClone(template); task.id = id; delete task.stage; delete task.ready; delete task.dispatchId;
    task.acceptedVersion = index === 1 ? 1 : 0;
    task.runs[0].status = index === 3 ? 'done' : 'waiting'; task.runs[0].progress = index === 3 ? 100 : 0;
    task.runs[0].source = index === 2 ? 'bot' : null; return task;
  });
  const db = new DatabaseSync(path); db.prepare('UPDATE state SET json=? WHERE id=1').run(JSON.stringify(state)); db.close();
  store = createStore(path);
  try {
    const tasks = store.read().tasks;
    assert.equal(tasks[0].stage, 'brief'); assert.deepEqual(tasks[0].runs, []);
    for (const task of tasks.slice(1)) { assert.equal(task.stage, 'monitor'); assert.equal(task.runs.length, 1); }
    const migrated = store.read(); store.close(); store = createStore(path); assert.deepEqual(store.read(), migrated);
  } finally { store.close(); }
});

test('reset creates current schema so pending dispatch survives reopening', t => {
  const dir = mkdtempSync(join(tmpdir(), 'grokbot-reset-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'demo.sqlite'); let store = createStore(path); store.reset();
  const pending = dispatch(store, brief(store)); store.close(); store = createStore(path);
  try { assert.deepEqual(store.read().tasks[0], pending); assert.equal(store.read().schemaVersion, 2); }
  finally { store.close(); }
});

test('category names are trimmed and reused without duplicate suggestions', t => {
  const store = memory(t);
  const first = brief(store, { category: '  리서치  ' });
  brief(store, { category: '리서치' });
  brief(store, { category: '   ' });
  brief(store, { category: '*' });
  assert.equal(first.draft.category, '리서치');
  assert.equal(first.published.category, '리서치');
  assert.deepEqual(store.read().categories, ['리서치', '*']);
  const before = store.read();
  assert.throws(() => brief(store, { category: 'x'.repeat(101) }), /Invalid text/);
  assert.deepEqual(store.read(), before);
});

test('recategorizing a pending brief cancels dispatch and preserves reusable names', t => {
  const store = memory(t);
  const pending = dispatch(store, brief(store, { category: 'Research' }));
  let task = store.command('task.save', { id: pending.id, expectedVersion: pending.version, ...pending.draft, category: '  Writing ' }).result;
  assert.equal(task.ready, false); assert.equal(task.dispatchId, null);
  assert.throws(() => accept(store, pending), e => e.status === 409);
  assert.deepEqual(store.read().categories, ['Research', 'Writing']);
  task = accept(store, dispatch(store, task));
  assert.equal(task.stage, 'monitor'); assert.equal(task.runs[0].brief.category, 'Writing');
  assert.equal(task.runs[0].progress, 0);
});

test('categories persist independently per workspace and demo reset cannot erase live categories', t => {
  const dir = mkdtempSync(join(tmpdir(), 'grokbot-categories-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const livePath = join(dir, 'live.sqlite'); let live = createStore(livePath);
  const demo = createStore(join(dir, 'demo.sqlite'));
  try {
    let task = brief(live, { category: 'Persistent' });
    task = live.command('task.save', { id: task.id, expectedVersion: task.version, ...task.draft, category: '' }).result;
    brief(demo, { category: 'Fictional' });
    assert.deepEqual(live.read().categories, ['Persistent']);
    assert.deepEqual(demo.read().categories, ['Fictional']);
    live.close(); live = createStore(livePath);
    assert.deepEqual(live.read().categories, ['Persistent']);
    assert.equal(live.read().tasks[0].draft.category, '');
    demo.reset();
    assert.deepEqual(demo.read().categories, []);
    assert.deepEqual(live.read().categories, ['Persistent']);
  } finally { live.close(); demo.close(); }
});

test('demo checks all latest bot instructions before unrelated queued work',t=>{
  const store=memory(t);
  const task=store.command('task.publish',{title:'Pending flow',description:'demo',type:'solo',boss:'bot-0',members:[]}).result;
  for(const id of ['bot-0','bot-1','bot-2']){
    let b=store.read().bots.find(b=>b.id===id);
    b=store.command('bot.cli',{id,expectedVersion:b.version,tool:'codex',usage:'active'}).result;
    store.command('bot.cli',{id,expectedVersion:b.version,tool:'claudeCode',usage:'occasional'});
  }
  stepDemo(store);
  const state=store.read();
  for(const b of state.bots){assert.equal(b.appliedVersion,b.instructionVersion);if(b.instructionVersion){assert.ok(b.appliedAt);assert.equal(b.appliedSource,'bot');}}
  assert.equal(state.inbox.filter(e=>e.kind==='instruction'&&!e.acknowledgedAt&&!e.cancelledAt).length,0);
  assert.ok(state.inbox.find(e=>e.kind==='flow'&&e.targetId===task.id&&!e.acknowledgedAt));
  assert.equal(stepDemo(store).result.id,task.id);
});

test('library restore returns to briefs, retaining Markdown and runs until new dispatch',t=>{
  const store=memory(t);let task=report(store,publish(store,{routine:true}),{status:'done',progress:100});
  const runs=structuredClone(task.runs);
  task=store.command('task.archive',{id:task.id,expectedVersion:task.version}).result;
  task=store.command('task.retrospective',{id:task.id,expectedVersion:task.version,retrospectiveRequestId:task.retrospectiveRequestId,markdown:'# Preserved results'},main).result;
  task=store.command('task.restore',{id:task.id,expectedVersion:task.version}).result;
  assert.equal(task.stage,'brief');assert.equal(task.location,'active');assert.equal(task.ready,false);assert.equal(task.dispatchId,null);
  assert.deepEqual(task.runs,runs);assert.equal(task.retrospective.markdown,'# Preserved results');
  assert.equal(store.read().inbox.filter(e=>e.targetId===task.id&&e.kind==='routine'&&!e.cancelledAt&&!e.acknowledgedAt).length,0);
  assert.throws(()=>accept(store,task),e=>e.status===409);
  assert.throws(()=>store.command('run.create',{id:task.id,expectedVersion:task.version},main),e=>e.status===409);
  task=accept(store,dispatch(store,task));assert.equal(task.stage,'monitor');assert.equal(task.runs.length,2);assert.deepEqual(task.runs[0],runs[0]);assert.equal(task.runs[1].progress,0);
});
