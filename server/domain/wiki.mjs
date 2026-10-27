import {randomUUID,createHash} from 'node:crypto';
const error=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(value,max=100000)=>typeof value==='string'&&value.length<=max?value:error('Invalid wiki text');
const required=(v,max=100000)=>text(v,max).trim()||error('Wiki text is required');
const stamp=()=>new Date().toISOString();
const secretPatterns=[
 /(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|token|password|passwd|secret|비밀번호|암호|토큰|비밀키|API\s*키)["']?\s*[:=]\s*["']?[^\s"',;}]+/i,
 /\b(?:bearer|basic)\s+[A-Za-z0-9+/_=.-]{6,}/i,
 /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
 /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{12,})\b/,
 /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
 /[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]+@/i,
 /\b[a-f0-9]{64}\b/i,
];
export function validateWikiSourceAdd(s,p,actor){
 if(actor?.kind!=='bot'||!s.bots.some(b=>b.id===actor.id))error('Registered bot required',403);
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['requestId','title','text','tags','origin'].includes(k)))error('Invalid source fields');
 required(p.requestId,150);required(p.title,300);required(p.text,65536);
 if(Buffer.byteLength(p.text,'utf8')>65536)error('Source text exceeds byte limit');
 if(p.origin!==undefined)text(p.origin,1000);
 if(p.tags!==undefined&&(!Array.isArray(p.tags)||p.tags.length>20||p.tags.some(tag=>typeof tag!=='string'||!tag.trim()||tag.length>50)))error('Invalid source tags');
 for(const value of [p.requestId,p.title,p.text,p.origin,...(p.tags||[])])if(typeof value==='string'&&secretPatterns.some(pattern=>pattern.test(value)))error('Potential credential detected; remove sensitive values');
}
export function ensureWiki(s){return s.wiki ||= {sources:[],pages:[],jobs:[],log:[]};}
function log(w,jobId,action,actor,note='',pages){w.log.unshift({id:randomUUID(),jobId,action,at:stamp(),actor,note,...(pages?{pages:structuredClone(pages)}:{})});}
function createJob(s,fields){const w=ensureWiki(s),at=stamp();const job={id:randomUUID(),...fields,status:'pending',version:0,note:'',findings:[],attemptId:null,staged:[],createdAt:at,updatedAt:at,semanticReview:null};w.jobs.unshift(job);s.inbox.unshift({id:randomUUID(),kind:'wiki',targetId:job.id,version:0,message:'Maintain the persistent wiki.',recipient:'bot-0',createdAt:at,acknowledgedAt:null,source:null});log(w,job.id,'request','system',job.text||'');return job;}
export function captureWikiSource(s,t,kind){
 const w=ensureWiki(s);const brief=t.published||t.draft;
 const markdown=kind==='retrospective'?t.retrospective?.markdown:`# ${brief.title}\n\n${brief.description}\n\n## Acceptance criteria\n${brief.criteria}\n\n## Execution records\n${JSON.stringify(t.runs,null,2)}`;
 if(!markdown)return null;
 const hash=createHash('sha256').update(JSON.stringify({taskId:t.id,kind,markdown})).digest('hex');
 const prior=w.sources.find(x=>x.hash===hash);if(prior)return prior;
 const source={id:randomUUID(),taskId:t.id,kind,title:brief.title,markdown,hash,createdAt:stamp()};w.sources.unshift(source);createJob(s,{kind:'ingest',sourceId:source.id,text:`Ingest ${kind}: ${source.title}`});return source;
}
export function wikiLinks(markdown){
 let fence=null;const lines=[];
 for(const line of markdown.split(/\r?\n/)){
  const marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if(fence){if(marker&&marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;continue;}
  if(marker){fence={char:marker[1][0],length:marker[1].length};continue;}
  if(/^(?: {4}|\t)/.test(line))continue;lines.push(line);
 }
 const clean=lines.join('\n').replace(/(`+)[\s\S]*?\1/g,'');
 return [...new Set([...clean.matchAll(/(?<!\\)\[\[([A-Za-z0-9_-]+)(?:\|[^\]\n]+)?\]\]/g)].map(m=>m[1]))];
}
function lint(w,staged){
 const pages=new Map(w.pages.map(p=>[p.id,p]));for(const p of staged)pages.set(p.id,p);
 const findings=[];for(const p of pages.values())if(!p.deletedAt){
  for(const id of p.sourceIds)if(!w.sources.some(s=>s.id===id))findings.push({type:'missing-source',message:`Unknown raw source: ${id}`,pageId:p.id,targetId:id});
  for(const id of p.links)if(!pages.has(id)||pages.get(id).deletedAt)findings.push({type:'unresolved-link',message:`Unresolved page link: ${id}`,pageId:p.id,targetId:id});
 }
 return findings;
}
export function wikiCommand(s,action,p,actor){
 const w=ensureWiki(s),at=stamp();
 if(/^wiki\.source\.(?:edit|update|delete|remove|purge)$/.test(action))error('Raw sources are immutable',403);
 if(action==='wiki.source.add'){
  validateWikiSourceAdd(s,p,actor);
  const markdown=p.text.replace(/\r\n?/g,'\n').trim(),hash=createHash('sha256').update(JSON.stringify({kind:'note',markdown})).digest('hex');
  let source=w.sources.find(x=>x.kind==='note'&&x.hash===hash),duplicate=!!source;
  if(!source){source={id:randomUUID(),kind:'note',title:p.title.trim(),markdown,hash,createdAt:at,botId:actor.id,tags:(p.tags||[]).map(tag=>tag.trim()),origin:p.origin||''};w.sources.unshift(source);createJob(s,{kind:'ingest',sourceId:source.id,text:`Ingest note: ${source.title}`});}
  const job=w.jobs.find(j=>j.kind==='ingest'&&j.sourceId===source.id);
  w.log.unshift({id:randomUUID(),jobId:job?.id,action:'wiki.source.add',at,actor:actor.id,requestId:p.requestId,title:p.title.trim(),sourceId:source.id,duplicate,note:duplicate?'Duplicate source retained':'Source accepted'});
  return {id:source.id,jobId:job?.id,status:job?.status||'pending',duplicate};
 }
 if(action==='wiki.request'){
  if(actor.kind!=='user')error('Only users request wiki changes',403);
  if(!['add','edit','delete'].includes(p.kind))error('Invalid wiki request kind');
  let page;if(p.kind!=='add'){page=w.pages.find(x=>x.id===p.pageId&&!x.deletedAt)||error('Wiki page not found',404);if(p.expectedPageVersion!==page.version)error('Wiki page version conflict',409);}
  return createJob(s,{kind:'request',requestKind:p.kind,text:required(p.text,10000),...(page?{pageId:page.id,expectedPageVersion:page.version}:{})});
 }
 if(actor.kind!=='bot'||actor.id!=='bot-0')error('Only main bot maintains wiki',403);
 const job=w.jobs.find(x=>x.id===p.id)||error('Wiki job not found',404);
 if(p.expectedVersion!==job.version)error('Wiki job version conflict',409);
 if(action==='wiki.job.start'||action==='wiki.job.retry'){
  if(action==='wiki.job.start'?job.status!=='pending':!['error','ingesting','linting'].includes(job.status))error('Wiki job cannot start in this state',409);
  job.status='ingesting';job.attemptId=randomUUID();job.staged=[];job.findings=[];job.semanticReview=null;job.note='';
 }else{
  if(!p.attemptId||p.attemptId!==job.attemptId||!['ingesting','linting'].includes(job.status))error('Wiki attempt is stale',409);
  if(action==='wiki.job.fail'){job.status='error';job.note=required(p.note,3000);}
  else if(action==='wiki.stage'){
   if(!Array.isArray(p.pages)||!p.pages.length||p.pages.length>50)error('Stage 1–50 wiki pages');
   const ids=new Set();job.staged=p.pages.map(input=>{
    if(!input||typeof input!=='object'||Array.isArray(input))error('Invalid wiki page');
    const id=required(input.id,100);if(!/^[A-Za-z0-9_-]+$/.test(id)||ids.has(id))error('Invalid or duplicate wiki page ID');ids.add(id);
    const old=w.pages.find(x=>x.id===id);if(input.expectedVersion!==(old?.version||0))error('Wiki page version conflict',409);
    if(input.operation==='delete'){
     if(job.requestKind!=='delete'||job.pageId!==id||!old||old.deletedAt||job.expectedPageVersion!==old.version)error('Deletion requires a matching explicit user request',409);
     return {...old,expectedVersion:old.version,deletedAt:at};
    }
    if(input.operation&&input.operation!=='upsert')error('Invalid wiki page operation');
    if(old?.deletedAt)error('Deleted page IDs cannot be reused',409);
    const markdown=required(input.markdown);if(!Array.isArray(input.sourceIds)||input.sourceIds.some(x=>typeof x!=='string'))error('sourceIds must be an array');
    return {id,title:required(input.title,300),summary:text(input.summary||'',1000),markdown,links:wikiLinks(markdown),sourceIds:[...new Set(input.sourceIds)],expectedVersion:input.expectedVersion,version:old?.version||0,createdAt:old?.createdAt||at,updatedAt:at,deletedAt:null};
   });
   if(job.requestKind==='delete'&&!job.staged.some(x=>x.id===job.pageId&&x.deletedAt))error('Requested deletion must be included');
   if(job.requestKind==='edit'&&!job.staged.some(x=>x.id===job.pageId&&!x.deletedAt))error('Requested edit must be included');
   if(job.kind==='ingest'&&!job.staged.some(x=>!x.deletedAt&&x.sourceIds.includes(job.sourceId)))error('Ingested source must be cited by a staged page');
   job.findings=lint(w,job.staged);job.status='linting';job.note='Structural lint completed; semantic review required.';
  }else if(action==='wiki.commit'){
   if(job.status!=='linting'||!job.staged.length)error('Stage wiki pages before commit',409);
   for(const page of job.staged)if((w.pages.find(x=>x.id===page.id)?.version||0)!==page.expectedVersion)error('Wiki page version conflict',409);
   const findings=lint(w,job.staged);if(findings.length)error('Structural lint failed: '+findings.map(x=>`${x.type}:${x.pageId}->${x.targetId}`).join(', '),409);
   job.semanticReview=required(p.semanticReview,5000);const published=job.staged.map(({expectedVersion,...page})=>({...page,version:expectedVersion+1,updatedAt:at}));
   for(const page of published){const i=w.pages.findIndex(x=>x.id===page.id);if(i<0)w.pages.push(page);else w.pages[i]=page;}
   log(w,job.id,'publish',actor.id,job.semanticReview,published);job.status='done';job.note='Published after structural lint and main-bot semantic review.';job.findings=[];job.staged=[];
   for(const e of s.inbox)if(e.kind==='wiki'&&e.targetId===job.id&&!e.acknowledgedAt){e.acknowledgedAt=at;e.source='bot';}
  }else error('Unknown wiki action',404);
 }
 job.version++;job.updatedAt=at;log(w,job.id,action,actor.id,job.note);return job;
}
export function wikiIndex(s){const w=ensureWiki(s),pages=w.pages.filter(p=>!p.deletedAt);const ids=new Set(pages.map(p=>p.id));return {revision:s.revision,sources:w.sources.map(({markdown,...x})=>x),pages:pages.map(({markdown,...x})=>x),jobs:w.jobs.map(({staged,...j})=>({...j,stagedCount:staged.length})),log:w.log.slice(0,50).map(({pages,...entry})=>entry),graph:{nodes:pages.map(p=>({id:p.id,title:p.title})),edges:pages.flatMap(p=>p.links.filter(id=>ids.has(id)).map(id=>({source:p.id,target:id})))}};}
