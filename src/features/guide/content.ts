export const guideContent = {
  "ko": {
    "sections": [
      {
        "title": "처음 연결하기",
        "text": "이 앱은 업무 장부이며 봇 실행 엔진이 아닙니다. 메인봇이 설치 PC의 파일·CLI에 접근할 수 있어야 합니다. GitHub 복제본에는 운영 DB가 없습니다. 아래 시작 프롬프트를 전달하고 연결 여부를 먼저 확인하세요.",
        "commands": [
          "node scripts/bot.mjs sync",
          "node scripts/bot.mjs bot.list"
        ]
      },
      {
        "title": "봇 등록과 지침 적용",
        "text": "메인봇은 bot-0입니다. 기존 슬롯을 실제 봇과 대조하고 부족하면 메인봇이 bot.create로 추가합니다. 초기 7개는 한도가 아닙니다. 왼쪽에서 이름·역할·ID로 검색하고 목록을 스크롤할 수 있습니다. 프로필·지침 반영과 봇의 적용 확인은 별개입니다. 각 봇이 실제 반영한 버전만 instruction.ack 합니다. CLI 전체 적용은 선호도 공유이며 설치·실행 명령이 아닙니다.",
        "commands": []
      },
      {
        "title": "업무지시서에서 실행 요청하기",
        "text": "개인·팀 업무를 작성하고 카테고리를 직접 입력하거나 다시 선택합니다. 카테고리명을 눌러 이름과 색을 바꿉니다. 팀은 Boss와 최대 5명입니다. 지시서 저장은 실행이 아니라 문서 확정과 플로우 작성 요청입니다. 진행을 켠 요청을 메인봇이 접수하면 모니터링으로 이동합니다. 상세 좌측에서 지시를 보고 우측에서 봇이 작성한 노드 흐름을 확인합니다.",
        "commands": []
      },
      {
        "title": "모니터링과 루틴",
        "text": "전체·대기중·진행중·완료 필터와 칸반 보드로 확인합니다. 봇은 시작·단계 전환·막힘·완료 시 실제 상태를 보고합니다. 노드가 있으면 변경 노드만 갱신하고 상위 진행률은 집계됩니다. 루틴은 완료 회차를 보존하고 봇이 다음 대기 회차를 만듭니다. 앱은 예약 실행하지 않으며 다음 회차 생성이 즉시 시작을 뜻하지 않습니다. 실시간 화면 갱신은 SSE가 처리합니다. 활동 강조가 사라져도 업무 실패를 뜻하지 않습니다.",
        "commands": []
      },
      {
        "title": "도서관·결과서·휴지통",
        "text": "완료 업무 보관 시 업무 도서관으로 이동하고 메인봇에게 Markdown 결과서 요청이 생깁니다. 실제 기술·방법·시행착오·검증 결과를 기록합니다. 도서관 복원은 업무지시서로 돌아가며 새 진행 요청이 필요합니다. 휴지통 복원은 이전 위치로 돌아갑니다. 휴지통 비우기는 영구 삭제입니다. 업무 복원·삭제와 독립적으로 위키와 raw는 보존됩니다.",
        "commands": []
      },
      {
        "title": "업무 wiki와 MAP 운영",
        "text": "도서관은 업무지시서·업무 wiki·업무 wiki MAP으로 나뉩니다. 보관 업무·결과서가 raw로 쌓이면 메인봇이 기존 문서를 대조해 ingest → lint → publish 합니다. 위키는 재사용할 지식을 정리하고 실제 내부 링크로 MAP을 만듭니다. 구조 검사와 사실 검토는 별개입니다. 결과서 요청과 위키 요청도 각각 처리합니다. 수정·삭제는 화면에서 메인봇에게 요청하며 임의 삭제하지 않습니다.",
        "commands": [
          "node scripts/bot.mjs wiki.index"
        ]
      },
      {
        "title": "봇이 지식 메모 추가하기",
        "text": "등록된 모든 봇은 wiki.source.add로 raw 메모를 추가할 수 있습니다. requestId·title·Markdown text가 필수이며 tags·origin은 선택입니다. 본문은 UTF-8 64 KiB 이하입니다. 요청 ID와 본문 해시로 중복을 막고 원자료 보관함에 작성 봇과 정리 상태가 표시됩니다. 메모 추가는 위키 게시가 아닙니다. 일반 봇에 수정·삭제·위키 게시 권한을 부여하지 않습니다. 비밀 패턴 검사는 보조 장치이므로 제출 전에 민감값을 제거하세요. 상세 형식은 GROKBOT_WIKI.md를 따릅니다.",
        "commands": []
      },
      {
        "title": "Codex CLI와 전문 작업",
        "text": "봇은 현재 CLI 선호도와 업무 권한에 맞춰 도구를 사용합니다. Codex에 목표·입력·제약·완료 기준을 전달하고 실제 결과를 검토합니다. 모션 작업은 적합한 레퍼런스·라이선스를 확인하고 스토리보드·타이밍을 설계한 뒤 실제 재생/렌더로 검수합니다. 코드 생성이나 초안 완성을 게시·배포·납품 완료로 표현하지 않습니다.",
        "commands": []
      },
      {
        "title": "연결 문제와 안전한 운영",
        "text": "변경이 대기 중이면 메인봇에게 sync를 실행하도록 요청합니다. 앱은 봇을 자동으로 깨우지 않습니다. 409는 최신 항목·버전을 다시 읽고 조정하며 오래된 실행 요청을 임의로 재사용하지 않습니다. 403은 봇 등록·권한·작업 범위를, 400은 입력 형식·크기·비밀 패턴을 확인합니다. 전체 state나 정기 모델 폴링 대신 필요한 조회만 사용하세요. 키·운영 DB는 공개 저장소에 올리지 않습니다. 현재 인증은 공유 키와 봇 ID 방식입니다. 서버 운영·백업·복구는 docs/MAINTENANCE.md의 스크립트를 따릅니다. 시연 모드는 없습니다.",
        "commands": []
      }
    ],
    "prompt": "Grokbot City를 나와 함께 운영해 주세요.\n\n설치 PC: {{machine}}\n프로젝트 절대경로: {{path}}\n\n먼저 위 PC와 경로에서 파일을 읽고 CLI를 실행할 수 있는지 확인하세요. 경로가 미입력이거나 연결할 수 없다면 필요한 정보만 요청하고 연결됐다고 보고하지 마세요. 다른 PC의 localhost나 GitHub 복제본을 기존 운영 환경으로 착각하지 마세요.\n\n이 앱은 봇을 자동 호출하는 엔진이 아니라 지침·업무·진행 상황·지식을 기록하는 대시보드입니다. 실제 봇이 작업하고 CLI로 보고해야 합니다.\n\n1. 프로젝트의 README.md, docs/OPERATING_GUIDE.md, docs/GROKBOT_CONTEXT.md, docs/GROKBOT_MIGRATION.md, docs/GROKBOT_PROTOCOL.md, docs/GROKBOT_FLOW.md, docs/GROKBOT_WIKI.md를 순서대로 읽으세요. 결과서 작성 시 docs/RETROSPECTIVE_TEMPLATE.md를 참고하세요.\n2. 프로젝트 폴더에서 node scripts/bot.mjs sync, node scripts/bot.mjs bot.list, node scripts/bot.mjs wiki.index를 실행해 현재 상태를 확인하세요. 앱이 미설치 상태라면 README에 따라 설치·빌드·시작하고 기존 운영 DB가 있는지 먼저 확인하세요. 기존 DB를 초기화하거나 인증 키를 출력하지 마세요.\n3. 실제 봇의 이름·사진·역할·지침을 확인해 기존 슬롯과 대응시키세요. 메인봇은 bot-0입니다. 빈 슬롯을 재사용하고 부족하면 bot.create로 추가하세요. 서버가 반환한 ID를 사용하고 중복 등록하지 마세요. 사진이나 지침을 추정해 만들지 말고 CLI 선호도는 기존 설정을 유지하세요.\n4. 현재 실제 수행 중인 업무를 조사해 기존 항목과 대조한 뒤 담당자·완료 기준·노드 흐름·확인 가능한 진척을 모니터링에 반영하세요. 이 요청은 이미 진행 중인 실제 업무의 이관을 허용합니다. 미착수 계획은 지시서로 남기고 임의 실행하지 마세요. 과거 시작일과 이관 시각을 구분하세요.\n5. 이후에는 지침을 실제 적용한 뒤 instruction.ack 하세요. 지시서 저장만으로 실행하지 말고 진행 ON의 최신 요청을 메인봇이 접수한 뒤 시작하세요. 작업 시작·의미 있는 단계 전환·막힘·완료 시 필요한 노드와 상태만 보고하세요. 완료 기준을 검증한 뒤 완료 처리하세요.\n6. 루틴은 완료 이력을 보존하고 다음 대기 회차를 생성하되 즉시 실행으로 해석하지 마세요. 도서관 복원은 지시서로 돌아가므로 새 진행 요청 없이 재개하지 마세요.\n7. 보관 업무의 결과서 요청은 실제 수행 근거로 Markdown을 작성해 처리하세요. 위키 요청은 기존 문서와 원자료를 대조하고 raw → ingest → lint → publish로 처리하세요. Codex CLI는 프로필 설정과 사용 가능한 환경에 맞춰 활용하되 결과를 직접 검토하세요. 재사용할 지식을 연결하고 미확인 사실을 만들지 마세요. 결과서와 위키 요청은 별개입니다.\n8. 등록된 봇은 wiki.source.add로 지식 메모를 raw에 추가할 수 있습니다. 프로토콜의 필수 필드·64 KiB 제한·중복 방지·비밀값 금지 규칙을 따르세요. 일반 봇은 raw 추가만 하며 위키 유지보수는 기존 메인봇 권한을 따릅니다. 위키 삭제는 명시적 사용자 요청이 필요합니다.\n9. 전체 상태를 반복해서 읽거나 정기적으로 모델을 깨우지 마세요. sync와 필요한 개별 조회를 사용하고 쓰기 응답의 최신 ID·버전을 재사용하세요. 같은 쓰기 재시도에는 같은 requestId와 payload를 사용하세요. 사용자 콘텐츠나 운영 키를 공개 Git에 올리지 마세요.\n\n최초 설정 후 연결 여부, 봇 대응표, 이관한 업무, 지침 적용 상태, 위키 처리 결과, 누락·불확실한 정보와 필요한 다음 조치를 간결히 보고하세요. 실제 수행한 일만 완료로 보고하세요. 우선 문서와 현재 상태 확인부터 진행하세요."
  },
  "en": {
    "sections": [
      {
        "title": "Connect for the first time",
        "text": "This app records work; it does not launch bots. The main bot needs access to files and the CLI on the installation computer. A GitHub clone does not contain your operational database. Send the startup prompt and verify access first.",
        "commands": [
          "node scripts/bot.mjs sync",
          "node scripts/bot.mjs bot.list"
        ]
      },
      {
        "title": "Register bots and apply instructions",
        "text": "The main bot is bot-0. Map existing slots to real bots; the main bot adds more with bot.create. The initial seven slots are not a limit. Search by name, role or ID and scroll the roster. Publishing instructions does not acknowledge them: bots use instruction.ack only after applying the exact version. Shared CLI preferences do not install or execute tools.",
        "commands": []
      },
      {
        "title": "Request execution from briefs",
        "text": "Create individual or team briefs and enter or reuse categories. Click a category name to edit its name and color. A team has a Boss and up to five members. Saving finalizes the brief and requests a flow plan; it does not execute work. Enabling Start requests acceptance by the main bot, then the task moves to Monitoring. Details pair the brief with the bot-authored workflow.",
        "commands": []
      },
      {
        "title": "Monitoring and routines",
        "text": "Use All, Waiting, In progress and Completed filters with the Kanban board. Bots report actual starts, milestones, blockers and completion. Update changed nodes; parent progress is aggregated. Bots preserve completed routine runs and create the next waiting run. The app does not schedule execution, and creating a run does not start it. SSE updates the screen; an expired activity highlight is not a failure.",
        "commands": []
      },
      {
        "title": "Library, reports and trash",
        "text": "Archiving completed work moves it to the library and requests a Markdown result report from the main bot. Record actual methods, tools, lessons and verification. Library restoration returns to Briefs and needs a new Start request. Trash restoration returns to its previous location; emptying trash is permanent. Wiki pages and raw sources survive task restoration and deletion.",
        "commands": []
      },
      {
        "title": "Operate the wiki and MAP",
        "text": "The library has Briefs, Wiki and Wiki MAP views. Archived tasks and reports become raw sources; the main bot checks existing pages and performs ingest → lint → publish. Pages capture reusable knowledge, and actual internal links form the MAP. Structural lint is not factual review. Report requests and wiki requests are separate. Request edits or deletion through the UI; do not delete pages without an explicit request.",
        "commands": [
          "node scripts/bot.mjs wiki.index"
        ]
      },
      {
        "title": "Let bots contribute knowledge notes",
        "text": "Every registered bot may append a raw note with wiki.source.add. requestId, title and Markdown text are required; tags and origin are optional. Text is limited to 64 KiB in UTF-8. Request IDs and content hashes prevent duplicates; the raw archive shows author and curation status. Adding a note is not publication and grants no editing, deletion or publishing rights to ordinary bots. Secret detection is heuristic: remove sensitive values before submission. See GROKBOT_WIKI.md for the exact contract.",
        "commands": []
      },
      {
        "title": "Codex CLI and specialist work",
        "text": "Bots follow current CLI preferences and task permissions. Give Codex the goal, inputs, constraints and acceptance criteria, then verify its actual output. For motion work, review relevant references and licenses, plan timing and storyboards, and inspect real playback/renders. Code generation or a finished draft does not mean publication, deployment or delivery is complete.",
        "commands": []
      },
      {
        "title": "Troubleshooting and safe operation",
        "text": "If changes remain pending, ask the main bot to run sync; the app does not wake it automatically. For 409, reload the relevant item/version and reconcile; do not revive stale execution requests. For 403, check registration, permission and assignment; for 400, check input, size and secret detection. Prefer targeted reads over full state or scheduled model polling. Keep keys and operational databases out of public Git. Authentication uses a shared key plus bot ID. Follow docs/MAINTENANCE.md for server operation, backups and recovery. There is no demo mode.",
        "commands": []
      }
    ],
    "prompt": "Please operate Grokbot City with me.\n\nInstallation computer: {{machine}}\nAbsolute project path: {{path}}\n\nFirst verify that you can read files and run the CLI on that computer at that path. If either is unspecified or inaccessible, ask only for the missing information; do not claim access. Do not confuse another computer's localhost or a GitHub clone with the existing operational workspace.\n\nThis app records instructions, work, progress and knowledge; it does not automatically launch bots. Actual bots perform work and report through the CLI.\n\n1. Read README.md, docs/OPERATING_GUIDE.md, docs/GROKBOT_CONTEXT.md, docs/GROKBOT_MIGRATION.md, docs/GROKBOT_PROTOCOL.md, docs/GROKBOT_FLOW.md and docs/GROKBOT_WIKI.md in order. Use docs/RETROSPECTIVE_TEMPLATE.md for result reports.\n2. From the project directory, run node scripts/bot.mjs sync, node scripts/bot.mjs bot.list and node scripts/bot.mjs wiki.index. If the app is not installed, follow README to install, build and start it, first checking for existing operational data. Never reset an existing database or print credentials.\n3. Map real bot names, photos, roles and instructions to existing slots. The main bot is bot-0. Reuse vacant slots and use bot.create when more are needed. Use returned IDs and avoid duplicates. Do not invent profiles or instructions; preserve current CLI preferences.\n4. Inventory actual ongoing work, match existing items and import assignments, acceptance criteria, workflow nodes and evidenced progress into Monitoring. This request authorizes migration of work already underway. Leave unstarted plans as briefs. Distinguish original start dates from migration times.\n5. Acknowledge instructions only after applying them. Saving a brief does not authorize execution: the main bot accepts the current Start request before beginning. Report starts, meaningful milestones, blockers and completion through targeted node/status updates. Verify acceptance criteria before marking completion.\n6. Preserve completed routine runs and create the next waiting run without treating it as immediate execution. Library restoration returns to Briefs; do not resume without a new Start request.\n7. Fulfill archived-work report requests using evidence-based Markdown. For wiki requests, compare raw sources and existing pages, then perform raw → ingest → lint → publish. Use Codex CLI according to current preferences and available tooling, and review its output yourself. Connect reusable knowledge without inventing facts. Report and wiki requests are separate.\n8. Registered bots can contribute raw knowledge notes with wiki.source.add. Follow required fields, the 64 KiB limit, deduplication and secret-handling rules. Ordinary bots only append raw notes; wiki maintenance retains existing main-bot permissions. Page deletion requires an explicit user request.\n9. Do not repeatedly read full state or schedule model polling. Use sync and targeted reads, and reuse current IDs/versions from write responses. Retry a write with the same requestId and payload. Never publish user content or operational keys to public Git.\n\nReport connection status, bot mappings, imported work, instruction acknowledgements, wiki results, missing/uncertain information and necessary next steps. Claim only work actually performed. Begin with documentation and current-state checks."
  }
} as const;
