# Operating guide / 운영 가이드

Updated / 갱신: 2026-10-28

[한국어](#한국어) · [English](#english)

## 한국어

설치 PC와 절대경로를 채운 뒤 아래 프롬프트를 메인봇에게 전달하세요. 앱의 운영 가이드에서는 입력 후 복사할 수 있습니다.

```text
Grokbot City를 나와 함께 운영해 주세요.

설치 PC: {{machine}}
프로젝트 절대경로: {{path}}

먼저 위 PC와 경로에서 파일을 읽고 CLI를 실행할 수 있는지 확인하세요. 경로가 미입력이거나 연결할 수 없다면 필요한 정보만 요청하고 연결됐다고 보고하지 마세요. 다른 PC의 localhost나 GitHub 복제본을 기존 운영 환경으로 착각하지 마세요.

이 앱은 봇을 자동 호출하는 엔진이 아니라 지침·업무·진행 상황·지식을 기록하는 대시보드입니다. 실제 봇이 작업하고 CLI로 보고해야 합니다.

1. 프로젝트의 README.md, docs/OPERATING_GUIDE.md, docs/GROKBOT_CONTEXT.md, docs/GROKBOT_MIGRATION.md, docs/GROKBOT_PROTOCOL.md, docs/GROKBOT_FLOW.md, docs/GROKBOT_WIKI.md를 순서대로 읽으세요. 결과서 작성 시 docs/RETROSPECTIVE_TEMPLATE.md를 참고하세요.
2. 프로젝트 폴더에서 node scripts/bot.mjs sync, node scripts/bot.mjs bot.list, node scripts/bot.mjs wiki.index를 실행해 현재 상태를 확인하세요. 앱이 미설치 상태라면 README에 따라 설치·빌드·시작하고 기존 운영 DB가 있는지 먼저 확인하세요. 기존 DB를 초기화하거나 인증 키를 출력하지 마세요.
3. 실제 봇의 이름·사진·역할·지침을 확인해 기존 슬롯과 대응시키세요. 메인봇은 bot-0입니다. 빈 슬롯을 재사용하고 부족하면 bot.create로 추가하세요. 서버가 반환한 ID를 사용하고 중복 등록하지 마세요. 사진이나 지침을 추정해 만들지 말고 CLI 선호도는 기존 설정을 유지하세요.
4. 현재 실제 수행 중인 업무를 조사해 기존 항목과 대조한 뒤 담당자·완료 기준·노드 흐름·확인 가능한 진척을 모니터링에 반영하세요. 이 요청은 이미 진행 중인 실제 업무의 이관을 허용합니다. 미착수 계획은 지시서로 남기고 임의 실행하지 마세요. 과거 시작일과 이관 시각을 구분하세요.
5. 채팅에서 사용자가 명확히 실행을 지시한 업무도 기록 대상입니다. 기존 항목을 대조하고 없으면 메인봇이 승인 근거를 남겨 task.publish → flow.submit → task.dispatch(enabled:true) → task.ack로 등록·접수하세요. 같은 업무의 진행 토글을 사용자에게 다시 요구하지 마세요. 미승인 계획은 실행하지 않습니다. 원격 팀원이 접속하지 못하면 실제 사용 가능한 전달 경로로 메인봇에게 제목·목표·담당자·완료 기준·단계 상태·근거를 보내고 저장된 ID와 상태를 돌려받으세요. 부탁했다는 말만으로 기록 완료라 하지 마세요. 메인봇과 모든 팀원의 상시 지침에 다음 실행 관문을 넣고 세션 시작·위임 시 전달하세요: 시작 상태 저장 성공 → 실제 작업 → 결과 저장 성공. 작업 전 taskId/runId와 담당 nodeId 또는 subtaskId를 확보하세요. 최초 실행은 메인봇이 유효한 진행 요청을 task.ack하고, 노드는 node.update, 일반 하위 작업은 subtask.upsert, 하위 작업 없는 회차는 task.report로 active를 기록하세요. 대상·회차·상태·version이 담긴 성공 응답을 확인하기 전에는 실제 작업이나 위임을 진행하지 마세요. sync 조회나 bot.activity는 시작 기록을 대신하지 않습니다. 팀원에게 식별자·완료 기준·기록 책임을 함께 전달하고, CLI 접근이 없으면 권한 있는 메인봇/Boss가 기록 후 실행을 전달하세요. 완료 기준을 검증하고 done 저장 성공을 확인한 뒤 완료를 알리세요. 기록 실패 시 실행을 보류하고 오류를 보고하세요. 누락을 발견하면 기존 항목에 근거 있는 현재 상태를 반영하고 저장 결과를 보고하세요. 과거 시각이나 진척을 꾸미지 마세요. 세부 절차는 GROKBOT_CONTEXT.md의 필수 실행 관문을 따르고 지침은 실제 적용 후 instruction.ack 하세요.
6. 루틴은 완료 이력을 보존하고 다음 대기 회차를 생성하되 즉시 실행으로 해석하지 마세요. 도서관 복원은 지시서로 돌아가므로 새 진행 요청 없이 재개하지 마세요.
7. 보관 업무의 결과서 요청은 실제 수행 근거로 Markdown을 작성해 처리하세요. 위키 요청은 기존 문서와 원자료를 대조하고 raw → ingest → lint → publish로 처리하세요. Codex CLI는 프로필 설정과 사용 가능한 환경에 맞춰 활용하되 결과를 직접 검토하세요. 재사용할 지식을 연결하고 미확인 사실을 만들지 마세요. 결과서와 위키 요청은 별개입니다.
8. 등록된 봇은 wiki.source.add로 지식 메모를 raw에 추가할 수 있습니다. 프로토콜의 필수 필드·64 KiB 제한·중복 방지·비밀값 금지 규칙을 따르세요. 일반 봇은 raw 추가만 하며 위키 유지보수는 기존 메인봇 권한을 따릅니다. 위키 삭제는 명시적 사용자 요청이 필요합니다.
9. 전체 상태를 반복해서 읽거나 정기적으로 모델을 깨우지 마세요. sync와 필요한 개별 조회를 사용하고 쓰기 응답의 최신 ID·버전을 재사용하세요. 같은 쓰기 재시도에는 같은 requestId와 payload를 사용하세요. 사용자 콘텐츠나 운영 키를 공개 Git에 올리지 마세요.

최초 설정 후 연결 여부, 봇 대응표, 이관한 업무, 지침 적용 상태, 위키 처리 결과, 누락·불확실한 정보와 필요한 다음 조치를 간결히 보고하세요. 실제 수행한 일만 완료로 보고하세요. 우선 문서와 현재 상태 확인부터 진행하세요.
```

### 처음 연결하기

이 앱은 업무 장부이며 봇 실행 엔진이 아닙니다. 메인봇이 설치 PC의 파일·CLI에 접근할 수 있어야 합니다. GitHub 복제본에는 운영 DB가 없습니다. 아래 시작 프롬프트를 전달하고 연결 여부를 먼저 확인하세요.

```sh
node scripts/bot.mjs sync
node scripts/bot.mjs bot.list
```

### 봇 등록과 지침 적용

메인봇은 bot-0입니다. 기존 슬롯을 실제 봇과 대조하고 부족하면 메인봇이 bot.create로 추가합니다. 초기 7개는 한도가 아닙니다. 왼쪽에서 이름·역할·ID로 검색하고 목록을 스크롤할 수 있습니다. 프로필·지침 반영과 봇의 적용 확인은 별개입니다. 각 봇이 실제 반영한 버전만 instruction.ack 합니다. CLI 전체 적용은 선호도 공유이며 설치·실행 명령이 아닙니다.

### 업무지시서에서 실행 요청하기

개인·팀 업무를 작성하고 카테고리를 직접 입력하거나 다시 선택합니다. 카테고리명을 눌러 이름과 색을 바꿉니다. 팀은 Boss와 최대 5명입니다. 지시서 저장은 실행이 아니라 문서 확정과 플로우 작성 요청입니다. 진행을 켠 요청을 메인봇이 접수하면 모니터링으로 이동합니다. 상세 좌측에서 지시를 보고 우측에서 봇이 작성한 노드 흐름을 확인합니다.

### 모니터링과 루틴

전체·대기중·진행중·완료 필터와 칸반 보드로 확인합니다. 봇은 시작·단계 전환·막힘·완료 시 실제 상태를 보고합니다. 노드가 있으면 변경 노드만 갱신하고 상위 진행률은 집계됩니다. 루틴은 완료 회차를 보존하고 봇이 다음 대기 회차를 만듭니다. 앱은 예약 실행하지 않으며 다음 회차 생성이 즉시 시작을 뜻하지 않습니다. 실시간 화면 갱신은 SSE가 처리합니다. 활동 강조가 사라져도 업무 실패를 뜻하지 않습니다.

### 도서관·결과서·휴지통

완료 업무 보관 시 업무 도서관으로 이동하고 메인봇에게 Markdown 결과서 요청이 생깁니다. 실제 기술·방법·시행착오·검증 결과를 기록합니다. 도서관 복원은 업무지시서로 돌아가며 새 진행 요청이 필요합니다. 휴지통 복원은 이전 위치로 돌아갑니다. 휴지통 비우기는 영구 삭제입니다. 업무 복원·삭제와 독립적으로 위키와 raw는 보존됩니다.

### 업무 wiki와 MAP 운영

도서관은 업무지시서·업무 wiki·업무 wiki MAP으로 나뉩니다. 보관 업무·결과서가 raw로 쌓이면 메인봇이 기존 문서를 대조해 ingest → lint → publish 합니다. 위키는 재사용할 지식을 정리하고 실제 내부 링크로 MAP을 만듭니다. 구조 검사와 사실 검토는 별개입니다. 결과서 요청과 위키 요청도 각각 처리합니다. 수정·삭제는 화면에서 메인봇에게 요청하며 임의 삭제하지 않습니다.

```sh
node scripts/bot.mjs wiki.index
```

### 봇이 지식 메모 추가하기

등록된 모든 봇은 wiki.source.add로 raw 메모를 추가할 수 있습니다. requestId·title·Markdown text가 필수이며 tags·origin은 선택입니다. 본문은 UTF-8 64 KiB 이하입니다. 요청 ID와 본문 해시로 중복을 막고 원자료 보관함에 작성 봇과 정리 상태가 표시됩니다. 메모 추가는 위키 게시가 아닙니다. 일반 봇에 수정·삭제·위키 게시 권한을 부여하지 않습니다. 비밀 패턴 검사는 보조 장치이므로 제출 전에 민감값을 제거하세요. 상세 형식은 GROKBOT_WIKI.md를 따릅니다.

### Codex CLI와 전문 작업

봇은 현재 CLI 선호도와 업무 권한에 맞춰 도구를 사용합니다. Codex에 목표·입력·제약·완료 기준을 전달하고 실제 결과를 검토합니다. 모션 작업은 적합한 레퍼런스·라이선스를 확인하고 스토리보드·타이밍을 설계한 뒤 실제 재생/렌더로 검수합니다. 코드 생성이나 초안 완성을 게시·배포·납품 완료로 표현하지 않습니다.

### 연결 문제와 안전한 운영

변경이 대기 중이면 메인봇에게 sync를 실행하도록 요청합니다. 앱은 봇을 자동으로 깨우지 않습니다. 409는 최신 항목·버전을 다시 읽고 조정하며 오래된 실행 요청을 임의로 재사용하지 않습니다. 403은 봇 등록·권한·작업 범위를, 400은 입력 형식·크기·비밀 패턴을 확인합니다. 전체 state나 정기 모델 폴링 대신 필요한 조회만 사용하세요. 키·운영 DB는 공개 저장소에 올리지 않습니다. 현재 인증은 공유 키와 봇 ID 방식입니다. 서버 운영·백업·복구는 docs/MAINTENANCE.md의 스크립트를 따릅니다. 시연 모드는 없습니다.

## English

Fill in the installation computer and absolute path, then send this prompt to your main bot. The in-app guide provides inputs and a copy button.

```text
Please operate Grokbot City with me.

Installation computer: {{machine}}
Absolute project path: {{path}}

First verify that you can read files and run the CLI on that computer at that path. If either is unspecified or inaccessible, ask only for the missing information; do not claim access. Do not confuse another computer's localhost or a GitHub clone with the existing operational workspace.

This app records instructions, work, progress and knowledge; it does not automatically launch bots. Actual bots perform work and report through the CLI.

1. Read README.md, docs/OPERATING_GUIDE.md, docs/GROKBOT_CONTEXT.md, docs/GROKBOT_MIGRATION.md, docs/GROKBOT_PROTOCOL.md, docs/GROKBOT_FLOW.md and docs/GROKBOT_WIKI.md in order. Use docs/RETROSPECTIVE_TEMPLATE.md for result reports.
2. From the project directory, run node scripts/bot.mjs sync, node scripts/bot.mjs bot.list and node scripts/bot.mjs wiki.index. If the app is not installed, follow README to install, build and start it, first checking for existing operational data. Never reset an existing database or print credentials.
3. Map real bot names, photos, roles and instructions to existing slots. The main bot is bot-0. Reuse vacant slots and use bot.create when more are needed. Use returned IDs and avoid duplicates. Do not invent profiles or instructions; preserve current CLI preferences.
4. Inventory actual ongoing work, match existing items and import assignments, acceptance criteria, workflow nodes and evidenced progress into Monitoring. This request authorizes migration of work already underway. Leave unstarted plans as briefs. Distinguish original start dates from migration times.
5. Work explicitly authorized in chat must also be recorded. Reuse an existing task or have the main bot record the authorization and run task.publish → flow.submit → task.dispatch(enabled:true) → task.ack. Do not require a second manual toggle for the same authorized work; do not execute unapproved plans. If a remote worker cannot connect, use an actually available communication path to send the main bot the goal, assignment, acceptance criteria, step states and evidence, then receive the saved IDs and status. Sending a request does not prove it was recorded. Put this execution gate in the standing instructions of the main bot and every team member, and repeat it at session start and delegation: successful start-state write → actual work → successful result write. Before work, identify taskId/runId and the assigned nodeId or subtaskId. The main bot accepts a valid initial dispatch with task.ack; mark active through node.update for nodes, subtask.upsert for ordinary subtasks, or task.report only for runs without subtasks. Verify the target, run, status and version in a successful response before doing or delegating work. Neither sync nor bot.activity proves a start was recorded. Delegate IDs, acceptance criteria and reporting responsibility together. If a worker lacks CLI access, an authorized main bot/Boss records the state before releasing the work. Verify acceptance criteria and the successful done write before claiming completion. Hold execution and report errors when recording fails. If an update was missed, reconcile evidenced current state against existing items and report the saved result; never invent past timestamps or progress. Follow the mandatory execution gate in GROKBOT_CONTEXT.md and acknowledge instructions only after applying them.
6. Preserve completed routine runs and create the next waiting run without treating it as immediate execution. Library restoration returns to Briefs; do not resume without a new Start request.
7. Fulfill archived-work report requests using evidence-based Markdown. For wiki requests, compare raw sources and existing pages, then perform raw → ingest → lint → publish. Use Codex CLI according to current preferences and available tooling, and review its output yourself. Connect reusable knowledge without inventing facts. Report and wiki requests are separate.
8. Registered bots can contribute raw knowledge notes with wiki.source.add. Follow required fields, the 64 KiB limit, deduplication and secret-handling rules. Ordinary bots only append raw notes; wiki maintenance retains existing main-bot permissions. Page deletion requires an explicit user request.
9. Do not repeatedly read full state or schedule model polling. Use sync and targeted reads, and reuse current IDs/versions from write responses. Retry a write with the same requestId and payload. Never publish user content or operational keys to public Git.

Report connection status, bot mappings, imported work, instruction acknowledgements, wiki results, missing/uncertain information and necessary next steps. Claim only work actually performed. Begin with documentation and current-state checks.
```

### Connect for the first time

This app records work; it does not launch bots. The main bot needs access to files and the CLI on the installation computer. A GitHub clone does not contain your operational database. Send the startup prompt and verify access first.

```sh
node scripts/bot.mjs sync
node scripts/bot.mjs bot.list
```

### Register bots and apply instructions

The main bot is bot-0. Map existing slots to real bots; the main bot adds more with bot.create. The initial seven slots are not a limit. Search by name, role or ID and scroll the roster. Publishing instructions does not acknowledge them: bots use instruction.ack only after applying the exact version. Shared CLI preferences do not install or execute tools.

### Request execution from briefs

Create individual or team briefs and enter or reuse categories. Click a category name to edit its name and color. A team has a Boss and up to five members. Saving finalizes the brief and requests a flow plan; it does not execute work. Enabling Start requests acceptance by the main bot, then the task moves to Monitoring. Details pair the brief with the bot-authored workflow.

### Monitoring and routines

Use All, Waiting, In progress and Completed filters with the Kanban board. Bots report actual starts, milestones, blockers and completion. Update changed nodes; parent progress is aggregated. Bots preserve completed routine runs and create the next waiting run. The app does not schedule execution, and creating a run does not start it. SSE updates the screen; an expired activity highlight is not a failure.

### Library, reports and trash

Archiving completed work moves it to the library and requests a Markdown result report from the main bot. Record actual methods, tools, lessons and verification. Library restoration returns to Briefs and needs a new Start request. Trash restoration returns to its previous location; emptying trash is permanent. Wiki pages and raw sources survive task restoration and deletion.

### Operate the wiki and MAP

The library has Briefs, Wiki and Wiki MAP views. Archived tasks and reports become raw sources; the main bot checks existing pages and performs ingest → lint → publish. Pages capture reusable knowledge, and actual internal links form the MAP. Structural lint is not factual review. Report requests and wiki requests are separate. Request edits or deletion through the UI; do not delete pages without an explicit request.

```sh
node scripts/bot.mjs wiki.index
```

### Let bots contribute knowledge notes

Every registered bot may append a raw note with wiki.source.add. requestId, title and Markdown text are required; tags and origin are optional. Text is limited to 64 KiB in UTF-8. Request IDs and content hashes prevent duplicates; the raw archive shows author and curation status. Adding a note is not publication and grants no editing, deletion or publishing rights to ordinary bots. Secret detection is heuristic: remove sensitive values before submission. See GROKBOT_WIKI.md for the exact contract.

### Codex CLI and specialist work

Bots follow current CLI preferences and task permissions. Give Codex the goal, inputs, constraints and acceptance criteria, then verify its actual output. For motion work, review relevant references and licenses, plan timing and storyboards, and inspect real playback/renders. Code generation or a finished draft does not mean publication, deployment or delivery is complete.

### Troubleshooting and safe operation

If changes remain pending, ask the main bot to run sync; the app does not wake it automatically. For 409, reload the relevant item/version and reconcile; do not revive stale execution requests. For 403, check registration, permission and assignment; for 400, check input, size and secret detection. Prefer targeted reads over full state or scheduled model polling. Keep keys and operational databases out of public Git. Authentication uses a shared key plus bot ID. Follow docs/MAINTENANCE.md for server operation, backups and recovery. There is no demo mode.

## Reference / 상세 규약

- [Operating context / 운영 맥락](GROKBOT_CONTEXT.md)
- [Migration / 이관](GROKBOT_MIGRATION.md)
- [CLI protocol / CLI 규약](GROKBOT_PROTOCOL.md)
- [Flow / 업무 흐름](GROKBOT_FLOW.md)
- [Wiki / 위키](GROKBOT_WIKI.md)
- [Reports / 결과서](RETROSPECTIVE_TEMPLATE.md)
- [Installation / 설치](../README.md)
- [Server operation, backup and recovery / 서버 운영·백업·복구](MAINTENANCE.md)
