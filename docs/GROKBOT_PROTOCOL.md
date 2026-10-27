# Grokbot City 봇 프로토콜

## 노드 플로우 추가

`flow.submit`과 `node.update`의 예제·검증·스냅샷 규약은 [GROKBOT_FLOW.md](./GROKBOT_FLOW.md)를 참조합니다. `sync`는 flowRequestId/flowVersion만 추가하며 그래프 전체를 반환하지 않습니다. `task.get`에서 필요한 업무의 flowPlan/run.flowPlan을 읽으세요. node.update의 기본 응답은 변경 노드와 부모 집계만 포함합니다. 지시 변경마다 새 flow 토큰이 생기며, 과거 회차는 해당 회차의 플로우를 보존합니다.

## 현재 권장 진입점 — 최소 조회 / 작업 경계 보고

`node scripts/bot.mjs` 또는 `node scripts/bot.mjs sync`는 전체 상태가 아닌 변경함과 업무 요약을 반환합니다. `inbox`는 미처리 요청만 반환하며 instruction/task/flow/routine/retrospective 다섯 종류를 처리합니다. 실행 지시는 저장과 분리된 진행 토글로 요청됩니다. UI는 지시서 저장 하나만 제공합니다.

```powershell
node scripts/bot.mjs sync
node scripts/bot.mjs inbox
node scripts/bot.mjs task.get --id TASK_ID
node scripts/bot.mjs bot.get --id bot-0
```

`task.get` 응답은 `{revision,task}`, `bot.get`은 `{revision,bot}`입니다. 변경하지 않은 업무·전체 이력을 반복해서 읽지 마세요. 기본 쓰기 응답은 `{revision,result}`이며 업무의 result에는 id/version/stage/location/publishedVersion/acceptedVersion/dispatchId/retrospectiveRequestId/retrospectiveReady와 **run(단수)** 이 있습니다. run에는 id/status/progress/subtasks가 있습니다. 다음 요청은 응답의 version과 run.id를 재사용합니다. `--full` 또는 `state`는 진단할 때만 사용합니다.

### 입력 예: 대기중 회차의 시작 / 완료

`start.json` (TASK_ID/RUN_ID/VERSION은 최근 조회 또는 쓰기 응답의 값):

```json
{"id":"TASK_ID","expectedVersion":12,"runId":"RUN_ID","status":"active","progress":0,"note":"요구사항 확인 후 실행 시작","blocked":false,"requestId":"unique-start-id"}
```

`node scripts/bot.mjs task.report --file start.json --bot bot-0`

실제 작업 후 완료 기준을 검증하고 다음 payload를 보냅니다. expectedVersion은 위 시작 응답의 result.version으로 교체합니다.

```json
{"id":"TASK_ID","expectedVersion":13,"runId":"RUN_ID","status":"done","progress":100,"note":"완료: 산출물 경로. 검증: 실제 확인 결과.","blocked":false,"requestId":"unique-done-id"}
```

하위 작업이 있으면 task.report 대신 subtask.upsert를 사용하고 `subtaskId`,`title`,`botId`를 추가합니다. 상위 상태는 자동 집계됩니다. 새 하위 작업은 subtaskId 없이 추가하고 응답에 반환된 ID를 다음에 재사용합니다. title은 하위작업 이름, task.publish의 title/description은 상위 업무 제목/지시사항입니다.

### 루틴 완료 후

`routine` 변경함은 완료한 runId를 알려줍니다. 메인봇/Boss가 `run.create`에 `{id,expectedVersion,requestId}`를 보내면 새 waiting0 회차와 요청 확인이 함께 저장됩니다. 지난 회차는 보존됩니다. 새 회차 시작 시 active0을 보고하고 실행하세요. 다음 회차를 생성했다고 즉시 실행하거나 예약 시각을 무시하지 마세요. 과거 회차의 쓰기는 거절됩니다.

### 업무 도서관 결과서

보관 시 `retrospective` 요청과 `retrospectiveRequestId`가 생성됩니다. 메인봇만 `task.retrospective`에 `{id,expectedVersion,retrospectiveRequestId,markdown,requestId}`를 제출할 수 있습니다. 요청 토큰은 idempotency requestId와 다릅니다. Markdown은 최대100,000자, UTF-8 파일이며 기술 스택/방법/시행착오/결과/검증 근거를 포함합니다. 템플릿: `docs/RETROSPECTIVE_TEMPLATE.md`.

```powershell
node scripts/bot.mjs retrospective --file result-payload.json --markdown-file result.md --bot bot-0
```

