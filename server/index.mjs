import http from "node:http";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
  createReadStream,
} from "node:fs";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createStore, AppError } from "./domain/store.mjs";
import {wikiIndex,ensureWiki} from './domain/wiki.mjs';
const root = resolve(fileURLToPath(new URL("..", import.meta.url))),
  data = resolve(root, "data");
mkdirSync(data, { recursive: true });
const configPath = resolve(data, "config.json");
let config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf8").replace(/^\uFEFF/, ""))
  : { port: 4318, allowedLogin: "", tailscaleHost: "" };
if (!existsSync(configPath))
  writeFileSync(configPath, JSON.stringify(config, null, 2));
const keyPath = resolve(data, "bot.key");
if (!existsSync(keyPath))
  writeFileSync(keyPath, randomBytes(32).toString("hex"));
const key = readFileSync(keyPath, "utf8").trim();
const stores = {
  live: createStore(resolve(data, "live.sqlite")),
};
const sessions = new Map();
const streams = { live: new Set() };
function notify(mode) {
  const payload = `event: change\ndata: ${JSON.stringify({revision:stores[mode].read().revision,workspace:mode})}\n\n`;
  for(const res of streams[mode]) if(!res.write(payload)) { streams[mode].delete(res);res.end(); }
}
const port = Number(process.env.PORT || config.port);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};
function equal(a, b) {
  return (
    typeof a === "string" &&
    typeof b === "string" &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
function access(req) {
  const host = (req.headers.host || "").split(":")[0];
  const login = req.headers["tailscale-user-login"];
  if (host === "127.0.0.1" || host === "localhost") {
    if (login) throw new AppError("Unexpected proxy identity", 403);
    return;
  }
  if (
    !config.tailscaleHost ||
    host !== config.tailscaleHost ||
    !config.allowedLogin ||
    login !== config.allowedLogin
  )
    throw new AppError(
      "Only the configured Tailscale owner may access this app",
      403,
    );
}
async function body(req) {
  let chunks = [],
    size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 1024 * 1024) throw new AppError("Request too large", 413);
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    throw new AppError("Invalid JSON");
  }
}
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  );
  try {
    access(req);
    const url = new URL(req.url, "http://localhost");
    if(url.pathname.startsWith('/api/')) {
      if((req.headers['x-workspace']!==undefined&&req.headers['x-workspace']!=='live')||url.searchParams.getAll('workspace').some(value=>value!=='live')) throw new AppError('Only the live workspace is supported',400);
      if(url.pathname.startsWith('/api/demo/'))throw new AppError('Not found',404);
    }
    if (url.pathname === "/api/health")
      return json(res, 200, { ok: true, app: "grokbot-city" });
    if (url.pathname.startsWith("/api/")) {
      const bearer = req.headers.authorization?.replace(/^Bearer /, "");
      const agent = equal(bearer, key);
      if (req.headers.authorization && !agent)
        throw new AppError("Invalid bot credentials", 401);
      const actor = agent
        ? { kind: "bot", id: req.headers["x-bot-id"] || "bot-0" }
        : { kind: "user", id: "owner" };
      const mode =
        req.headers["x-workspace"] ||
        url.searchParams.get("workspace") ||
        "live";
      if (mode !== "live")
        throw new AppError("Invalid workspace");
      const store = stores[mode];
      if(req.method==='GET'&&url.pathname.startsWith('/api/wiki/')){
        const state=store.read(),wiki=ensureWiki(state),kind=url.pathname.slice('/api/wiki/'.length);
        if(kind==='index')return json(res,200,wikiIndex(state));
        const collection={source:wiki.sources,page:wiki.pages,job:wiki.jobs}[kind];
        if(!collection)throw new AppError('Not found',404);
        const item=collection.find(x=>x.id===url.searchParams.get('id'));if(!item)throw new AppError('Wiki item not found',404);
        return json(res,200,{revision:state.revision,[kind]:item});
      }
      if(req.method==='GET'&&['/api/sync','/api/task','/api/bots','/api/retrospective'].includes(url.pathname)) {
        const s=store.read();
        if(actor.kind==='bot'&&!s.bots.some(b=>b.id===actor.id)) throw new AppError('Bot not found',404);
        const relevant=t=>actor.kind==='user'||actor.id==='bot-0'||[t.published?.boss,...(t.published?.members||[]),t.draft.boss,...t.draft.members,...t.runs.flatMap(r=>[r.brief.boss,...r.brief.members])].includes(actor.id);
        if(url.pathname==='/api/bots') {
          const id=url.searchParams.get('id');const bots=id?s.bots.filter(b=>b.id===id):s.bots;
          if(id&&!bots.length) throw new AppError('Bot not found',404);
          return json(res,200,id?{revision:s.revision,bot:bots[0]}:{revision:s.revision,bots});
        }
        if(url.pathname==='/api/sync') {
          const visible=s.tasks.filter(t=>t.location!=='trash'&&relevant(t)),ids=new Set(visible.map(t=>t.id));
          const inbox=s.inbox.filter(e=>!e.acknowledgedAt&&!e.cancelledAt&&(e.kind==='wiki'?(actor.kind==='user'||actor.id==='bot-0'):e.kind==='instruction'?(actor.kind==='user'||actor.id==='bot-0'||e.recipient===actor.id):ids.has(e.targetId)&&(e.kind!=='retrospective'||actor.kind==='user'||actor.id==='bot-0')));
          return json(res,200,{revision:s.revision,workspace:mode,inbox,tasks:visible.map(t=>({id:t.id,title:(t.published||t.draft).title,version:t.version,stage:t.stage,location:t.location,ready:t.ready,dispatchId:t.dispatchId,publishedVersion:t.publishedVersion,acceptedVersion:t.acceptedVersion,run:t.runs.length?{id:t.runs.at(-1).id,status:t.runs.at(-1).status,progress:t.runs.at(-1).progress}:null,retrospectiveRequestId:t.retrospectiveRequestId,retrospectiveReady:!!t.retrospective,flowRequestId:t.flowRequestId,flowVersion:t.flowPlan?.version??null}))});
        }
        const task=s.tasks.find(t=>t.id===url.searchParams.get('id'));
        if(!task) throw new AppError('Task not found',404);
        if(!relevant(task)) throw new AppError('Task not assigned',403);
        if(url.pathname==='/api/task') return json(res,200,{revision:s.revision,task});
        if(task.location==='trash'||!task.retrospective) throw new AppError('Retrospective unavailable',404);
        const safeId=task.id.replace(/[^a-zA-Z0-9-]/g,'');
        res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="retrospective-${safeId}.md"`,'Cache-Control':'no-store'});
        return res.end(task.retrospective.markdown);
      }
      if(req.method === "GET" && url.pathname === "/api/events") {
        res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});
        res.flushHeaders();streams[mode].add(res);
        res.write(`retry: 2000\nevent: change\ndata: ${JSON.stringify({revision:store.read().revision,workspace:mode})}\n\n`);
        const timer=setInterval(()=>res.write(": heartbeat\n\n"),15000);timer.unref();
        res.on("close",()=>{clearInterval(timer);streams[mode].delete(res);});return;
      }
      if (req.method === "GET" && url.pathname === "/api/state") {
        let session = req.headers.cookie?.match(
          /(?:^|; )city=([a-f0-9]+)/,
        )?.[1];
        if (!session || !sessions.has(session)) {
          session = randomBytes(24).toString("hex");
          sessions.set(session, randomBytes(24).toString("hex"));
          res.setHeader(
            "Set-Cookie",
            `city=${session}; HttpOnly; SameSite=Strict; Path=/${config.tailscaleHost && req.headers.host === config.tailscaleHost ? "; Secure" : ""}`,
          );
        }
        return json(res, 200, {
          ...store.read(),
          csrf: sessions.get(session),
          workspace: mode,
          serverTime: new Date().toISOString(),
        });
      }
      if (req.method !== "POST") throw new AppError("Not found", 404);
      if (!agent) {
        const session = req.headers.cookie?.match(
          /(?:^|; )city=([a-f0-9]+)/,
        )?.[1];
        if (
          !session ||
          !sessions.has(session) ||
          !equal(req.headers["x-csrf-token"], sessions.get(session))
        )
          throw new AppError("Reload the page before making changes", 403);
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host)
          throw new AppError("Invalid origin", 403);
      }
      const p = await body(req);
      if (url.pathname === "/api/command") {
        const result=store.command(p.action,p.payload,actor);notify(mode);
        return json(res, 200,result);
      }
      throw new AppError("Not found", 404);
    }
    if (req.method !== "GET" && req.method !== "HEAD")
      throw new AppError("Method not allowed", 405);
    const base = resolve(root, "dist"),
      relative = decodeURIComponent(url.pathname);
    let path = resolve(base, "." + relative);
    if (!path.startsWith(base + sep) && path !== base)
      throw new AppError("Invalid path");
    if (!existsSync(path) || !statSync(path).isFile()) {
      if (extname(path)) throw new AppError("File not found", 404);
      path = resolve(base, "index.html");
    }
    if (!existsSync(path)) throw new AppError("Run npm run build first", 503);
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "Cache-Control": path.endsWith("index.html")
        ? "no-cache"
        : "public, max-age=3600",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(path).pipe(res);
  } catch (e) {
    json(res, e.status || 500, {
      error: e.status ? e.message : "Internal server error",
    });
    if (!e.status) console.error(e);
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Grokbot City http://127.0.0.1:${port}`),
);
server.on("error", (e) => {
  console.error(e.code);
  process.exit(1);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for(const set of Object.values(streams)) for(const res of set) res.end();
    server.close(() => {
      Object.values(stores).forEach((s) => s.close());
      process.exit(0);
    });
  });
