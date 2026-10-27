import {useState} from 'react';
import {Check,Copy,Download} from 'lucide-react';
import {guideContent} from './content';
import './guide.css';

export default function OperatingGuide({lang}:{lang:'ko'|'en'}){
  const ko=lang==='ko',content=guideContent[lang];
  const [machine,setMachine]=useState(''),[path,setPath]=useState(''),[copied,setCopied]=useState(false),[error,setError]=useState('');
  const values:Record<string,string>={machine:machine.trim()||(ko?'[설치 PC 이름 입력]':'[Enter installation computer]'),path:path.trim()||(ko?'[프로젝트 절대경로 입력]':'[Enter absolute project path]')};
  const prompt=content.prompt.replace(/\{\{(machine|path)\}\}/g,(_,key:string)=>values[key]);
  const changed=()=>{setCopied(false);setError('')};
  const copy=async()=>{try{await navigator.clipboard.writeText(prompt);setCopied(true);setError('')}catch{setError(ko?'자동 복사를 사용할 수 없습니다. 아래 프롬프트를 선택해 복사하세요.':'Automatic copy is unavailable. Select and copy the prompt below.')}};
  const download=()=>{const url=URL.createObjectURL(new Blob([prompt],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`grokbot-city-start-${lang}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  return <div className="operating-guide">
    <p className="guide-intro">{ko?'처음이라면 이 프롬프트부터 메인봇에게 전달하세요.':'Start by sending this prompt to your main bot.'}</p>
    <section className="guide-handoff" aria-label={ko?'메인봇 시작 프롬프트':'Main bot startup prompt'}>
      <h3>{ko?'01 / 설치 위치 입력 → 프롬프트 복사':'01 / Enter location → copy prompt'}</h3>
      <div className="guide-fields">
        <label>{ko?'설치 PC 이름':'Installation computer'}<input value={machine} onChange={e=>{setMachine(e.target.value);changed()}} placeholder={ko?'Grokbot City가 설치된 PC':'Computer running Grokbot City'}/></label>
        <label>{ko?'프로젝트 절대경로':'Absolute project path'}<input value={path} onChange={e=>{setPath(e.target.value);changed()}} placeholder="C:\Projects\Grokbotcity"/></label>
      </div>
      <p>{ko?'입력한 값은 아래 프롬프트에만 반영됩니다. 빈 항목은 전달 전에 채우거나 메인봇과 확인하세요.':'Inputs only customize the prompt below. Fill missing values before sending, or confirm them with your main bot.'}</p>
      <div className="guide-actions"><button className="primary" onClick={()=>void copy()}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?(ko?'복사 완료':'Copied'):(ko?'메인봇 프롬프트 복사':'Copy main bot prompt')}</button><button className="secondary" onClick={download}><Download size={15}/>{ko?'텍스트 저장':'Save text'}</button></div>
      <span className="guide-copy-status" role="status" aria-live="polite">{error||(copied?(ko?'복사했습니다. 메인봇 대화창에 붙여 넣으세요.':'Copied. Paste it into your main bot conversation.'):'')}</span>
      <label>{ko?'복사할 프롬프트 전체 내용':'Full prompt to copy'}<textarea readOnly rows={9} value={prompt} onFocus={e=>e.currentTarget.select()}/></label>
    </section>
    <h3>{ko?'02 / 운영 흐름':'02 / Operating workflow'}</h3>
    {content.sections.map((section,i)=><section className="guide-section" key={section.title}><h4>{String(i+1).padStart(2,'0')} · {section.title}</h4><p>{section.text}</p>{section.commands.map(command=><code key={command}>{command}</code>)}</section>)}
    <p className="guide-footnote">{ko?'전체 가이드: docs/OPERATING_GUIDE.md · 정확한 명령 형식: docs/GROKBOT_PROTOCOL.md 및 docs/GROKBOT_WIKI.md':'Full guide: docs/OPERATING_GUIDE.md · Exact command contracts: docs/GROKBOT_PROTOCOL.md and docs/GROKBOT_WIKI.md'}</p>
  </div>;
}
