# Maintenance / 설치 후 관리

[English README](../README.md) · [한국어 README](../README.ko.md)

## English

### Windows background operation

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

### Backups

```sh
node scripts/backup.mjs
```

Creates a consistent SQLite snapshot in `data/backups/<timestamp>/live.sqlite`. Authentication keys and machine configuration are not included. Restore only while the server is stopped; preserve the existing database and its WAL/SHM files separately before restoring a snapshot. Do not copy over a running database.

### Development and verification

Run commands from the project root. For frontend development, keep the API server running with `npm start` and run `npm run dev` in another terminal. Vite proxies `/api` requests to port 4318.

```sh
npm test
npm run build
```

Automated tests run in isolated temporary databases. Simulation fixtures live only in `tests/helpers/`; production server code does not import them. Prior local demo data, if any, is left untouched and is inaccessible through the application.

### Project layout

- `src/app/`: dashboard shell and UI orchestration.
- `src/features/tasks/`, `src/features/wiki/`: task flow and wiki views.
- `src/styles/`: shared styling; `src/types.ts`: shared contracts.
- `server/index.mjs`: HTTP/SSE and access checks.
- `server/domain/`: SQLite state transactions and wiki operations.
- `scripts/`: bot CLI, backup and Windows operations.
- `docs/`: bot handoff and API contracts.
- `public/`: local fonts and generated visual assets.
- `data/`, `logs/`, `.dual-brain/`: local-only files excluded from Git.

See [architecture](ARCHITECTURE.md) for responsibilities and data flow.

---

## 한국어

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

### 개발과 검증

명령은 프로젝트 루트 폴더에서 실행합니다. 화면을 개발할 때는 `npm start`로 API 서버를 켜 둔 채 다른 터미널에서 `npm run dev`를 실행하세요. Vite가 `/api` 요청을 4318 포트로 전달합니다.

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

자세한 책임 분리와 데이터 흐름은 [아키텍처 문서](ARCHITECTURE.md)를 참고하세요.

