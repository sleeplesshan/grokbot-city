export function demoFlowPayload(task) {
  const brief=task.published || task.draft;
  return {id:task.id,expectedVersion:task.version,version:task.publishedVersion,flowRequestId:task.flowRequestId,
    nodes:[{id:"scope",title:"요구사항 정리",description:"지시서의 목표와 완료 기준을 확인합니다.",botId:brief.boss},{id:"research",title:"자료·근거 조사",description:"필요한 입력과 검증 근거를 수집합니다.",botId:brief.members[0] || brief.boss},{id:"build",title:"결과물 구성",description:"요구사항에 맞는 결과물을 구성합니다.",botId:brief.members[1] || brief.boss},{id:"verify",title:"통합 검증·보고",description:"조사와 제작 결과를 함께 검증하고 보고합니다.",botId:brief.boss}],
    edges:[{id:"scope-research",source:"scope",target:"research"},{id:"scope-build",source:"scope",target:"build"},{id:"research-verify",source:"research",target:"verify"},{id:"build-verify",source:"build",target:"verify"}]};
}
export function seedDemo(store) {
  store.reset();
  const actor = { kind: "bot", id: "bot-0" };
  const roles = [
    "도시 운영 · 업무 조율",
    "리서치 · 자료 조사",
    "개발 · 자동화",
    "디자인 · 시각화",
    "검증 · 품질 관리",
    "문서 · 지식 정리",
    "모니터링 · 루틴 관리",
  ];
  for (let i = 0; i < 7; i++) {
    const id = `bot-${i}`;
    store.command(
      "bot.update",
      { id, expectedVersion: 0, role: roles[i] },
      actor,
    );
    store.command(
      "instruction.publish",
      {
        id,
        expectedVersion: 1,
        text: `${roles[i]}를 담당합니다.\n\n1. 게시된 업무와 최신 지침을 먼저 확인합니다.\n2. 검증 가능한 결과와 진행률을 보고합니다.\n3. 막힌 내용은 사유와 함께 기록합니다.\n4. 실제 적용한 지침 버전만 확인 처리합니다.`,
      },
      actor,
    );
    if (i !== 2) store.command("instruction.ack", { id, version: 1 }, actor);
  }
  const items = [
    [
      "Grokbot City 운영 환경 구축",
      "봇들의 역할을 정리하고 운영 체계를 준비합니다.",
      "team",
      "bot-0",
      ["bot-2", "bot-4"],
      false,
      65,
    ],
    [
      "주간 리서치 브리핑",
      "이번 주의 주요 소식을 조사하고 근거와 함께 요약합니다.",
      "team",
      "bot-1",
      ["bot-5"],
      true,
      30,
    ],
    [
      "브랜드 에셋 라이브러리",
      "공통 시각 에셋을 정리하고 사용 가이드를 작성합니다.",
      "solo",
      "bot-3",
      [],
      false,
      0,
    ],
    [
      "운영 가이드 검토",
      "운영 지침서의 명령 예시와 오류 처리 절차를 검증합니다.",
      "solo",
      "bot-4",
      [],
      false,
      100,
    ],
  ];
  for (const [
    title,
    description,
    type,
    boss,
    members,
    routine,
    value,
  ] of items) {
    let t = store.command(
      "task.publish",
      {
        title,
        description,
        type,
        boss,
        members,
        routine,
        schedule: routine ? "매주 월요일 09:00 / Asia/Seoul" : "",
        criteria: "결과물을 검증하고 요약과 근거를 보고합니다.",
        category:
          boss === "bot-3" ? "디자인" : boss === "bot-1" ? "리서치" : "운영",
      },
      actor,
    ).result;
    t=store.command("flow.submit",demoFlowPayload(t),actor).result;
    if (value === 0) continue;
    t = store.command(
      "task.dispatch",
      { id: t.id, expectedVersion: t.version, enabled: true },
      actor,
    ).result;
    store.command(
      "task.ack",
      { id: t.id, version: t.publishedVersion, dispatchId: t.dispatchId },
      actor,
    );
    t = store.read().tasks.find((x) => x.id === t.id);
    if (value) {
      for (const [j,node] of t.flowPlan.nodes.entries()) {
        const v=value===100?100:j===0?100:j===3?0:Math.max(0,Math.min(90,value+(j===1?15:-15)));
        t=store.command("node.update",{id:t.id,runId:t.runs[0].id,expectedVersion:t.version,nodeId:node.id,status:v===100?"done":v?"active":"waiting",progress:v,note:"가상 봇의 노드 실행 예시"},actor).result;
      }
    }
  }
  for (const [title, category, description] of [
    [
      "다음 주 리서치 주제 정리",
      "리서치",
      "조사할 질문과 필요한 출처를 정리합니다.",
    ],
    [
      "봇 운영 체크리스트 작성",
      "운영",
      "담당 봇과 완료 기준을 정한 뒤 진행을 켭니다.",
    ],
    [
      "자동화 개선안 검토",
      "개발",
      "반복 업무의 자동화 범위와 검증 절차를 작성합니다.",
    ],
    ["모바일 화면 접근성 점검", "디자인", "작은 화면의 가독성과 키보드 이동 순서를 검토합니다."],
    ["일일 백업 자동화 설계", "개발", "백업 보관 정책과 실패 알림의 요구사항을 정리합니다."],
    ["팀 운영 회고 질문 작성", "운영", "주간 회고의 질문과 결과 공유 방식을 작성합니다."],
  ])
    store.command(
      "task.save",
      {
        title,
        category,
        description,
        type: "solo",
        boss: "bot-0",
        members: [],
      },
      actor,
    );
  for (const [category,color] of [["운영","mint"],["개발","sky"],["디자인","lavender"],["리서치","peach"]]) store.command("category.color",{category,color,expectedRevision:store.read().revision});
}
export function stepDemo(store) {
  const s = store.read();
  // A demo click represents the team checking its instructions before work.
  // Acknowledge the latest version once per bot, clearing older notices too.
  const changedBots=s.bots.filter(b=>b.instructionVersion>b.appliedVersion);
  if(changedBots.length){
    let response;
    for(const b of changedBots) response=store.command("instruction.ack",{id:b.id,version:b.instructionVersion},{kind:"bot",id:b.id});
    return response;
  }
  const pending=s.inbox.filter(e=>!e.acknowledgedAt&&!e.cancelledAt);
  const first=pending.find(e=>e.kind!=='wiki')||pending[0];
  const e = first?.kind==="task" ? (pending.find(e=>e.kind==="flow"&&e.targetId===first.targetId) || first) : first;
  const actor = { kind: "bot", id: "bot-0" };
  if (e) {
    if(e.kind==='wiki'){
      const job=s.wiki.jobs.find(j=>j.id===e.targetId);
      if(job.status==='pending')return store.command('wiki.job.start',{id:job.id,expectedVersion:job.version},actor);
      if(job.status==='error')return store.command('wiki.job.retry',{id:job.id,expectedVersion:job.version},actor);
      if(job.status==='linting')return store.command('wiki.commit',{id:job.id,expectedVersion:job.version,attemptId:job.attemptId,semanticReview:'가상 시연: 링크와 출처를 점검했습니다. 실제 의미 분석 결과가 아닙니다.'},actor);
      const source=s.wiki.sources.find(x=>x.id===job.sourceId),target=s.wiki.pages.find(x=>x.id===job.pageId);
      const id=target?.id||`demo-${job.sourceId||job.id}`,overview=s.wiki.pages.find(x=>x.id==='demo-index'&&!x.deletedAt);
      let pages;
      if(job.requestKind==='delete'){
        pages=[{id:target.id,expectedVersion:target.version,operation:'delete'},...s.wiki.pages.filter(p=>!p.deletedAt&&p.id!==target.id&&p.links.includes(target.id)).map(p=>({...p,expectedVersion:p.version,markdown:p.markdown.replaceAll(new RegExp(`\\[\\[${target.id}(?:\\|[^\\]]*)?\\]\\]`,'g'),'삭제된 데모 문서')}))];
      }else{
        pages=[{id,title:target?.title||source?.title||'가상 위키 문서',summary:'가상 봇이 만든 데모 지식',markdown:`# ${source?.title||target?.title||'데모 문서'}\n\n> 가상 테스트 문서입니다. 실제 LLM 의미 분석을 주장하지 않습니다.\n\n${job.text}\n\n[[demo-index]]`,sourceIds:source?[source.id]:(target?.sourceIds||[]),expectedVersion:target?.version||0}];
        if(id!=='demo-index')pages.push({id:'demo-index',title:'데모 위키 색인',summary:'실제 페이지 링크로 만든 가상 색인',markdown:`# 데모 위키 색인\n\n${[...new Set([...(overview?.links||[]),id])].map(x=>`- [[${x}]]`).join('\n')}`,sourceIds:overview?.sourceIds||[],expectedVersion:overview?.version||0});
      }
      return store.command('wiki.stage',{id:job.id,expectedVersion:job.version,attemptId:job.attemptId,pages},actor);
    }
    const target=s.tasks.find(t=>t.id===e.targetId);
    if(e.kind==="flow")return store.command("flow.submit",demoFlowPayload(target),actor);
    if(e.kind==="retrospective")return store.command("task.retrospective",{id:target.id,expectedVersion:target.version,retrospectiveRequestId:e.retrospectiveRequestId,markdown:`# ${target.published.title} · 업무결과서\n\n> 테스트 모드의 가상 결과서입니다. 실제 수행을 주장하지 않습니다.\n\n## 기술 스택\n- Grokbot City / Markdown / 검토 체크리스트\n\n## 수행 방법\n- 업무지시서와 완료 기준을 읽고 자료 수집, 작성, 검증 단계로 나누었습니다.\n- ${target.runs.length}개 실행 회차의 기록을 검토했습니다.\n\n## 시행착오와 개선\n- 샘플 데이터에는 실제 오류 원인이 기록되지 않았습니다.\n- 다음 회차에는 검증 근거와 산출물 경로를 함께 남깁니다.\n\n## 결과와 검증\n- 대시보드의 모든 회차가 완료 상태인 것을 확인했습니다.\n- 실제 산출물 검증은 이 가상 시연에 포함되지 않습니다.\n\n## 재사용할 경험\n- 작업 시작과 완료 시에만 상태를 보고하고, 필요한 중간 변화만 추가 보고합니다.`},actor);
    if(e.kind==="routine")return store.command("run.create",{id:target.id,expectedVersion:target.version},actor);
    return store.command(e.kind === "instruction" ? "instruction.ack" : "task.ack",{ id: e.targetId, version: e.version, dispatchId: e.dispatchId },actor);
  }
  const t = s.tasks.find(
    (t) =>
      t.stage === "monitor" && (t.location || "active") === "active" &&
      t.runs.length &&
      t.runs.at(-1)?.status !== "done",
  );
  if (!t) return { result: null };
  const r = t.runs.at(-1),
    sub = r.subtasks.find((x) => x.status !== "done");
  const v = Math.min(100, (sub?.progress ?? r.progress) + 20);
  return store.command(
    sub?.nodeId ? "node.update" : sub ? "subtask.upsert" : "task.report",
    {
      id: t.id,
      runId: r.id,
      expectedVersion: t.version,
      subtaskId: sub?.id,
      nodeId: sub?.nodeId,
      title: sub?.title,
      botId: sub?.botId,
      status: v === 100 ? "done" : "active",
      progress: v,
      note: "가상 봇의 테스트 보고 / Simulated report",
    },
    actor,
  );
}