result-payload.json에는 markdown을 제외한 나머지 필드를 넣습니다. 제출하면 도서관 문서와 요청 확인이 함께 저장됩니다. 라이브러리에 있는 동안 실행 진척은 수정할 수 없습니다. 복원/삭제 시 대기 요청은 취소되고 늦은 제출은409입니다. 재보관은 새 요청을 만들고 이전 문서는 교체 전까지 보존됩니다. 다운로드: GET `/api/retrospective?id=TASK_ID&workspace=live` (기존 API 접근 경계, Markdown attachment, 휴지통 제외).

### 분류 편집

사용자 `category.update`: `{category,name,color,expectedRevision}`. trim1–100자, 충돌 이름 거절. 미분류 category/name은 둘 다 빈 문자열이며 색만 변경합니다. 현재 draft/published 분류와 카테고리 후보·색상을 원자적으로 바꾸고 해당 task.version을 올립니다. 과거 run.brief, publishedVersion, dispatchId는 그대로입니다.

작업 시작/주요 변화/완료 때만 보고하세요. 정기 모델 폴링·heartbeat는 필요 없습니다. 브라우저 SSE는 모델 토큰 없이 화면을 갱신합니다. 상세 운영 기준은 `GROKBOT_CONTEXT.md`를 따릅니다.

---


## 업무지시서 → 모니터링 (2026-10-27 변경)

작성과 실행은 분리됩니다. `task.save` / `task.publish`는 지시서만 저장하며 실행 회차나 시작 알림을 만들지 않습니다. `category`에 자유롭게 카테고리를 입력하세요(최대 100자, 앞뒤 공백 제거). 입력한 카테고리는 `state.categories`에 보관되어 다시 선택할 수 있습니다. 빈 카테고리는 미분류로 표시됩니다.

사용자가 진행 토글을 켜면 `task.dispatch`가 현재 초안을 게시 스냅샷으로 확정하고 변경함에 `dispatchId`를 생성합니다. `stage:"brief"`, `ready:true`인 동안 업무지시서에 남습니다.

```json
{
  "id": "TASK_ID",
  "expectedVersion": 1,
  "enabled": true,
  "requestId": "start-request-001"
}
```

`node scripts/bot.mjs task.dispatch --file dispatch.json`

메인봇은 변경함의 최신 `version`, `dispatchId`를 읽고 아래처럼 접수합니다. 브라우저 사용자나 팀원은 접수할 수 없습니다.

```json
{
  "id": "TASK_ID",
  "version": 1,
  "dispatchId": "DISPATCH_ID_FROM_INBOX",
  "requestId": "accept-start-001"
}
```

`node scripts/bot.mjs task.ack --file accept.json --bot bot-0`

접수는 첫 실행의 시작을 뜻합니다. 한 트랜잭션으로 `stage:"monitor"`로 이동하고 진행중 0% 회차를 한 번 생성합니다. 양수 진척은 실제 보고 후 반영합니다. `run.create`로 최초 접수를 우회할 수 없습니다. 완료 및 루틴 이력도 모니터링에 남습니다.

OFF(`enabled:false`) 또는 접수 대기 중 저장·수정은 기존 요청을 취소합니다. 취소된 변경 항목(`cancelledAt`)은 처리하지 마세요. 다시 ON하면 새로운 `dispatchId`가 필요하며 오래된 요청은 409입니다. 이미 접수된 업무는 진행 토글을 사용하지 않습니다. 모니터링에서 수정 게시한 추가 버전의 확인은 기존 `task.ack` 지시 버전 확인 방식이며 실행 회차를 추가로 생성하지 않습니다.

프로젝트 폴더에서 실행합니다. 서버가 켜져 있어야 하며 Node 24 이상이 필요합니다. CLI는 `data/config.json`과 `data/bot.key`를 읽어 루프백 서버에 인증합니다. DB를 직접 수정하지 마세요.

```powershell
node scripts/bot.mjs state
node scripts/bot.mjs bot.list
node scripts/bot.mjs inbox
node scripts/bot.mjs instruction.ack --file payload.json --bot bot-1 --workspace live
```

`--bot` 기본값은 `bot-0`, `--workspace` 기본값은 `live`입니다. 입력 파일은 UTF-8 JSON이며 BOM도 허용합니다. 성공 출력은 JSON, 실패는 JSON 오류와 종료 코드 1입니다. 쓰기 응답은 `{result, revision}`이며 기본 CLI는 result를 요약합니다 (`--full`로 원본 조회). `version`은 편집 충돌 검사, `instructionVersion`/`publishedVersion`은 게시 지시 버전입니다.

