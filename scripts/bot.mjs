import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2),
  action = args[0] || 'sync';
const option = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
if (action === "help") {
  console.log(
    "node scripts/bot.mjs [sync|inbox|state|task.get|bot.get|bot.list|ACTION] [--id ID] [--file payload.json] [--markdown-file retrospective.md] [--bot bot-0] [--workspace live] [--full]\nDefault: sync (compact actionable inbox and task summaries). task.get/bot.get require --id. retrospective aliases task.retrospective; --markdown-file merges Markdown into JSON payload. Wiki reads: wiki.index, wiki.source/wiki.page/wiki.job --id ID. Wiki writes: wiki.job.start/retry/fail, wiki.stage, wiki.commit --file payload.json. Writes return compact IDs/versions/current run; --full retains complete response. Updates are for work start, milestones, and finish, not timed polling. See docs/GROKBOT_PROTOCOL.md.",
  );
  process.exit(0);
}
try {
  const config = JSON.parse(
    readFileSync(resolve(root, "data/config.json"), "utf8").replace(
      /^\uFEFF/,
      "",
    ),
  );
  const key = readFileSync(resolve(root, "data/bot.key"), "utf8").trim();
  const workspace = option("--workspace", "live");
  if(workspace!=='live')throw new Error('Only the live workspace is supported');
  const headers = {
    Authorization: `Bearer ${key}`,
    "X-Bot-Id": option("--bot", "bot-0"),
    "X-Workspace": workspace,
    "Content-Type": "application/json",
  };
  const wikiRead=['wiki.index','wiki.source','wiki.page','wiki.job'].includes(action);
  const read = wikiRead||["sync", "state", "inbox", "bot.list", "bot.get", "task.get"].includes(action);
  const file = option("--file");
  if (!read && !file) throw new Error("--file payload.json is required");
  const id=option('--id');if((['bot.get','task.get'].includes(action)||(wikiRead&&action!=='wiki.index'))&&!id) throw new Error('--id is required');
  const endpoint=wikiRead?`wiki/${action.split('.')[1]}${id?'?id='+encodeURIComponent(id):''}`:action==='state'?'state':['sync','inbox'].includes(action)?'sync':action==='task.get'?`task?id=${encodeURIComponent(id)}`:action==='bot.get'?`bots?id=${encodeURIComponent(id)}`:action==='bot.list'?'bots':'command';
  const payload=read?null:JSON.parse(readFileSync(resolve(file),'utf8').replace(/^\uFEFF/,''));
  if(!read&&option('--markdown-file')) payload.markdown=readFileSync(resolve(option('--markdown-file')),'utf8').replace(/^\uFEFF/,'');
  const response = await fetch(
    `http://127.0.0.1:${config.port}/api/${endpoint}`,
    {
      method: read ? "GET" : "POST",
      headers,
      ...(!read
        ? {
            body: JSON.stringify({
              action:action==='retrospective'?'task.retrospective':action,
              payload,
            }),
          }
        : {}),
    },
  );
  const value = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${value.error}`);
  delete value.csrf;
  if(!read&&!args.includes('--full')) {
    const r=value.result;
    if(action.startsWith('wiki.'))value.result={id:r.id,status:r.status,version:r.version,attemptId:r.attemptId,findings:r.findings,note:r.note,stagedCount:r.staged?.length};
    if(r?.runs) value.result={id:r.id,version:r.version,stage:r.stage,location:r.location,ready:r.ready,dispatchId:r.dispatchId,acceptedVersion:r.acceptedVersion,publishedVersion:r.publishedVersion,retrospectiveRequestId:r.retrospectiveRequestId,retrospectiveReady:!!r.retrospective,flowRequestId:r.flowRequestId,flowVersion:r.flowPlan?.version??null,run:r.runs.length?{id:r.runs.at(-1).id,status:r.runs.at(-1).status,progress:r.runs.at(-1).progress,subtasks:r.runs.at(-1).subtasks.map(s=>({id:s.id,nodeId:s.nodeId,title:s.title,botId:s.botId,status:s.status,progress:s.progress}))}:null};
    if(action==='node.update'&&r?.runs){const run=r.runs.find(x=>x.id===payload.runId);value.result.run={id:run.id,status:run.status,progress:run.progress};value.result.node=run.subtasks.filter(x=>x.nodeId===payload.nodeId).map(x=>({id:x.id,nodeId:x.nodeId,status:x.status,progress:x.progress}))[0];}
    else if(r?.instructionVersion!==undefined) value.result={id:r.id,version:r.version,instructionVersion:r.instructionVersion,appliedVersion:r.appliedVersion,appliedAt:r.appliedAt,cliUsage:r.cliUsage};
  }
  console.log(
    JSON.stringify(
      action === "inbox"
        ? value.inbox.filter((x) => !x.acknowledgedAt && !x.cancelledAt)
        : action === "bot.list"
          ? value.bots
          : value,
      null,
      2,
    ),
  );
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exitCode = 1;
}
