# Architecture / 아키텍처

## Layout / 구조

```text
src/
  main.tsx                 React bootstrap / React 진입점
  app/App.tsx              Shell, state and dialogs / 셸·상태·모달
  types.ts                 Shared UI contracts / 공통 UI 타입
  features/
    tasks/FlowPanel.tsx     Task workflow graph / 업무 플로우
    wiki/                  Wiki views, graph, types and CSS / 위키 화면·타입·스타일
  styles/global.css        Shared theme and layout / 공통 테마·레이아웃
server/
  index.mjs                HTTP, authentication and SSE / HTTP·인증·SSE
  domain/
    store.mjs              SQLite state and task mutations / DB 상태·업무 변경
    wiki.mjs               Wiki source, job and page operations / 위키 원자료·작업·페이지
scripts/                   Stable CLI and operation entrypoints / CLI·운영 진입점
tests/
  *.test.mjs               Isolated domain, HTTP and CLI tests / 격리 테스트
  helpers/demo.mjs         Test fixtures only / 테스트 전용 데이터
docs/                      Bot contracts and maintenance guides / 봇 규약·관리 문서
public/
  assets/                  Visual assets / 이미지
  fonts/                   Local Paperlogy and its license / 폰트·라이선스
data/                      Ignored database, keys and machine config / 비공개 DB·키·설정
logs/                      Ignored runtime logs / 비공개 실행 로그
```

## English

The browser sends user changes to the local HTTP server. Bots use `scripts/bot.mjs` to read compact context and submit authenticated reports. The server validates versions, permissions and request tokens before committing state to SQLite. SSE announces revisions; the UI fetches the updated snapshot and animates changed cards, workflow nodes and wiki links. A browser fallback refresh is independent of model calls.

`server/index.mjs` owns transport, access control and runtime paths. `domain/store.mjs` owns durable state and task lifecycle; `domain/wiki.mjs` handles independent knowledge sources, ingestion jobs, lint and reviewed publication. The app does not invoke an LLM or schedule bot work. Actual bots report when work starts, changes stage or finishes.

Task briefs, monitoring runs and archived reports have distinct lifecycles. Restoring a library task returns it to briefs. Wiki sources and pages remain independent of task restoration or deletion. Main-bot edits use explicit requests, versions and atomic publication.

The UI shell currently coordinates shared state and dialogs in `App.tsx`; task-flow and wiki rendering are feature modules. Global styles load from the bootstrap; wiki styles live beside their feature. Shared task types remain at `src/types.ts` to avoid feature-to-feature dependencies.

Keep `server/index.mjs`, `scripts/` and `docs/GROKBOT_*.md` entrypoints stable: startup shortcuts, CLI users and bot handoffs refer to them. Runtime data and credentials are never source assets. Production imports no simulation fixtures. Run `npm test` and `npm run build` after moving modules.

## 한국어

브라우저는 사용자 변경을 로컬 HTTP 서버로 전달합니다. 봇은 `scripts/bot.mjs`로 필요한 맥락을 읽고 인증된 보고를 전송합니다. 서버는 버전·권한·요청 토큰을 검증한 뒤 SQLite에 상태를 저장합니다. SSE가 변경 버전을 알리면 UI가 새 스냅샷을 읽고 카드·업무 노드·위키 연결의 변화를 애니메이션으로 표시합니다. 브라우저의 보조 갱신은 모델 호출과 무관합니다.

`server/index.mjs`는 통신·접근 제어·실행 경로를 담당합니다. `domain/store.mjs`는 영속 상태와 업무 수명주기를, `domain/wiki.mjs`는 독립 지식 원자료·수집 작업·검사·검토 후 게시를 담당합니다. 앱은 LLM을 호출하거나 봇 업무를 예약 실행하지 않습니다. 실제 봇이 작업 시작·단계 변경·완료 시 보고합니다.

업무지시서, 모니터링 실행 회차, 보관 결과서는 서로 다른 수명주기를 갖습니다. 도서관에서 복원하면 업무지시서로 돌아갑니다. 위키 원자료와 페이지는 업무 복원·삭제와 독립적으로 보존됩니다. 메인봇은 명시적인 요청과 버전을 사용해 위키를 일괄 게시합니다.

현재 `App.tsx`는 공통 상태와 모달을 조정하고, 업무 플로우와 위키 렌더링은 기능별 모듈로 분리되어 있습니다. 공통 스타일은 진입점에서 불러오며, 위키 스타일은 해당 기능 옆에 둡니다. 공통 업무 타입은 기능 간 의존성을 피하도록 `src/types.ts`에 유지합니다.

시작 프로그램 바로가기·CLI 사용자·봇 전달 문서가 참조하는 `server/index.mjs`, `scripts/`, `docs/GROKBOT_*.md` 경로는 유지합니다. 실행 데이터와 인증 정보는 소스에 포함하지 않습니다. 운영 코드에서는 시뮬레이션 데이터를 불러오지 않습니다. 모듈을 이동한 뒤에는 `npm test`와 `npm run build`를 실행합니다.