## 읽기와 쓰기

| 명령                         | JSON 필드                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `state`                      | 없음. 봇·업무·변경함·이력 조회                                                                                                             |
| `bot.list`                   | 없음. 봇 프로필 목록                                                                                                                       |
| `inbox`                      | 없음. 미확인 변경 전체. `recipient`로 담당 봇 구분                                                                                         |
| `bot.update`                 | `id`, `expectedVersion`, 변경할 `name`, `role`, `avatar`                                                                                   |
| `instruction.save`           | `id`, `expectedVersion`, `text`; 초안 저장                                                                                                 |
| `instruction.publish`        | `id`, `expectedVersion`, `text`; 게시 버전 및 변경함 생성                                                                                  |
| `instruction.ack`            | `id`, `version`; 실제 적용한 지침 게시 버전                                                                                                |
| `task.save` / `task.publish` | `title`, `description`, `criteria`, `type`, `boss`, `members`, `routine`, `schedule`, `category`; 기존 업무는 `id`, `expectedVersion` 추가 |
| `task.ack`                   | `id`, `version`, 최초 접수 시 `dispatchId`; 메인봇만 접수 가능                                                                             |
| `task.report`                | `id`, `expectedVersion`, `runId`, `status`, `progress`, `note`, `blocked`; 하위 작업 없는 회차                                             |
| `subtask.upsert`             | 위 필드 + `title`, `botId`; 기존 하위 작업이면 `subtaskId` 추가                                                                            |
| `run.create`                 | `id`, `expectedVersion`; 이전 회차 완료 필요. 루틴 또는 새 게시 버전의 비루틴 업무                                                         |
| `run.adopt`                  | `id`, `expectedVersion`, `runId`, 필요시 `reassign`; 미완료 회차에 최신 게시 지시를 적용                                                   |

모든 쓰기에 고유 문자열 `requestId`를 넣으세요. 동일 ID+동일 요청은 이전 결과를 돌려주며, 같은 ID에 다른 내용은 409입니다. `expectedVersion` 누락·불일치는 409입니다. `instruction.ack`와 `task.ack`는 게시 `version`을 사용하며 중복·구버전 확인은 최신 적용 메타데이터를 낮추지 않습니다.

## 예제: 프로필 등록

먼저 `bot.list`로 `version`을 확인합니다. 예를 들어 버전 0이면:

```json
{
  "id": "bot-1",
  "expectedVersion": 0,
  "name": "Research Bot",
  "role": "근거 수집과 자료 검증",
  "avatar": "/assets/research-bot.png",
  "requestId": "profile-research-001"
}
```

`node scripts/bot.mjs bot.update --file profile.json --bot bot-0`

이미지 파일은 `public/assets/`에 넣고 `npm run build`를 실행합니다. `avatar`는 로컬 `/assets/` 경로만 받습니다. 빈 문자열은 기본 아바타로 돌아갑니다.

## 예제: 지침 게시와 실제 적용 확인

```json
{
  "id": "bot-1",
  "expectedVersion": 1,
  "text": "근거를 검증하고 출처와 함께 보고한다.",
  "requestId": "instruction-publish-001"
}
```

`node scripts/bot.mjs instruction.publish --file instruction.json --bot bot-0`

실제 지침을 적용한 다음:

```json
{ "id": "bot-1", "version": 1, "requestId": "instruction-ack-001" }
```

`node scripts/bot.mjs instruction.ack --file ack.json --bot bot-1`

## 예제: 팀 업무 게시

```json
{
  "title": "주간 리서치 브리핑",
  "description": "이번 주 이슈를 조사하고 출처를 검증하여 요약한다.",
  "criteria": "중복 제거, 출처 명시, 결과 파일 경로 보고",
  "type": "team",
  "boss": "bot-1",
  "members": ["bot-5"],
  "routine": true,
  "schedule": "매주 월요일 09:00 Asia/Seoul",
  "requestId": "weekly-research-create-001"
}
```

`node scripts/bot.mjs task.publish --file task.json --bot bot-0`

저장 응답에는 아직 실행 회차가 없습니다. 사용자 진행 요청(`task.dispatch`) 후 변경함에서 `dispatchId`를 읽고 아래와 같이 접수합니다. 접수 응답의 `result.run.id`를 진척 보고에 사용합니다.

```json
{
  "id": "TASK_ID",
  "version": 1,
  "dispatchId": "DISPATCH_ID_FROM_INBOX",
  "requestId": "weekly-research-accept-001"
}
```

## 예제: 하위 작업 보고

