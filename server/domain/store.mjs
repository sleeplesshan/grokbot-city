import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {ensureWiki,captureWikiSource,wikiCommand,validateWikiSourceAdd} from './wiki.mjs';

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status) => {
  throw new AppError(message, status);
};
const str = (v, max = 30000) =>
  typeof v === "string" && v.length <= max ? v : fail("Invalid text");
const required = (v) =>
  str(v, 300).trim() || fail("A title or name is required");
const now = () => new Date().toISOString();
function queueFlow(s,t,at=now()) {
  if(t.location!=='active'||!t.published||t.flowPlan?.version===t.publishedVersion||t.flowRequestId) return;
  t.flowRequestId=randomUUID();
  s.inbox.unshift({id:randomUUID(),kind:'flow',targetId:t.id,version:t.publishedVersion,flowRequestId:t.flowRequestId,message:'Prepare a node flow for this task brief.',recipient:'bot-0',createdAt:at,acknowledgedAt:null,source:null});
}
function validateFlow(p,brief,at,actor) {
  if(!Array.isArray(p.nodes)||!p.nodes.length||p.nodes.length>100||!Array.isArray(p.edges)||p.edges.length>400) fail('Flow requires 1–100 nodes and at most 400 edges');
  const ids=new Set(),edgeIds=new Set();
  const identifier=v=>{const id=str(v,100);if(!/^[A-Za-z0-9_-]+$/.test(id)) fail('Invalid flow identifier');return id;};
  const nodes=p.nodes.map(n=>{
    if(!n||typeof n!=='object') fail('Invalid node');
    const id=identifier(n.id);if(ids.has(id)) fail('Duplicate node ID');ids.add(id);
    if(![brief.boss,...brief.members].includes(n.botId)) fail('Node owner must belong to task');
    return {id,title:required(n.title),description:str(n.description||'',10000),botId:n.botId};
  });
  const edges=p.edges.map((e,i)=>{
    if(!e||typeof e!=='object') fail('Invalid edge');
    const id=e.id===undefined?`edge-${i+1}`:identifier(e.id);if(edgeIds.has(id)) fail('Duplicate edge ID');edgeIds.add(id);
    if(!ids.has(e.source)||!ids.has(e.target)||e.source===e.target) fail('Invalid edge reference');
    return {id,source:e.source,target:e.target,label:str(e.label||'',300)};
  });
  const degree=new Map(nodes.map(n=>[n.id,0])),out=new Map(nodes.map(n=>[n.id,[]]));
  for(const e of edges){degree.set(e.target,degree.get(e.target)+1);out.get(e.source).push(e.target);}
  const queue=[...ids].filter(id=>degree.get(id)===0);let visited=0;
  while(queue.length){const id=queue.shift();visited++;for(const next of out.get(id)){degree.set(next,degree.get(next)-1);if(degree.get(next)===0)queue.push(next);}}
  if(visited!==nodes.length) fail('Flow graph must be acyclic');
  return {version:p.version,nodes,edges,createdAt:at,createdBy:actor.id};
}
function attachFlow(run,plan,at) {
  if(!plan||plan.version!==run.instructionVersion) return;
  if(!run.flowPlan&&!run.subtasks.length&&(run.source||run.progress>0)) fail('Cannot map previously reported parent progress to new nodes',409);
  const ids=new Set(plan.nodes.map(n=>n.id));
  for(const sub of run.subtasks) if(!sub.nodeId||!ids.has(sub.nodeId)) {
    if(sub.source||sub.status!=='waiting'||sub.progress>0||sub.note||sub.blocked) fail('Cannot remove reported or unmapped legacy nodes',409);
  }
  run.subtasks=plan.nodes.map(n=>{
    const old=run.subtasks.find(sub=>sub.nodeId===n.id);
    return old?{...old,title:n.title,botId:n.botId}:{id:randomUUID(),nodeId:n.id,title:n.title,botId:n.botId,status:'waiting',progress:0,note:'',blocked:false,source:null,updatedAt:at};
  });
  run.flowPlan=structuredClone(plan);
}
function queueRetrospective(s,t,at=now()) {
  const id=randomUUID();t.retrospectiveRequestId=id;
  s.inbox.unshift({id:randomUUID(),kind:'retrospective',targetId:t.id,version:t.version,retrospectiveRequestId:id,message:'Write a retrospective for this archived task.',recipient:'bot-0',createdAt:at,acknowledgedAt:null,source:null});
}
function queueRoutine(s,t,at=now()) {
  const r=t.runs.at(-1);
  if(t.location!=='active'||t.stage!=='monitor'||!t.published?.routine||r?.status!=='done'||s.inbox.some(e=>e.kind==='routine'&&e.targetId===t.id&&e.runId===r.id&&!e.cancelledAt)) return;
  s.inbox.unshift({id:randomUUID(),kind:'routine',targetId:t.id,version:t.publishedVersion,runId:r.id,message:'Prepare the next routine run.',recipient:'bot-0',createdAt:at,acknowledgedAt:null,source:null});
}
export function initialState() {
  return {
    schemaVersion: 2,
    wiki: {sources:[],pages:[],jobs:[],log:[]},
    revision: 0,
    bots: Array.from({ length: 7 }, (_, i) => ({
      id: `bot-${i}`,
      name: i ? `그록봇 ${i}` : "메인봇",
      role: i ? "" : "Operations coordinator",
      avatar: "",
      instructions: "",
      draft: "",
      instructionVersion: 0,
      appliedVersion: 0,
      appliedAt: null,
      appliedSource: null,
      lastReportAt: null,
      version: 0,
      cliUsage: { codex: "never", claudeCode: "never", other: "never" },
    })),
    tasks: [],
    categories: [],
    categoryColors: {},
    activities: [],
    inbox: [],
    history: [],
  };
}
export function createStore(path) {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, payload TEXT NOT NULL, result TEXT NOT NULL);",
  );
  if (!db.prepare("SELECT id FROM state WHERE id=1").get())
    db.prepare("INSERT INTO state VALUES(1,?)").run(
      JSON.stringify(initialState()),
    );
  const read = () => {
    const state=JSON.parse(db.prepare("SELECT json FROM state WHERE id=1").get().json);
    if(state.activities) state.activities=state.activities.filter(a=>Date.parse(a.expiresAt)>Date.now());
    return state;
  };
  // Upgrade old published/empty runs without discarding genuine execution history.
  const existing = read();
  if (existing.schemaVersion !== 2) {
    for (const t of existing.tasks) {
      const started =
        t.acceptedVersion > 0 ||
        t.runs.some(
          (r) => r.source || r.subtasks.length || r.status !== "waiting",
        );
      t.stage = started ? "monitor" : "brief";
      t.ready = false;
      t.dispatchId = null;
      if (!started) t.runs = [];
      for (const e of existing.inbox)
        if (
          e.kind === "task" &&
          e.targetId === t.id &&
          !e.acknowledgedAt &&
          !started
        )
          e.cancelledAt = now();
    }
    existing.schemaVersion = 2;
    db.prepare("UPDATE state SET json=? WHERE id=1").run(
      JSON.stringify(existing),
    );
  }
  const upgraded = read();
  const needsWikiMigration=!upgraded.wiki;ensureWiki(upgraded);
  upgraded.categoryColors ||= {};
  upgraded.activities ||= [];
  for (const b of upgraded.bots) b.cliUsage ||= { codex: "never", claudeCode: "never", other: "never" };
  for (const t of upgraded.tasks) {
    if(needsWikiMigration&&t.location==='library') {captureWikiSource(upgraded,t,'brief');captureWikiSource(upgraded,t,'retrospective');}
    t.location ||= "active"; t.previousLocation ??= null;t.retrospective ??= null;t.retrospectiveRequestId ??= null;
    t.flowPlan ??= null;t.flowRequestId ??= null;for(const r of t.runs) r.flowPlan ??= null;
    queueFlow(upgraded,t);
    if(t.location==='library'&&!t.retrospective&&!t.retrospectiveRequestId) queueRetrospective(upgraded,t);
    queueRoutine(upgraded,t);
  }
  db.prepare("UPDATE state SET json=? WHERE id=1").run(JSON.stringify(upgraded));
  function command(action, p = {}, actor = { kind: "user", id: "owner" }) {
    db.exec("BEGIN IMMEDIATE");
    try {
      if(action==='wiki.source.add')validateWikiSourceAdd(read(),p,actor);
      if(/^wiki\.source\.(?:edit|update|delete|remove|purge)$/.test(action))fail('Raw sources are immutable',403);
      const fingerprint = JSON.stringify({ action, p, actor });
      if (p.requestId) {
        const prev = db
          .prepare("SELECT * FROM requests WHERE id=?")
          .get(str(p.requestId, 150));
        if (prev) {
          if (prev.payload !== fingerprint)
            fail("Request ID reused with different payload", 409);
          db.exec("COMMIT");
          return JSON.parse(prev.result);
        }
      }
      const s = read(),
        at = now();
      const bot = (id) =>
        s.bots.find((b) => b.id === id) || fail("Bot not found", 404);
      const task = (id) => {
        const t = s.tasks.find((t) => t.id === id) || fail("Task not found", 404);
        if (t.location !== "active" && !["task.restore", "task.trash", "task.retrospective"].includes(action)) fail("Restore this task before modifying it", 409);
        return t;
      };
      const userOnly = () => { if(actor.kind !== "user") fail("User action required",403); };
      const revisionCheck = () => { if(p.expectedRevision !== s.revision) fail("Workspace revision conflict",409); };
      const check = (x) => {
        if (
          !Number.isInteger(p.expectedVersion) ||
          p.expectedVersion !== x.version
        )
          fail("Version conflict: reload and retry", 409);
      };
      const note = () => {
        if (actor.kind === "user" && !str(p.reason || "", 1000).trim())
          fail("A reason is required for manual corrections");
      };
      const event = (kind, id, version, message) =>
        s.inbox.unshift({
          id: randomUUID(),
          kind,
          targetId: id,
          version,
          message,
          recipient: kind === "instruction" ? id : "bot-0",
          createdAt: at,
          acknowledgedAt: null,
          source: null,
        });
      let result;
      if(action.startsWith('wiki.')) result=wikiCommand(s,action,p,actor);
      else switch (action) {
        case 'flow.submit': {
          const t=task(p.id);check(t);
          if(actor.kind!=='bot'||![t.published?.boss,'bot-0'].includes(actor.id)) fail('Only main bot or Boss can submit flow',403);
          if(!t.flowRequestId||p.flowRequestId!==t.flowRequestId||p.version!==t.publishedVersion) fail('Flow request cancelled or superseded',409);
          const request=s.inbox.find(e=>e.kind==='flow'&&e.targetId===t.id&&e.flowRequestId===p.flowRequestId&&!e.cancelledAt&&!e.acknowledgedAt);
          if(!request) fail('Flow request is no longer pending',409);
          t.flowPlan=validateFlow(p,t.published,at,actor);t.flowRequestId=null;t.version++;request.acknowledgedAt=at;request.source='bot';result=t;break;
        }
        case "category.update": {
          userOnly();revisionCheck();const category=str(p.category,100).trim(),name=str(p.name,100).trim();
          if(category ? !s.categories.includes(category) : name!=='') fail('Invalid category');
          if(category&&!name) fail('Category name is required');
          if(category!==name&&s.categories.includes(name)) fail('Category already exists',409);
          if(!['mint','rose','lavender','sky','peach','lemon','neutral'].includes(p.color)) fail('Invalid category color');
          if(category!==name) {
            s.categories=s.categories.map(c=>c===category?name:c);
            for(const t of s.tasks) {
              let changed=false;
              for(const field of ['draft','published']) if(t[field]?.category===category) {t[field].category=name;changed=true;}
              if(changed) t.version++;
            }
            delete s.categoryColors[category];
          }
          Object.defineProperty(s.categoryColors,name,{value:p.color,enumerable:true,configurable:true,writable:true});
          result={id:name,category:name,color:p.color};break;
        }
        case "task.retrospective": {
          if(actor.kind!=='bot'||actor.id!=='bot-0') fail('Only main bot can submit retrospectives',403);
          const t=task(p.id);check(t);
          if(t.location!=='library'||!t.retrospectiveRequestId||p.retrospectiveRequestId!==t.retrospectiveRequestId) fail('Retrospective request cancelled or superseded',409);
          const markdown=str(p.markdown,100000).trim();if(!markdown) fail('Retrospective cannot be empty');
          const request=s.inbox.find(e=>e.kind==='retrospective'&&e.targetId===t.id&&e.retrospectiveRequestId===p.retrospectiveRequestId&&!e.cancelledAt&&!e.acknowledgedAt);
          if(!request) fail('Retrospective request is no longer pending',409);
          t.retrospective={markdown,updatedAt:at,botId:actor.id,requestId:p.retrospectiveRequestId};t.retrospectiveRequestId=null;t.version++;
          request.acknowledgedAt=at;request.source='bot';result=t;break;
        }
        case "category.color": {
          userOnly(); revisionCheck();
          const category = str(p.category,100).trim();
          if(category && !s.categories.includes(category)) fail("Category not found",404);
          if(!["mint","rose","lavender","sky","peach","lemon","neutral"].includes(p.color)) fail("Invalid category color");
          Object.defineProperty(s.categoryColors,category,{value:p.color,enumerable:true,configurable:true,writable:true});
          result={id:category,color:p.color};break;
        }
        case "bot.cliAll": {
          userOnly();revisionCheck();const main=bot(p.id);
          if(main.id!=="bot-0") fail("Only the main bot controls shared CLI preferences",403);
          if(typeof p.enabled!=="boolean") fail("enabled must be boolean");
          if(!!main.cliApplyAll!==p.enabled){main.cliApplyAll=p.enabled;main.version++;}
          if(p.enabled) for(const b of s.bots){
            if(["codex","claudeCode","other"].some(tool=>b.cliUsage[tool]!==main.cliUsage[tool])){
              b.cliUsage={...main.cliUsage};b.instructionVersion++;b.version++;
              event("instruction",b.id,b.instructionVersion,"Hey Grokbot, your information has been updated!");
            }
          }
          result=main;break;
        }
        case "bot.cli": {
          userOnly();const b=bot(p.id);check(b);
          if(!["codex","claudeCode","other"].includes(p.tool)||!["active","occasional","never"].includes(p.usage)) fail("Invalid CLI preference");
          const shared=!!bot("bot-0").cliApplyAll;
          if(shared&&b.id!=="bot-0") fail("CLI preferences are managed by the main bot",409);
          for(const target of shared?s.bots:[b]) if(target.cliUsage[p.tool]!==p.usage){
            target.cliUsage[p.tool]=p.usage;target.instructionVersion++;target.version++;
            event("instruction",target.id,target.instructionVersion,"Hey Grokbot, your information has been updated!");
          }
          result=b;break;
        }
        case "bot.activity": {
          if(actor.kind!=="bot") fail("Bot action required",403);bot(actor.id);
          const sessionId=required(p.sessionId),targetId=required(p.targetId);
          if(typeof p.active!=="boolean") fail("active must be boolean");
          const profile=s.bots.find(b=>b.id===targetId);
          if(profile) { if(actor.id!==targetId&&actor.id!=="bot-0") fail("Unassigned activity target",403); }
          else {
            const owner=s.tasks.find(t=>t.id===targetId||t.runs.some(r=>r.subtasks.some(sub=>sub.id===targetId)));
            if(!owner) fail("Activity target not found",404);
            if(owner.location!=="active") fail("Restore this task before activity",409);
            const run=owner.runs.find(r=>r.subtasks.some(sub=>sub.id===targetId))||owner.runs.at(-1);
            const brief=run?.brief||owner.published||owner.draft;
            if(![brief.boss,...brief.members,"bot-0"].includes(actor.id)) fail("Unassigned activity target",403);
          }
          s.activities=s.activities.filter(a=>Date.parse(a.expiresAt)>Date.now());
          const current=s.activities.find(a=>a.botId===actor.id);
          if(p.active) {
            s.activities=s.activities.filter(a=>a.botId!==actor.id);
            result={botId:actor.id,targetId,sessionId,expiresAt:new Date(Date.now()+30000).toISOString()};s.activities.push(result);
          } else {
            if(current?.sessionId===sessionId&&current.targetId===targetId) s.activities=s.activities.filter(a=>a.botId!==actor.id);
            result={botId:actor.id,targetId,sessionId,active:false};
          }
          break;
        }
        case "task.archive": case "task.trash": case "task.restore": {
          userOnly();const t=task(p.id);check(t);
          if(action==="task.restore") {
            if(t.location==="active") fail("Task is already active",409);
            if(t.location==="library") t.stage="brief";
            t.location=t.location==="trash"?(t.previousLocation||"active"):"active";t.previousLocation=null;
          } else {
            if(t.stage!=="monitor"||!t.runs.length||t.runs.some(r=>r.status!=="done")) fail("Only completed tasks may be archived or trashed",409);
            if(t.location==="trash") fail("Task is already in trash",409);
            t.previousLocation=t.location;t.location=action==="task.archive"?"library":"trash";
          }
          t.ready=false;t.dispatchId=null;t.version++;
          const targets=new Set([t.id,...t.runs.flatMap(r=>r.subtasks.map(sub=>sub.id))]);
          s.activities=s.activities.filter(a=>!targets.has(a.targetId));
          for(const e of s.inbox) if(['task','routine','retrospective','flow'].includes(e.kind)&&e.targetId===t.id&&!e.acknowledgedAt) e.cancelledAt=at;
          t.flowRequestId=null;
          t.retrospectiveRequestId=null;
          if(t.location==='library') queueRetrospective(s,t,at);
          if(t.location==='active') {queueRoutine(s,t,at);queueFlow(s,t,at);}
          result=t;break;
        }
        case "trash.empty": {
          userOnly();revisionCheck();const ids=new Set(s.tasks.filter(t=>t.location==="trash").map(t=>t.id));
          if(p.confirm!==true||p.count!==ids.size) fail("Confirm the exact number of trashed tasks",409);
          const targets=new Set(s.tasks.filter(t=>ids.has(t.id)).flatMap(t=>[t.id,...t.runs.flatMap(r=>r.subtasks.map(sub=>sub.id))]));
          s.activities=s.activities.filter(a=>!targets.has(a.targetId));
          s.tasks=s.tasks.filter(t=>!ids.has(t.id));s.inbox=s.inbox.filter(e=>!ids.has(e.targetId));s.history=s.history.filter(h=>!ids.has(h.targetId));
          for(const row of db.prepare("SELECT id,payload,result FROM requests").all()) {
            const input=JSON.parse(row.payload),output=JSON.parse(row.result);
            if(ids.has(input.p?.id)||targets.has(input.p?.targetId)||ids.has(output.result?.id)) db.prepare("DELETE FROM requests WHERE id=?").run(row.id);
          }
          result={id:"trash",count:ids.size};break;
        }
        case "bot.create": {
          if(actor.kind!=="bot"||actor.id!=="bot-0") fail("Only the main bot may create bots",403);
          if(!str(p.requestId,150).trim()) fail("requestId is required");
          if('id' in p) fail("Bot IDs are allocated by the server");
          const name=required(p.name),role=p.role===undefined?'':str(p.role,3000),avatar=p.avatar===undefined?'':str(p.avatar,2048);
          if(avatar&&(!/^\/assets\/[\w./-]+$/.test(avatar)||avatar.includes('..'))) fail("Avatar must be a local /assets/ path");
          const suffix=s.bots.reduce((max,b)=>/^bot-\d+$/.test(b.id)?Math.max(max,Number(b.id.slice(4))):max,0)+1;
          if(!Number.isSafeInteger(suffix)) fail("Bot identifier range exhausted",409);
          const main=bot('bot-0');
          const b={id:`bot-${suffix}`,name,role,avatar,instructions:'',draft:'',instructionVersion:0,appliedVersion:0,appliedAt:null,appliedSource:null,lastReportAt:null,version:0,cliUsage:main.cliApplyAll?{...main.cliUsage}:{codex:'never',claudeCode:'never',other:'never'}};
          s.bots.push(b);
          if(Object.values(b.cliUsage).some(value=>value!=='never')) {
            b.instructionVersion=1;
            event('instruction',b.id,1,'Hey Grokbot, your information has been updated!');
          }
          result=b;break;
        }
        case "bot.update": {
          const b = bot(p.id);
          check(b);
          for (const k of ["name", "role", "avatar"])
            if (k in p)
              b[k] =
                k === "name"
                  ? required(p[k])
                  : str(p[k], k === "avatar" ? 2048 : 3000);
          if (
            b.avatar &&
            (!/^\/assets\/[\w./-]+$/.test(b.avatar) || b.avatar.includes(".."))
          )
            fail("Avatar must be a local /assets/ path");
          b.version++;
          result = b;
          break;
        }
        case "instruction.save":
        case "instruction.publish": {
          const b = bot(p.id);
          check(b);
          b.draft = str(p.text);
          if (action.endsWith("publish")) {
            if (!b.draft.trim()) fail("Instructions cannot be empty");
            b.instructions = b.draft;
            b.instructionVersion++;
            event(
              "instruction",
              b.id,
              b.instructionVersion,
              "Hey Grokbot, your information has been updated!",
            );
          }
          b.version++;
          result = b;
          break;
        }
        case "instruction.ack": {
          const b = bot(p.id);
          if (actor.kind === "bot" && actor.id !== b.id && actor.id !== "bot-0")
            fail("Bot cannot acknowledge another bot", 403);
          if (
            !Number.isInteger(p.version) ||
            p.version < 1 ||
            p.version > b.instructionVersion
          )
            fail("Unknown instruction version");
          note();
          if (p.version > b.appliedVersion) {
            b.appliedVersion = p.version;
            b.appliedAt = at;
            b.appliedSource = actor.kind;
          }
          b.version++;
          for (const e of s.inbox)
            if (
              e.kind === "instruction" &&
              e.targetId === b.id &&
              e.version <= p.version &&
              !e.acknowledgedAt
            ) {
              e.acknowledgedAt = at;
              e.source = actor.kind;
            }
          result = b;
          break;
        }
        case "task.save":
        case "task.publish": {
          let t = p.id ? task(p.id) : null;
          if (t) check(t);
          if (!["team", "solo"].includes(p.type)) fail("Invalid task type");
          const type = p.type === "team" ? "team" : "solo",
            boss = bot(p.boss).id,
            members = type === "team" ? p.members : [];
          if (
            !Array.isArray(members) ||
            members.length > 5 ||
            (type === "team" && members.length < 1) ||
            new Set(members).size !== members.length ||
            members.includes(boss)
          )
            fail("Choose 1–5 unique team members, excluding Boss");
          members.forEach(bot);
          const fields = {
            title: required(p.title),
            description: str(p.description || ""),
            criteria: str(p.criteria || ""),
            type,
            boss,
            members,
            routine: !!p.routine,
            schedule: str(p.schedule || "", 1000),
            category: str(p.category || "", 100).trim(),
          };
          s.categories ||= [];
          if (fields.category && !s.categories.includes(fields.category))
            s.categories.push(fields.category);
          if (!t) {
            t = {
              id: randomUUID(),
              version: 0,
              publishedVersion: 0,
              acceptedVersion: 0,
              stage: "brief",
              location: "active",
              previousLocation: null,
              retrospective: null,
              retrospectiveRequestId: null,
              flowPlan: null,
              flowRequestId: null,
              ready: false,
              dispatchId: null,
              draft: fields,
              published: null,
              runs: [],
              createdAt: at,
            };
            s.tasks.unshift(t);
          } else t.draft = fields;
          if (t.stage === "brief" && t.ready) {
            t.ready = false;
            t.dispatchId = null;
            for (const e of s.inbox)
              if (e.kind === "task" && e.targetId === t.id && !e.acknowledgedAt)
                e.cancelledAt = at;
          }
          t.version++;
          if (action === "task.publish") {
            t.publishedVersion++;
            t.published = structuredClone(fields);
            for(const e of s.inbox) if(e.kind==='flow'&&e.targetId===t.id&&!e.acknowledgedAt) e.cancelledAt=at;
            t.flowRequestId=null;queueFlow(s,t,at);
            if(!t.published.routine) {
              for(const e of s.inbox) if(e.kind==='routine'&&e.targetId===t.id&&!e.acknowledgedAt) e.cancelledAt=at;
            } else queueRoutine(s,t,at);
            if (t.stage === "monitor")
              event(
                "task",
                t.id,
                t.publishedVersion,
                "Hey Grokbot, your task has been updated!",
              );
          }
          result = t;
          break;
        }
        case "task.dispatch": {
          const t = task(p.id);
          check(t);
          if (t.stage !== "brief")
            fail("This task is already in monitoring", 409);
          if (typeof p.enabled !== "boolean") fail("enabled must be boolean");
          for (const e of s.inbox)
            if (e.kind === "task" && e.targetId === t.id && !e.acknowledgedAt)
              e.cancelledAt = at;
          t.ready = p.enabled;
          t.dispatchId = null;
          if (t.ready) {
            if (
              !t.published ||
              JSON.stringify(t.draft) !== JSON.stringify(t.published)
            ) {
              t.published = structuredClone(t.draft);
              t.publishedVersion++;
              for(const e of s.inbox) if(e.kind==='flow'&&e.targetId===t.id&&!e.acknowledgedAt) e.cancelledAt=at;
              t.flowRequestId=null;queueFlow(s,t,at);
            }
            t.dispatchId = randomUUID();
            event(
              "task",
              t.id,
              t.publishedVersion,
              "Hey Grokbot, your task is ready to start!",
            );
            s.inbox[0].dispatchId = t.dispatchId;
          }
          t.version++;
          result = t;
          break;
        }
        case "task.ack": {
          const t = task(p.id);
          if (
            !Number.isInteger(p.version) ||
            p.version < 1 ||
            p.version > t.publishedVersion
          )
            fail("Unknown task version");
          if (actor.kind !== "bot" || actor.id !== "bot-0")
            fail("Main bot receives task updates", 403);
          if (t.stage === "brief") {
            if (
              !t.ready ||
              p.dispatchId !== t.dispatchId ||
              p.version !== t.publishedVersion
            )
              fail(
                "Start request cancelled or superseded; read inbox again",
                409,
              );
            t.stage = "monitor";
            t.ready = false;
            const run = newRun(t.publishedVersion, at, t.published);
            attachFlow(run,t.flowPlan,at);
            run.status = "active";
            t.runs.push(run);
          }
          t.acceptedVersion = Math.max(t.acceptedVersion, p.version);
          t.version++;
          for (const e of s.inbox)
            if (
              e.kind === "task" &&
              e.targetId === t.id &&
              e.version <= p.version &&
              !e.acknowledgedAt &&
              !e.cancelledAt
            ) {
              e.acknowledgedAt = at;
              e.source = actor.kind;
            }
          result = t;
          break;
        }
        case "run.create": {
          const t = task(p.id);
          check(t);
          if (t.stage !== "monitor")
            fail("Main bot must accept the start request first", 409);
          if (!t.published) fail("Publish first");
          if(t.published.routine&&actor.kind!=='bot') fail('Only main bot or Boss can create routine runs',403);
          if (
            actor.kind === "bot" &&
            ![t.published.boss, "bot-0"].includes(actor.id)
          )
            fail("Only main bot or Boss can create a run", 403);
          if (
            !t.published.routine &&
            t.runs.at(-1)?.instructionVersion === t.publishedVersion
          )
            fail(
              "Publish a new version before starting another non-routine run",
            );
          if (t.runs.some((r) => r.status !== "done"))
            fail("Complete the current routine run first");
          const previousRun=t.runs.at(-1);
          for(const e of s.inbox) if(e.kind==='routine'&&e.targetId===t.id&&e.runId===previousRun?.id&&!e.cancelledAt&&!e.acknowledgedAt) {e.acknowledgedAt=at;e.source=actor.kind;}
          const nextRun=newRun(t.publishedVersion,at,t.published);attachFlow(nextRun,t.flowPlan,at);t.runs.push(nextRun);
          t.version++;
          result = t;
          break;
        }
        case "run.adopt": {
          const t = task(p.id);
          check(t);
          const r =
            t.runs.find((x) => x.id === p.runId) || fail("Run not found", 404);
          if (r.status === "done")
            fail("Completed runs retain their original instructions");
          if (
            actor.kind === "bot" &&
            actor.id !== "bot-0" &&
            actor.id !== r.brief.boss
          )
            fail("Only main bot or Boss can adopt revisions", 403);
          note();
          const nextPlan=t.flowPlan?.version===t.publishedVersion?t.flowPlan:null;
          if(r.flowPlan&&!nextPlan) fail('Submit the current flow before adopting new instructions',409);
          if(nextPlan) {
            const oldVersion=r.instructionVersion;r.instructionVersion=t.publishedVersion;
            attachFlow(r,nextPlan,at);
            r.instructionVersion=oldVersion;
          }
          for (const sub of r.subtasks) {
            if (
              ![t.published.boss, ...t.published.members].includes(sub.botId)
            ) {
              const owner = p.reassign?.[sub.id];
              if (![t.published.boss, ...t.published.members].includes(owner))
                fail("Provide reassign mapping for removed subtask owners");
              sub.botId = owner;
            }
          }
          r.brief = structuredClone(t.published);
          r.instructionVersion = t.publishedVersion;
          if(nextPlan&&r.subtasks.some(x=>x.source)) {
            r.status=r.subtasks.every(x=>x.status==='done')?'done':r.subtasks.every(x=>x.status==='waiting')?'waiting':'active';
            r.progress=Math.min(r.status==='done'?100:99,Math.round(r.subtasks.reduce((n,x)=>n+x.progress,0)/r.subtasks.length));
            r.blocked=r.subtasks.some(x=>x.blocked&&x.status!=='done');r.note=r.subtasks.filter(x=>x.blocked&&x.status!=='done').map(x=>x.title+': '+x.note).join('\n');
          }
          t.version++;
          result = t;
          break;
        }
        case "task.report":
        case "node.update":
        case "subtask.upsert": {
          const t = task(p.id);
          check(t);
          const r =
            t.runs.find((r) => r.id === p.runId) || fail("Run not found", 404);
          if(r.id!==t.runs.at(-1)?.id) fail('Older runs cannot be changed after a newer run exists',409);
          if (!t.published) fail("Publish task first");
          if (
            actor.kind === "bot" &&
            ![r.brief.boss, ...r.brief.members, "bot-0"].includes(actor.id)
          )
            fail("Bot is not assigned to this task", 403);
          note();
          if(action==='node.update') {
            if(!r.flowPlan) fail('Run has no node flow',409);
            const sub=r.subtasks.find(x=>x.nodeId===p.nodeId)||fail('Node not found',404);
            p={...p,subtaskId:sub.id,title:sub.title,botId:sub.botId,progress:p.progress??(p.status==='done'?100:0),note:p.note??sub.note,blocked:p.blocked??sub.blocked};
          }
          if (action === "subtask.upsert"||action==='node.update') {
            let sub = r.subtasks.find((x) => x.id === p.subtaskId);
            if(r.flowPlan&&(!sub||p.title!==sub.title||p.botId!==sub.botId)) fail('Use node.update for the existing flow nodes',409);
            if (p.subtaskId && !sub) fail("Subtask not found", 404);
            if (!sub) {
              sub = { id: randomUUID() };
              r.subtasks.push(sub);
            }
            sub.title = required(p.title);
            sub.botId = bot(p.botId).id;
            if (![r.brief.boss, ...r.brief.members].includes(sub.botId))
              fail("Subtask owner must belong to the task");
            Object.assign(sub, progress(p), {
              updatedAt: at,
              note: str(p.note || "", 3000),
              blocked: !!p.blocked,
              source: actor.kind,
              reportedBy: actor.id,
            });
          } else {
            if (r.subtasks.length)
              fail("Report progress on subtasks when subtasks exist");
            Object.assign(r, progress(p));
          }
          if (r.subtasks.length) {
            r.progress = Math.round(
              r.subtasks.reduce((n, x) => n + x.progress, 0) /
                r.subtasks.length,
            );
            r.status = r.subtasks.every((x) => x.status === "done")
              ? "done"
              : r.subtasks.every((x) => x.status === "waiting")
                ? "waiting"
                : "active";
            if (r.status !== "done") r.progress = Math.min(r.progress, 99);
          }
          if (!r.subtasks.length) {
            r.note = str(p.note || "", 3000);
            r.blocked = !!p.blocked;
          } else {
            r.blocked = r.subtasks.some(
              (x) => x.blocked && x.status !== "done",
            );
            r.note = r.subtasks
              .filter((x) => x.blocked && x.status !== "done")
              .map((x) => x.title + ": " + x.note)
              .join("\n");
          }
          r.updatedAt = at;
          r.source = actor.kind;
          r.reportedBy = actor.id;
          t.version++;
          if(r.status==='done') queueRoutine(s,t,at);
          else for(const e of s.inbox) if(e.kind==='routine'&&e.targetId===t.id&&e.runId===r.id&&!e.acknowledgedAt) e.cancelledAt=at;
          result = t;
          break;
        }
        default:
          fail("Unknown action", 404);
      }
      if(action==='task.archive') captureWikiSource(s,result,'brief');
      if(action==='task.retrospective') captureWikiSource(s,result,'retrospective');
      if (actor.kind === "bot") bot(actor.id).lastReportAt = at;
      s.revision++;
      if(action!=="bot.activity") s.history.unshift({
        id: randomUUID(),
        action,
        targetId: result.id,
        actor,
        reason: p.reason || "",
        at,
        snapshot: structuredClone(result),
      });
      db.prepare("UPDATE state SET json=? WHERE id=1").run(JSON.stringify(s));
      const output = { result, revision: s.revision };
      if (p.requestId)
        db.prepare("INSERT INTO requests VALUES(?,?,?)").run(
          p.requestId,
          fingerprint,
          JSON.stringify(output),
        );
      db.exec("COMMIT");
      return output;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  function reset() {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE state SET json=? WHERE id=1").run(
        JSON.stringify(initialState()),
      );
      db.exec("DELETE FROM requests;COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return {
    read,
    command,
    reset,
    close: () => db.close(),
    backup: (dest) => db.exec(`VACUUM INTO '${dest.replaceAll("'", "''")}'`),
  };
}
function newRun(version, at, brief) {
  return {
    brief: structuredClone(brief),
    id: randomUUID(),
    instructionVersion: version,
    status: "waiting",
    progress: 0,
    subtasks: [],
    note: "",
    blocked: false,
    createdAt: at,
    updatedAt: at,
    source: null,
    flowPlan: null,
  };
}
function progress(p) {
  if (!["waiting", "active", "done"].includes(p.status)) fail("Invalid status");
  const value = Number(p.progress);
  if (!Number.isFinite(value) || value < 0 || value > 100)
    fail("Progress must be between 0 and 100");
  if (p.status === "active" && Math.round(value) === 100)
    fail("Use completed status for 100%");
  return {
    status: p.status,
    progress:
      p.status === "done"
        ? 100
        : p.status === "waiting"
          ? 0
          : Math.round(value),
  };
}
