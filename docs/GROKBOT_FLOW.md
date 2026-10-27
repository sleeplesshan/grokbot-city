# 노드 플로우 운영 규약

이 문서는 기존 `GROKBOT_CONTEXT.md`의 작업 경계 보고 규칙에 플로우 계획과 노드 보고를 추가합니다. 앱은 LLM을 호출하거나 지시 내용을 자동 해석하지 않습니다. 실제 그록봇이 지시서를 읽고 플로우 JSON을 제출합니다.

## 1. 지시서 저장 → 플로우 작성

`task.publish`로 지시서가 저장되면 메인봇 변경함에 `kind:"flow"` 요청이 생깁니다. `sync` 또는 `inbox`로 발견한 후 해당 업무만 `task.get --id TASK_ID`로 읽으세요. 플로우 요청은 **계획 작성 요청**이며 업무 실행 허가가 아닙니다. 실제 실행은 진행 토글과 메인봇 task.ack 절차를 따릅니다.

메인봇 또는 현재 게시 지시의 Boss가 `flow.submit`을 보냅니다. 가능하면 최초 task.ack 전에 제출하여 첫 회차부터 노드를 사용할 수 있게 하세요. 호환성을 위해 플로우가 없는 기존 업무도 접수할 수 있지만, 실행 전에 계획을 등록하는 것을 기본으로 합니다.

```json
{
  "id": "TASK_ID",
  "expectedVersion": 1,
  "version": 1,
  "flowRequestId": "CURRENT_FLOW_REQUEST_ID",
  "requestId": "unique-plan-request-id",
  "nodes": [
    {"id":"scope","title":"요구사항 정리","description":"지시서의 목표와 완료 기준을 확인합니다.","botId":"bot-0"},
    {"id":"research","title":"자료 조사","description":"필요한 입력과 검증 근거를 수집합니다.","botId":"bot-1"},
    {"id":"build","title":"결과물 구성","description":"확정된 요구사항으로 결과물을 만듭니다.","botId":"bot-2"},
    {"id":"verify","title":"통합 검증","description":"조사·제작 결과를 검증하고 완료 근거를 보고합니다.","botId":"bot-0"}
  ],
  "edges": [
    {"id":"a","source":"scope","target":"research"},
    {"id":"b","source":"scope","target":"build"},
    {"id":"c","source":"research","target":"verify"},
    {"id":"d","source":"build","target":"verify"}
  ]
}
```

`node scripts/bot.mjs flow.submit --file flow.json --bot bot-0`

위 담당자는 예시입니다. 실제 지시서의 Boss·팀원만 지정하세요. 개인 업무는 모든 노드에 해당 담당자를 사용합니다. 전체 구조는 최대100노드/400연결선의 순환 없는 그래프입니다. 보통3–8개의 의미 있는 단계로 충분하며, 토큰 절약을 위해 문장 단위로 쪼개지 마세요. 안정적인 짧은 node ID를 유지하세요. 존재하지 않는 연결 대상, 중복 ID, 순환, 배정 밖 담당자는 거절됩니다.

연결선은 실제 선행 관계입니다. 독립 작업만 병렬 분기시키세요. 앱은 순환을 검증하지만 의존 업무 실행을 자동 강제하거나 작업을 실행하지 않습니다. 봇이 선행 결과를 확인하고 실행해야 합니다. 분기 조건이 있으면 description 또는 edge label에 설명하고, 실제 선택 결과를 note에 기록하세요. 조건 실행 엔진이나 노드 건너뛰기를 지원한다고 가정하지 마세요.

## 2. 노드를 시작·완료할 때 짧게 보고

회차 생성 시 플로우는 `run.flowPlan`에 복사되고 각 노드는 `subtasks[].nodeId`로 하위 작업과 연결됩니다. 상태·진척의 원본은 이 하위 작업 하나뿐입니다. 노드 상태와 목록 상태를 별도로 쓰지 마세요.

```json
{"id":"TASK_ID","runId":"RUN_ID","nodeId":"research","expectedVersion":5,"status":"active","requestId":"unique-node-start"}
```

`node scripts/bot.mjs node.update --file node.json --bot bot-1`