```json
{
  "id": "TASK_ID",
  "expectedVersion": 2,
  "runId": "RUN_ID",
  "title": "자료 수집",
  "botId": "bot-1",
  "status": "active",
  "progress": 40,
  "note": "확인된 출처 4건. 결과: output/research.md",
  "blocked": false,
  "requestId": "research-step-001"
}
```

`node scripts/bot.mjs subtask.upsert --file report.json --bot bot-1`

후속 수정에는 응답의 `result.run.subtasks`에서 대상 작업의 `id`를 찾아 `subtaskId`로 추가하고 최신 업무 `version`을 읽어 사용합니다. 같은 작업을 수정하면서 `subtaskId`를 생략하면 새 작업이 생성됩니다. 존재하지 않는 ID를 주면 404입니다.

`status`는 `waiting`, `active`, `done`. 대기는 0%, 완료는 100%이며 진행중은 0–99%입니다. 하위 작업 평균이 상위 진척이 되고 모든 하위 작업 완료 시 상위도 완료됩니다. 막힘·보고 내용은 하위 작업마다 보존합니다. 완료 시 `blocked:false`로 보고하세요.

## 지시 개정과 회차

회차는 생성 시점의 `brief`와 `instructionVersion`을 보존합니다. 업무 수정 게시는 최신 문서를 바꾸고 알림을 생성하지만 기존 회차를 바꾸지 않습니다. 적용하려면 다음을 보냅니다:

```json
{
  "id": "TASK_ID",
  "expectedVersion": 7,
  "runId": "RUN_ID",
  "reassign": { "SUBTASK_WITH_REMOVED_OWNER": "bot-2" },
  "requestId": "adopt-v2-001"
}
```

`node scripts/bot.mjs run.adopt --file adopt.json --bot bot-0`

`reassign`은 최신 팀에서 제외된 하위 작업 담당자마다 필요하며 새 팀에 속한 봇을 지정합니다. 메인봇 또는 기존 회차 Boss가 적용할 수 있습니다. 완료된 회차는 적용할 수 없고 당시 문서를 유지합니다. 사용자의 UI 적용은 제외된 담당자를 새 Boss로 지정하며 사유와 함께 기록합니다.

루틴 다음 회차 생성은 `run.create`입니다. 비루틴 업무는 이전 회차와 다른 최신 게시 버전이 있을 때만 새 회차를 만들 수 있습니다. 미완료 회차가 남아 있으면 추가 생성은 거절됩니다. 반복 설명을 입력하는 것만으로 예약 실행되지 않습니다.

## HTTP 인터페이스

- `GET /api/state?workspace=live`: 전체 상태.
- `POST /api/command`: `{ "action":"task.report", "payload":{...} }`.
- 헤더: `Authorization: Bearer <local key>`, `X-Bot-Id: bot-0`, `X-Workspace: live`, `Content-Type: application/json`.
- `GET /api/health`: 연결 확인.
- 시연용 API는 제공하지 않습니다. `workspace=demo`와 `X-Workspace: demo`는 거절됩니다.

브라우저는 별도의 HttpOnly 세션 쿠키와 CSRF 토큰을 사용합니다. 봇 인증키를 브라우저에 넣지 마세요. 브라우저의 수동 지침 확인·진척·지시 적용 요청에는 `reason`이 필수이고 출처는 `user`로 기록됩니다.

실패: 400 입력 오류, 401 봇 인증 오류, 403 권한/세션 오류, 404 ID 없음, 409 버전·요청 ID 충돌, 413 요청 크기 초과. 409 후 최신 상태를 읽고 변경 내용을 검토해 새 요청 ID로 재작성합니다. 네트워크 실패로 결과가 불명확하면 동일 요청 ID와 내용으로 재시도합니다.

## Added commands and event stream

- Browser/user `bot.cli`: `{id, expectedVersion, tool: "codex"|"claudeCode"|"other", usage:"active"|"occasional"|"never"}`. Creates instruction notification and increments its version. Bots read `cliUsage` and acknowledge only after applying it.
- Bot `bot.activity`: optional `{targetId,sessionId,active}`, TTL30s. Do not schedule model calls to renew it; normal start/milestone/finish reports are sufficient. One activity per bot. Targets: bot ID or active task/subtask ID. No history spam. Stop uses same sessionId; stale stop ignored.
- User `task.archive`, `task.trash`, `task.restore`: `{id,expectedVersion}`. Archive/trash require all runs done. Library execution is read-only; only task.retrospective can write the requested knowledge document. Trash is read-only. Restore resets pending dispatch; trash restores previousLocation.
- User `trash.empty`: `{expectedRevision,confirm:true,count}`. Current count must match. Purges tasks, their inbox/history and related idempotency entries; backup files remain independent.
- `category.color`: `{category,color,expectedRevision}`; color is mint/rose/lavender/sky/peach/lemon/neutral. Stored in workspace `categoryColors` keyed by category name (empty name is uncategorized).
- `GET /api/events?workspace=live`: same access boundary as API, SSE `change` event data `{revision,workspace}`, initial event on connect and 15s heartbeat comments. Fetch `/api/state` after events. Close old stream on workspace switch. `/api/state` includes `activities` with expiresAt; clients remove expired highlights locally.

