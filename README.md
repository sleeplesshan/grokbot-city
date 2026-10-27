# Grokbot City

A local-first dashboard for coordinating bots, tracking task flows, and building a persistent LLM wiki. React + TypeScript + Node.js + SQLite. Korean and English interfaces, local Paperlogy fonts, dark theme, and reduced-motion-aware animations.

봇의 실제 업무와 지침을 관리하는 로컬 대시보드입니다. 외부 Grok 서비스에 자동 연결하거나 LLM을 실행하지 않습니다. 메인봇이 문서를 읽고 CLI로 프로필, 업무 상태, 위키를 업데이트합니다.

## Features

- Main bot and six additional bot slots, versioned instructions and acknowledgements.
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

CLI writes use JSON files, expected versions and request tokens. Keep `data/bot.key` private. The dashboard does not install or execute external CLIs when preferences change.

## Task lifecycle

업무지시서 작성 → 진행 ON → 메인봇 접수 → 모니터링 → 완료 → 업무 도서관.

도서관 복원은 업무지시서로 돌아갑니다. 과거 실행 이력과 결과서를 보존하고, 새 진행 요청을 접수해야 새 회차가 시작됩니다. 루틴의 다음 회차도 봇이 생성하며 앱 자체 스케줄러는 없습니다.

완료 업무를 보관하면 독립 raw 원자료가 남고 메인봇에게 위키 작업이 전달됩니다. 메인봇은 ingest → lint → publish 순서로 연결된 Markdown을 게시합니다. 원업무를 복원·삭제해도 위키와 원자료는 보존됩니다. 위키 삭제는 사용자의 명시적 요청을 메인봇이 처리합니다.

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

- `src/`: React UI and graph views.
- `server/`: SQLite transactions, access checks, HTTP/SSE and wiki operations.
- `scripts/`: bot CLI, backup and Windows operations.
- `docs/`: bot handoff and API contracts.
- `public/`: local fonts and generated visual assets.
- `data/`, `logs/`, `.dual-brain/`: local-only files excluded from Git.

## License

Project source: [MIT](LICENSE). Bundled fonts and dependencies retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