시작 보고를 마친 뒤 실제 작업합니다. 의미 있는 중간 결과가 있으면 progress와 짧은 note를 추가하고, 검증 후 같은 노드에 status:"done"을 보냅니다. progress 생략 시 waiting/active는0, done은100입니다. 이미 진척이 있는 노드를 다시 active로 보고할 때는 현재 실제 progress를 명시하여0으로 되돌리지 마세요.

```json
{"id":"TASK_ID","runId":"RUN_ID","nodeId":"research","expectedVersion":6,"status":"active","progress":60,"note":"핵심 출처3건 검증 완료","requestId":"unique-node-milestone"}
```

```json
{"id":"TASK_ID","runId":"RUN_ID","nodeId":"research","expectedVersion":7,"status":"done","note":"조사 결과와 출처 검증 완료: 결과 경로","blocked":false,"requestId":"unique-node-done"}
```

기존 note/blocked는 생략하면 유지됩니다. 막힘이 해소되면 blocked:false를 명시하세요. 작업을 하지 않은 노드는 waiting으로 둡니다. 여러 담당자가 독립 노드를 동시에 active로 둘 수 있습니다. 마지막 노드 완료 시 부모 업무가 자동 완료되므로 별도의 task.report는 필요하지 않습니다.

기본 응답은 `{revision,result:{id,version,stage,location,run:{id,status,progress},node:{id,nodeId,status,progress}}}` 등 후속 보고에 필요한 짧은 데이터입니다. 다음 보고에 응답 version을 재사용합니다. 병렬 쓰기가409로 충돌하면 대상 업무만 다시 읽고 새 버전으로 재시도합니다. 모든 노드·전체 이력을 매번 반환하거나 다시 전송하지 마세요.

## 3. 지시 수정, 적용, 과거 회차

- 지시를 새로 저장하면 기존 미처리 flow 요청을 취소하고 새 버전 요청을 만듭니다. 오래된 토큰/버전으로 제출하면409입니다.
- 새 계획 제출은 현재 회차에 자동 적용되지 않습니다. 실행중 화면의 우측은 **선택한 회차**의 플로우입니다. 업무지시서 화면은 최신 저장 지시의 계획을 보여줍니다. 아직 새 계획이 없다면 이전 계획임을 표시합니다.
- 현재 회차에 적용하려면 새 계획을 검토하고 `run.adopt`를 사용합니다. 같은 node ID의 진행 기록은 유지됩니다. 보고된 노드를 삭제하거나 재명명한 ID로 교체하여 진척을 지우는 적용은 거절됩니다. 큰 구조 변경은 다음 회차에서 적용하세요.
- 기존 하위 작업이 있지만 플로우 연결이 없는 업무는 연결선을 추측하지 않고 목록 노드로 표시합니다. 이미 진척을 보고한 레거시 업무에 새 그래프를 덮어쓰지 않습니다. 기존 회차를 마치고 다음 회차에서 사용하세요.
- 루틴의 새 회차는 최신 지시 버전에 맞는 계획을 복사하고 모든 노드를 waiting0으로 시작합니다. 지난 회차의 그래프·노드 상태는 그대로 남습니다.
- 도서관·휴지통·이전 실행 회차의 노드 갱신은 거절됩니다. 보관 시 플로우 작성 요청도 취소됩니다.
- 카테고리 이름/색만 바뀌는 것은 분류 메타데이터이며 플로우를 무효화하지 않습니다.

## 4. 화면 갱신과 토큰

보고는 노드 진입, 의미 있는 변화·막힘, 노드 완료 때만 합니다. 상태가 바뀌면 SSE가 브라우저에 전달하고 노드 테두리·상태·진행 막대·연결선 및 현재 작업 목록이 실시간으로 갱신됩니다. 활동 표시용 정기 모델 호출이나 전체 그래프 재전송은 필요 없습니다. 사용자가 선택한 노드와 확대/이동 위치는 상태 보고만으로 초기화하지 않습니다.

업무결과서에는 핵심 노드의 수행 방법·결과·시행착오를 요약하고, 실제 검증 근거를 남기세요.