CLI example: save activity JSON to a file, then `node scripts/bot.mjs bot.activity --file activity.json --workspace live --bot bot-0`. Browser-only commands cannot be sent using bot credentials.

## 업무 도서관 복원

업무 도서관에서 복원하면 `location:active`, `stage:brief`로 업무지시서에 돌아갑니다. 진행 토글은 꺼지고 기존 실행 이력·플로우 스냅샷·업무결과서 Markdown은 보존됩니다. 복원 자체로 업무나 루틴을 재개하지 마세요. 사용자가 지시서를 검토하고 진행을 켠 다음, 메인봇이 새 `dispatchId`로 `task.ack` 해야 모니터링에 새 회차가 생성됩니다. 휴지통 복원은 기존 위치로 돌아가는 정책을 유지합니다.

## 독립 업무 위키

업무 도서관의 업무지시서 / 업무 wiki / 업무 wiki MAP을 제공합니다. 보관 시 원자료를 독립 저장하고, 메인봇이 변경함의 `kind:wiki`를 읽어 raw → ingest → lint → publish 순서로 지식을 연결합니다. 업무 복원·삭제·휴지통 비우기는 위키·원자료에 영향을 주지 않습니다. 위키 추가·수정·삭제는 사용자 요청을 메인봇이 처리합니다. 정확한 CLI payload와 내용 검토 절차는 [GROKBOT_WIKI.md](GROKBOT_WIKI.md)를 따르세요.


<a id="botcreate"></a>
## bot.create — 실제 봇 추가

초기 7개는 시작용 슬롯이며 등록 봇 수의 고정 한도가 아닙니다. 이 명령은 인증된 메인봇(`--bot bot-0`)만 사용할 수 있습니다. 기존 DB를 초기화하거나 기존 ID를 변경하지 않습니다. 먼저 `bot.list`로 기존 매핑과 빈 슬롯을 확인하세요.

UTF-8 `new-bot.json` 예제 (실제 봇 정보로 교체):

```json
{
  "requestId": "register-research-agent-2026-10-27",
  "name": "리서치봇",
  "role": "자료 조사와 출처 검증",
  "avatar": ""
}
```

```powershell
node scripts/bot.mjs bot.create --file new-bot.json --bot bot-0
```

- 필수: `requestId`(공백이 아닌 고유 문자열, 최대 150자), `name`(공백이 아닌 이름, 최대 300자).
- 선택: `role`(최대 3,000자), `avatar`(최대 2,048자, 빈 문자열 또는 `/assets/` 하위 로컬 경로).
- `id`는 입력하지 않습니다. 현재 최대 번호 다음의 `bot-N`을 트랜잭션 안에서 발급합니다. 예를 들어 기존 `bot-0`~`bot-6`이면 `bot-7`입니다. 응답의 `result.id`와 `result.version`을 다음 명령에 사용하세요.
- 같은 `requestId`와 동일 payload로 재시도하면 기존 결과를 반환합니다. 다른 내용으로 재사용하면 409 오류입니다. 서로 다른 생성 요청에는 다른 ID를 사용하세요. 이름이 같아도 별도 봇을 만들 수 있으므로 재실행 전 대응표와 `bot.list`를 확인하세요.
- 새 봇의 지침과 적용 이력은 비어 있습니다. `instruction.publish` 후 실제 반영한 버전만 `instruction.ack` 하세요.
- 메인봇의 `cliApplyAll`이 켜져 있으면 CLI 선호도를 상속합니다. 기본값과 다른 선호도를 상속하면 지침 버전 1의 확인 요청이 생깁니다. 자동 적용 확인은 하지 않습니다.
- 화면은 기존 SSE로 새 봇과 개수를 반영합니다. 추가 봇 목록은 검색·스크롤할 수 있습니다. 팀 업무의 Boss 외 최대 5명 규칙은 바뀌지 않습니다.
