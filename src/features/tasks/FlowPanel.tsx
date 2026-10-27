import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowRight,Check, Circle, GitBranch, Maximize2, Minus, Plus, Focus, Bot, AlertCircle} from 'lucide-react';
import type {FlowNode,FlowPlan,Run,Task} from '../../types';

const copy={ko:{title:'업무 플로우',plan:'실행 전 계획',live:'실행 기록',pending:'봇이 업무 플로우를 준비합니다',empty:'아직 등록된 플로우가 없습니다',hint:'저장된 지시서를 읽은 봇이 작업과 연결 관계를 등록하면 여기에 표시됩니다.',legacy:'기존 하위 작업 · 연결 관계 미설정',stale:'새 지시의 플로우 작성 대기 · 아래는 이전 계획',unapplied:'새 계획은 현재 회차에 아직 적용되지 않았습니다.',fit:'전체 맞춤',zoomIn:'확대',zoomOut:'축소',focus:'현재 작업 보기',planned:'예정',waiting:'대기중',active:'진행중',done:'완료',blocked:'막힘',owner:'담당 봇',report:'최근 보고',detail:'노드를 선택하면 상세 내용을 볼 수 있습니다.',navigation:'빈 공간을 드래그해 이동 · +/- 확대 · 방향키로 이동',version:'지시',step:'노드',selected:'선택 노드',draft:'저장된 지시 기준 · 수정 내용은 저장 후 반영됩니다.'},en:{title:'Task flow',plan:'Execution plan',live:'Run history',pending:'Bot is preparing the workflow',empty:'No workflow yet',hint:'The bot reads the saved brief and submits tasks and dependencies here.',legacy:'Existing subtasks · dependencies not specified',stale:'Awaiting a new plan · previous plan shown below',unapplied:'The new plan has not been applied to this run.',fit:'Fit all',zoomIn:'Zoom in',zoomOut:'Zoom out',focus:'Focus active work',planned:'Planned',waiting:'Waiting',active:'In progress',done:'Done',blocked:'Blocked',owner:'Assigned bot',report:'Latest report',detail:'Select a node to inspect its details.',navigation:'Drag the canvas to pan · +/- to zoom · arrow keys to move',version:'Brief',step:'nodes',selected:'Selected node',draft:'Saved brief · edits appear after saving.'}};
const WIDTH=230,HEIGHT=156,GAP_X=92,GAP_Y=50;
function arrange(nodes:FlowNode[],edges:FlowPlan['edges']){
  const ranks=new Map(nodes.map(n=>[n.id,0])),incoming=new Map(nodes.map(n=>[n.id,0]));
  edges.forEach(e=>incoming.set(e.target,(incoming.get(e.target)||0)+1));
  const queue=nodes.filter(n=>incoming.get(n.id)===0).map(n=>n.id);let cursor=0;
  while(cursor<queue.length){const id=queue[cursor++];for(const edge of edges.filter(e=>e.source===id)){ranks.set(edge.target,Math.max(ranks.get(edge.target)||0,(ranks.get(id)||0)+1));incoming.set(edge.target,(incoming.get(edge.target)||0)-1);if(incoming.get(edge.target)===0)queue.push(edge.target)}}
  const columns=new Map<number,FlowNode[]>();nodes.forEach(n=>{const rank=ranks.get(n.id)||0;columns.set(rank,[...(columns.get(rank)||[]),n])});
  const rows=Math.max(1,...Array.from(columns.values(),v=>v.length)),height=rows*(HEIGHT+GAP_Y)-GAP_Y+80;
  const positions=new Map<string,{x:number;y:number}>();columns.forEach((items,rank)=>items.forEach((n,i)=>positions.set(n.id,{x:40+rank*(WIDTH+GAP_X),y:(height-(items.length*(HEIGHT+GAP_Y)-GAP_Y))/2+i*(HEIGHT+GAP_Y)})));
  return {positions,width:80+columns.size*WIDTH+Math.max(0,columns.size-1)*GAP_X,height};
}
export function FlowPanel({task,run,lang,botName}:{task:Task;run?:Run;lang:'ko'|'en';botName:(id:string)=>string}){
  const t=copy[lang],host=useRef<HTMLDivElement>(null),marker=useId().replace(/:/g,'');
  const [selected,setSelected]=useState<string|null>(null),[size,setSize]=useState({width:0,height:0}),[view,setView]=useState({x:0,y:0,zoom:1});
  const fitted=useRef({key:"",width:0});
  const gesture=useRef<{x:number;y:number;originX:number;originY:number}|null>(null);
  const plan=run ? run.flowPlan : task.flowPlan;
  const legacy=!!run&&!plan&&run.subtasks.length>0;
  const nodes=useMemo(()=>plan?.nodes || (run?.subtasks.map(s=>({id:s.nodeId || s.id,title:s.title,description:'',botId:s.botId})) || []),[plan,run?.subtasks]);
  const edges=plan?.edges || [];
  const structure=JSON.stringify([nodes.map(n=>n.id),edges.map(e=>[e.source,e.target])]);
  const graph=useMemo(()=>arrange(nodes,edges),[structure]);
  const progressFor=(id:string)=>run?.subtasks.find(s=>(s.nodeId || s.id)===id);
  const active=nodes.filter(n=>progressFor(n.id)?.status==='active');
  const selectedNode=nodes.find(n=>n.id===selected),selectedProgress=selectedNode?progressFor(selectedNode.id):undefined;
  function fit(){const zoom=Math.max(.15,Math.min(1,(size.width-48)/graph.width,(size.height-48)/graph.height));setView({x:(size.width-graph.width*zoom)/2,y:(size.height-graph.height*zoom)/2,zoom})}
  function focusNode(id:string){const p=graph.positions.get(id);if(!p)return;setSelected(id);const zoom=Math.max(.65,Math.min(1.1,view.zoom));setView({x:size.width/2-(p.x+WIDTH/2)*zoom,y:size.height/2-(p.y+HEIGHT/2)*zoom,zoom})}
  function zoomTo(factor:number){setView(v=>{const zoom=Math.max(.15,Math.min(1.6,v.zoom*factor)),ratio=zoom/v.zoom;return{x:size.width/2-(size.width/2-v.x)*ratio,y:size.height/2-(size.height/2-v.y)*ratio,zoom}})}
  useEffect(()=>{if(!host.current)return;const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setSize({width:r.width,height:r.height})});observer.observe(host.current);return()=>observer.disconnect()},[]);
  useEffect(()=>{if(!size.width||!size.height)return;const key=structure+(run?.id || "plan");if(fitted.current.key!==key || fitted.current.width!==size.width){fit();fitted.current={key,width:size.width}}setSelected(current=>nodes.some(n=>n.id===current)?current:null)},[structure,size.width,size.height,run?.id]);
  return <section className="flow-panel" aria-label={t.title}>
    <div className="flow-heading"><div><GitBranch size={17}/><h2>{t.title}</h2><span>{nodes.length} {t.step}</span></div><span className="flow-version">{t.version} v{run?.instructionVersion || plan?.version || task.publishedVersion}</span></div>
    <div className="flow-context"><span>{run?t.live:t.plan}</span><span>{run ? `#${task.runs.findIndex(r=>r.id===run.id)+1}` : t.draft}</span></div>
    {legacy&&<p className="flow-notice">{t.legacy}</p>}
    {!run&&plan&&plan.version!==task.publishedVersion&&<p className="flow-notice">{t.stale}</p>}
    {run&&task.flowPlan&&task.flowPlan.version!==run.flowPlan?.version&&<p className="flow-notice">{t.unapplied}</p>}
    <div className="flow-active-strip" aria-live="polite">{active.length ? active.map(n=><button key={n.id} onClick={()=>focusNode(n.id)}><span className="live-pip"/>{n.title}<ArrowRight size={12}/></button>) : <span>{run ? `${run.progress}% · ${t[run.status]}` : t.plan}</span>}</div>
    <div className="flow-canvas" ref={host} tabIndex={0} role="region" aria-label={t.navigation}
      onKeyDown={e=>{if(e.target!==e.currentTarget)return;const delta=45;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setView(v=>({...v,x:v.x+(e.key==='ArrowLeft'?delta:e.key==='ArrowRight'?-delta:0),y:v.y+(e.key==='ArrowUp'?delta:e.key==='ArrowDown'?-delta:0)}))}if(e.key==='+'||e.key==='=')zoomTo(1.2);if(e.key==='-')zoomTo(1/1.2)}}
      onPointerDown={e=>{if((e.target as Element).closest('button'))return;gesture.current={x:e.clientX,y:e.clientY,originX:view.x,originY:view.y};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{const g=gesture.current;if(g)setView(v=>({...v,x:g.originX+e.clientX-g.x,y:g.originY+e.clientY-g.y}))}}
      onPointerUp={()=>{gesture.current=null}} onPointerCancel={()=>{gesture.current=null}}>
      {!nodes.length ? <div className="flow-empty"><img src="/assets/flow-navigator.png" alt=""/><h3>{task.flowRequestId?t.pending:t.empty}</h3><p>{t.hint}</p></div> : <div className="flow-world" style={{width:graph.width,height:graph.height,transform:`translate(${view.x}px,${view.y}px) scale(${view.zoom})`}}>
        <svg className="flow-edges" width={graph.width} height={graph.height} aria-hidden="true"><defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>{edges.map(edge=>{const a=graph.positions.get(edge.source),b=graph.positions.get(edge.target);if(!a||!b)return null;const x=a.x+WIDTH,y=a.y+HEIGHT/2,endX=b.x,endY=b.y+HEIGHT/2,d=`M${x},${y} C${x+GAP_X/2},${y} ${endX-GAP_X/2},${endY} ${endX},${endY}`;const status=progressFor(edge.target)?.status,sourceDone=progressFor(edge.source)?.status==='done';return <g key={edge.id}><path className={`flow-edge ${status==='active'?'active':sourceDone?'done':''}`} d={d} markerEnd={`url(#${marker})`}/>{edge.label&&<text x={(x+endX)/2} y={(y+endY)/2-12} textAnchor="middle">{edge.label}</text>}</g>})}</svg>
        {nodes.map((node,i)=>{const p=graph.positions.get(node.id)!,data=progressFor(node.id),status=data?.status || 'planned';return <button key={node.id} className={`flow-node node-${status} ${data?.blocked?'node-blocked':''} ${selected===node.id?'node-selected':''}`} style={{left:p.x,top:p.y,width:WIDTH,height:HEIGHT}} aria-pressed={selected===node.id} aria-label={`${node.title} · ${t[status]}${data?` ${data.progress}%`:''}`} onClick={()=>setSelected(node.id)} onFocus={()=>{setSelected(node.id)}}>
          <i className="node-port port-in"/><i className="node-port port-out"/>
          <div className="node-top"><span className="node-number">{String(i+1).padStart(2,'0')}</span><span className="node-status">{data?.blocked?<AlertCircle size={12}/>:status==='done'?<Check size={12}/>:<Circle size={10}/>} {data?.blocked?t.blocked:t[status]}</span></div>
          <strong>{node.title}</strong><p>{node.description || botName(node.botId)}</p><div className="node-owner"><span><Bot size={12}/>{botName(node.botId)}</span>{data&&<b>{data.progress}%</b>}</div>
          {data&&<span className="node-progress"><i style={{width:`${data.progress}%`}}/></span>}
        </button>})}
      </div>}
      {nodes.length>0&&<div className="flow-controls"><button onClick={()=>zoomTo(1.2)} aria-label={t.zoomIn}><Plus size={16}/></button><button onClick={()=>zoomTo(1/1.2)} aria-label={t.zoomOut}><Minus size={16}/></button><span>{Math.round(view.zoom*100)}%</span><button onClick={fit} aria-label={t.fit}><Maximize2 size={15}/></button><button disabled={!active.length} onClick={()=>focusNode(active[0].id)} aria-label={t.focus}><Focus size={16}/></button></div>}
    </div>
    <div className="flow-legend">{(['waiting','active','done'] as const).map(status=><span key={status}><i className={`status-dot ${status}`}/>{t[status]}</span>)}<small>{t.navigation}</small></div>
    <div className="flow-inspector">{selectedNode?<><div><span>{t.selected} / {selectedNode.id}</span><strong>{selectedNode.title}</strong></div><p>{selectedNode.description || '—'}</p><dl><dt>{t.owner}</dt><dd>{botName(selectedNode.botId)}</dd>{selectedProgress&&<><dt>{t.report}</dt><dd>{selectedProgress.note || '—'}</dd><dt>{t[selectedProgress.status]}</dt><dd>{selectedProgress.progress}%{selectedProgress.blocked&&` · ${t.blocked}`}</dd></>}</dl></>:<p>{t.detail}</p>}</div>
  </section>
}
