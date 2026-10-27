import {useMemo,useRef,useState} from 'react';
import {Maximize2,Minus,Plus,Focus} from 'lucide-react';
import type {WikiPage} from './types';

type Point={x:number;y:number};
function seed(id:string){let n=0;for(const c of id)n=(n*31+c.charCodeAt(0))>>>0;return n}
export default function WikiGraph({pages,selected,onSelect,query,lang}:{pages:WikiPage[];selected:string|null;onSelect:(id:string)=>void;query:string;lang:string}){
  const cache=useRef(new Map<string,Point>());
  const signature=pages.map(p=>`${p.id}:${p.links.join(',')}`).join('|');
  const graph=useMemo(()=>{
    const ids=new Set(pages.map(p=>p.id)),edges: {id:string;source:string;target:string}[]=[];
    pages.forEach(p=>p.links.forEach(target=>{if(ids.has(target))edges.push({id:`${p.id}:${target}`,source:p.id,target})}));
    const positions=new Map<string,Point>();
    pages.forEach(p=>{const old=cache.current.get(p.id),h=seed(p.id),a=(h%628)/100;positions.set(p.id,old?{...old}:{x:500+Math.cos(a)*(90+h%170),y:310+Math.sin(a)*(90+h%120)})});
    // Settle new nodes around existing anchors. Existing nodes stay in place on live updates.
    for(let iter=0;iter<90;iter++){
      const forces=new Map(pages.map(p=>[p.id,{x:0,y:0}]));
      for(let i=0;i<pages.length;i++)for(let j=i+1;j<pages.length;j++){
        const a=positions.get(pages[i].id)!,b=positions.get(pages[j].id)!,dx=a.x-b.x||.1,dy=a.y-b.y||.1,d2=Math.max(80,dx*dx+dy*dy),d=Math.sqrt(d2),f=Math.min(14,10000/d2+Math.max(0,160-d)*.08);
        forces.get(pages[i].id)!.x+=dx/d*f;forces.get(pages[i].id)!.y+=dy/d*f;forces.get(pages[j].id)!.x-=dx/d*f;forces.get(pages[j].id)!.y-=dy/d*f;
      }
      for(const e of edges){const a=positions.get(e.source)!,b=positions.get(e.target)!,dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-155)*.018;forces.get(e.source)!.x+=dx/d*f;forces.get(e.source)!.y+=dy/d*f;forces.get(e.target)!.x-=dx/d*f;forces.get(e.target)!.y-=dy/d*f}
      pages.forEach(p=>{if(cache.current.has(p.id))return;const pos=positions.get(p.id)!,f=forces.get(p.id)!;pos.x=Math.max(90,Math.min(910,pos.x+f.x+(500-pos.x)*.001));pos.y=Math.max(65,Math.min(560,pos.y+f.y+(310-pos.y)*.001))});
    }
    cache.current=positions;return {positions,edges};
  },[signature]);
  const [view,setView]=useState({x:0,y:0,scale:1});
  const drag=useRef<{x:number;y:number;vx:number;vy:number;ratio:number}|null>(null);
  const neighbors=new Set([selected,...graph.edges.filter(e=>e.source===selected||e.target===selected).flatMap(e=>[e.source,e.target])]);
  const zoom=(factor:number)=>setView(v=>{const scale=Math.max(.45,Math.min(3,v.scale*factor));return {scale,x:500-(500-v.x)*scale/v.scale,y:310-(310-v.y)*scale/v.scale}});
  const ko=lang==='ko';
  return <div className="wiki-map">
    <div className="wiki-map-label"><span className="live-dot"/><span>{ko?'지식의 연결':'KNOWLEDGE CONNECTIONS'}</span><small>{pages.length} {ko?'문서':'pages'} · {graph.edges.length} {ko?'연결':'links'}</small></div>
    <svg className="wiki-graph" viewBox="0 0 1000 640" role="group" aria-label={ko?'위키 연결 지도 · 방향키 이동, +/- 확대':'Wiki graph · arrows to pan, +/- to zoom'} tabIndex={0}
      onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='+'||e.key==='=')zoom(1.2);else if(e.key==='-')zoom(1/1.2);else setView(v=>({...v,x:v.x+(e.key==='ArrowLeft'?35:e.key==='ArrowRight'?-35:0),y:v.y+(e.key==='ArrowUp'?35:e.key==='ArrowDown'?-35:0)}))}}}
      onPointerDown={e=>{if((e.target as Element).closest('[data-wiki-node]'))return;drag.current={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,ratio:1000/e.currentTarget.getBoundingClientRect().width};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{const d=drag.current;if(d)setView(v=>({...v,x:d.vx+(e.clientX-d.x)*d.ratio,y:d.vy+(e.clientY-d.y)*d.ratio}))}}
      onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
      <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {graph.edges.map(e=>{const a=graph.positions.get(e.source)!,b=graph.positions.get(e.target)!,lit=e.source===selected||e.target===selected;return e.source===e.target?<path key={e.id} className={`wiki-edge ${lit?'lit':''}`} d={`M ${a.x-8} ${a.y-8} C ${a.x-58} ${a.y-78}, ${a.x+58} ${a.y-78}, ${a.x+8} ${a.y-8}`} fill="none" pathLength={1}/>:<line key={e.id} className={`wiki-edge ${lit?'lit':''}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} pathLength={1}/>})}
        {pages.map(p=>{const point=graph.positions.get(p.id)!,degree=graph.edges.filter(e=>e.source===p.id||e.target===p.id).length,r=8+Math.min(13,degree*2),dim=(!!selected&&!neighbors.has(p.id))||(!!query&&!`${p.title} ${p.summary} ${p.markdown}`.toLowerCase().includes(query.toLowerCase()));return <g key={p.id} data-wiki-node={p.id} className={`wiki-graph-node ${p.id===selected?'selected':''} ${dim?'dim':''}`} transform={`translate(${point.x} ${point.y})`} tabIndex={0} role="button" aria-label={p.title} aria-pressed={p.id===selected} onClick={()=>onSelect(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(p.id)}}}>
          <title>{p.title} · {degree} {ko?'연결':'links'}</title><circle className="wiki-node-halo" r={r+12}/><circle className="wiki-node-core" r={r}/><text y={r+24} textAnchor="middle">{p.title.length>22?p.title.slice(0,21)+'…':p.title}</text>
        </g>})}
      </g>
    </svg>
    {!pages.length&&<div className="wiki-map-empty"><strong>{ko?'첫 지식이 연결될 자리':'A place for knowledge to connect'}</strong><p>{ko?'메인봇이 원자료를 위키로 정리하면 문서와 연결이 나타납니다.':'Pages and connections appear when the main bot compiles sources into the wiki.'}</p></div>}
    <div className="wiki-map-controls"><button className="icon-button" aria-label={ko?'지도 확대':'Zoom graph in'} onClick={()=>zoom(1.2)}><Plus size={16}/></button><button className="icon-button" aria-label={ko?'지도 축소':'Zoom graph out'} onClick={()=>zoom(1/1.2)}><Minus size={16}/></button><small>{Math.round(view.scale*100)}%</small><button className="icon-button" aria-label={ko?'지도 전체 보기':'Fit graph'} onClick={()=>setView({x:0,y:0,scale:1})}><Maximize2 size={16}/></button><button className="icon-button" disabled={!selected} aria-label={ko?'선택 문서로 이동':'Focus selected page'} onClick={()=>{const p=graph.positions.get(selected!);if(p)setView(v=>({...v,x:500-p.x*v.scale,y:310-p.y*v.scale}))}}><Focus size={16}/></button></div>
    <p className="wiki-map-hint">{ko?'문서 선택 · 빈 공간 드래그 · 실제 문서 링크만 표시':'Select a page · drag to pan · connections reflect real page links'}</p>
  </div>;
}
