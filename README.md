# Grokbot City

[English](#english) · [한국어](#한국어) · [Documentation / 문서](docs/README.md)

## English

A local-first dashboard for coordinating bots, tracking task flows, and building a persistent LLM wiki. React + TypeScript + Node.js + SQLite. Korean and English interfaces, local Paperlogy fonts, dark theme, and reduced-motion-aware animations.

The dashboard does not automatically connect to Grok or run an LLM. Your main bot reads the operating documents and updates profiles, task status and knowledge through the CLI.

## Features

- One main bot and an expandable bot roster (seven initial slots), versioned instructions and acknowledgements.
- Per-bot CLI preferences with a main-bot shared setting.
- Category task boards, individual/team assignment, explicit dispatch and bot acceptance.
- Monitoring by waiting / active / completed status, subtasks and routine run history.
- Split task detail with a bot-authored workflow graph and live node progress.
- Task library, recoverable trash, Markdown result reports.
- Independent raw sources, LLM-maintained wiki, structural lint, reviewed atomic publication and a linked knowledge map.
- SSE updates without refreshing the page. Bots report on work boundaries, not timed model polling.

## Quick start

Requires **Node.js 24 or newer** and npm.

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4318**. First launch creates `data/config.json`, a local bot credential, and `data/live.sqlite`. The workspace starts with placeholder bot slots and no sample tasks. There is no demo mode or simulation API in the running application.

For frontend development, keep the API server running and use `npm run dev` in another terminal. Vite proxies `/api` to port4318.

## Connect your main bot

Give the bot these files:

1. [Operating context](docs/GROKBOT_CONTEXT.md)
2. [Real profiles and ongoing-work migration](docs/GROKBOT_MIGRATION.md)
3. [CLI / API protocol](docs/GROKBOT_PROTOCOL.md)
4. [Task flow contract](docs/GROKBOT_FLOW.md)
5. [LLM wiki operations](docs/GROKBOT_WIKI.md)

```sh
node scripts/bot.mjs sync
node scripts/bot.mjs help
```

The main bot can add profiles with `bot.create`; existing databases and bot IDs are preserved. See the [creation contract](docs/GROKBOT_PROTOCOL.md#botcreate). There is no fixed roster-size limit; each team task still allows up to five members besides its Boss.

CLI writes use JSON files, expected versions and request tokens. Keep `data/bot.key` private. The dashboard does not install or execute external CLIs when preferences change.

## Task lifecycle

Write a brief → enable dispatch → main bot accepts → monitor → complete → archive in the task library.

Restoring from the library returns a task to briefs, preserving past runs and reports. A new dispatch must be accepted before another run starts. Bots also create the next routine run; the app has no task scheduler.

Archiving completed work captures independent raw sources and queues wiki work for the main bot. The bot follows ingest → lint → publish to maintain linked Markdown. Restoring or deleting the original task preserves wiki pages and sources. Wiki deletion is handled by the main bot in response to an explicit user request.

## Windows background operation

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-startup.ps1
```

The startup shortcut launches the server hidden after Windows login. Logs are written to `logs/`. Rebuild after frontend changes; restart after server changes. The server listens on loopback only.

Optional private remote access through Tailscale:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/configure-tailscale.ps1
```

This configures Tailscale Serve and restricts requests to the configured device-owner login. Review the script before running it on another machine. It does not enable public Funnel access. Personal hostnames and credentials remain in ignored `data/` files.

## Backups

```sh
node scripts/backup.mjs
```

Creates a consistent SQLite snapshot in `data/backups/<timestamp>/live.sqlite`. Authentication keys and machine configuration are not included. Restore only while the server is stopped; preserve the existing database and its WAL/SHM files separately before restoring a snapshot. Do not copy over a running database.

## Verification

```sh
npm test
npm run build
```

Automated tests run in isolated temporary databases. Simulation fixtures live only in `tests/helpers/`; production server code does not import them. Prior local demo data, if any, is left untouched and is inaccessible through the application.

## Project layout

- `src/app/`: dashboard shell and UI orchestration.
- `src/features/tasks/`, `src/features/wiki/`: task flow and wiki views.
- `src/styles/`: shared styling; `src/types.ts`: shared contracts.
- `server/index.mjs`: HTTP/SSE and access checks.
- `server/domain/`: SQLite state transactions and wiki operations.
- `scripts/`: bot CLI, backup and Windows operations.
- `docs/`: bot handoff and API contracts.
- `public/`: local fonts and generated visual assets.
- `data/`, `logs/`, `.dual-brain/`: local-only files excluded from Git.

See [architecture](docs/ARCHITECTURE.md) for responsibilities and data flow.

## License

Project source: [MIT](LICENSE). Bundled fonts and dependencies retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).


---

## 한국어

봇의 지침, 업무 흐름, 지속적으로 쌓이는 LLM 위키를 관리하는 로컬 대시보드입니다. React + TypeScript + Node.js + SQLite를 사용하며, 한국어·영어 UI, 로컬 Paperlogy 폰트, 다크 테마, 움직임 감소 설정을 지원합니다.

외부 Grok 서비스에 자동 연결하거나 LLM을 실행하지 않습니다. 메인봇이 운영 문서를 읽고 CLI를 통해 실제 프로필, 업무 상태, 위키를 업데이트합니다.

### 주요 기능

- 메인봇과 필요한 만큼 확장하는 봇 목록(초기 7개 슬롯), 지침 버전 관리와 적용 확인.
- 봇별 CLI 활용 설정 및 메인봇의 전체 적용.
- 카테고리별 업무지시서 보드, 개인·팀 배정, 명시적인 진행 요청과 봇 접수.
- 대기중·진행중·완료 모니터링, 세부 작업과 루틴 회차 이력.
- 업무 상세와 봇이 작성한 노드 플로우, 실시간 단계별 진행 상태.
- 업무 도서관, 복원 가능한 휴지통, Markdown 결과서.
- 독립 원자료, LLM 위키, 구조 검사와 검토 후 일괄 게시, 연결된 지식 지도.
- 새로고침 없는 SSE 업데이트. 봇은 작업 시작·단계 전환·완료 시 보고하며 주기적인 모델 호출은 필요하지 않습니다.

### 빠른 시작

**Node.js 24 이상**과 npm이 필요합니다.

```sh
npm ci
npm run build
npm start
```

**http://127.0.0.1:4318**에 접속합니다. 최초 실행 시 `data/config.json`, 로컬 봇 인증 키, `data/live.sqlite`가 생성됩니다. 초기 상태는 빈 봇 슬롯이며 샘플 업무가 없습니다. 운영 앱에는 시연 모드나 시뮬레이션 API가 없습니다.

프런트엔드 개발 시 API 서버를 켜 둔 채 다른 터미널에서 `npm run dev`를 실행합니다. Vite가 `/api` 요청을 4318 포트로 전달합니다.

### 메인봇 연결

메인봇에게 아래 문서를 전달합니다.

1. [운영 맥락](docs/GROKBOT_CONTEXT.md)
2. [실제 프로필·진행 업무 마이그레이션](docs/GROKBOT_MIGRATION.md)
3. [CLI / API 규약](docs/GROKBOT_PROTOCOL.md)
4. [업무 플로우 규약](docs/GROKBOT_FLOW.md)
5. [LLM 위키 운영](docs/GROKBOT_WIKI.md)

```sh
node scripts/bot.mjs sync
node scripts/bot.mjs help
```

메인봇은 `bot.create`로 봇을 추가할 수 있습니다. 기존 DB와 봇 ID를 보존하며, 정확한 입력은 [추가 명령 규약](docs/GROKBOT_PROTOCOL.md#botcreate)을 따릅니다. 등록 봇 수에 고정 제한은 없고, 개별 팀 업무의 팀원은 Boss 외 최대 5명입니다.

CLI 변경 요청은 JSON 파일, 예상 버전, 요청 토큰을 사용합니다. `data/bot.key`는 비공개로 유지합니다. CLI 활용 설정을 바꾸어도 대시보드가 외부 CLI를 설치하거나 실행하지는 않습니다.

### 업무 흐름

업무지시서 작성 → 진행 ON → 메인봇 접수 → 모니터링 → 완료 → 업무 도서관.

도서관에서 복원하면 업무지시서로 돌아갑니다. 이전 실행 이력과 결과서는 보존하며, 새 진행 요청이 접수되어야 새 회차가 시작됩니다. 루틴의 다음 회차도 봇이 만들며 앱 자체 업무 스케줄러는 없습니다.

완료 업무를 보관하면 독립 raw 원자료를 저장하고 메인봇에게 위키 작업을 전달합니다. 메인봇은 ingest → lint → publish 순서로 연결된 Markdown을 게시합니다. 원업무를 복원·삭제해도 위키와 원자료는 보존됩니다. 위키 삭제는 사용자의 명시적 요청을 메인봇이 처리합니다.

### Windows 백그라운드 실행

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-startup.ps1
```

시작 프로그램 바로가기는 Windows 로그인 후 서버를 숨김 실행합니다. 로그는 `logs/`에 저장됩니다. 화면 코드 변경 후에는 다시 빌드하고, 서버 코드 변경 후에는 서버를 재시작합니다. 서버는 루프백 주소에서만 수신합니다.

선택적으로 Tailscale을 통한 개인 원격 접속을 설정할 수 있습니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/configure-tailscale.ps1
```

Tailscale Serve를 설정하고 지정된 기기 소유자 로그인으로 요청을 제한합니다. 다른 컴퓨터에서는 실행 전 스크립트를 확인하세요. 공개 Funnel은 활성화하지 않습니다. 개인 호스트명과 인증 정보는 Git에서 제외된 `data/`에 보관합니다.

### 백업과 복구

```sh
node scripts/backup.mjs
```

일관된 SQLite 스냅샷을 `data/backups/<timestamp>/live.sqlite`에 저장합니다. 인증 키와 기기 설정은 포함하지 않습니다. 복구는 서버를 중지한 뒤 진행하며, 기존 DB와 WAL/SHM 파일을 별도로 보존한 후 스냅샷을 복원합니다. 실행 중인 DB를 덮어쓰지 마세요.

### 검증

```sh
npm test
npm run build
```

자동 테스트는 격리된 임시 DB에서 실행합니다. 시뮬레이션 데이터는 `tests/helpers/`에만 있으며 운영 서버에서 불러오지 않습니다. 기존 로컬 시연 데이터가 있더라도 그대로 보존하며 앱에서는 접근할 수 없습니다.

### 폴더 구조

- `src/app/`: 대시보드 셸과 화면 조정.
- `src/features/tasks/`, `src/features/wiki/`: 업무 플로우와 위키 화면.
- `src/styles/`: 공통 스타일. `src/types.ts`: 공통 타입.
- `server/index.mjs`: HTTP/SSE와 접근 제어.
- `server/domain/`: SQLite 상태 트랜잭션과 위키 처리.
- `scripts/`: 봇 CLI, 백업, Windows 운영 스크립트.
- `docs/`: 봇 전달 문서와 API 규약.
- `public/`: 로컬 폰트와 생성 이미지.
- `data/`, `logs/`, `.dual-brain/`: Git에서 제외하는 로컬 파일.

자세한 책임 분리와 데이터 흐름은 [아키텍처 문서](docs/ARCHITECTURE.md)를 참고하세요.

### 라이선스

프로젝트 소스는 [MIT](LICENSE) 라이선스입니다. 포함된 폰트와 의존성은 각자의 라이선스를 유지합니다. [외부 자산 고지](THIRD_PARTY_NOTICES.md)를 확인하세요.
