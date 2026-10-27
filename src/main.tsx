import React, {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  BookOpen, Trash2, Archive, RotateCcw, Palette, Pencil, Download,
  Activity,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Command,
  Crown,
  FileText,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  ScrollText,
  Clock3,
  AlertCircle,
} from "lucide-react";
import type { Bot, Brief, Task, Run, Subtask, State, Status } from "./types";
import "./style.css";
import {FlowPanel} from "./FlowPanel";
import WikiLibrary from './WikiLibrary';
import './wiki.css';

type Lang = "ko" | "en";
const strings = {
  ko: {
    monitorSaveHint: "수정한 지시는 봇이 확인한 뒤 현재 회차에 명시적으로 적용합니다.",
    categoryEdit: "카테고리 편집", categoryName: "카테고리 이름", categoryHint: "분류 이름과 색상을 바꿉니다. 이전 실행 기록은 유지됩니다.", resultReport: "업무결과서", resultPending: "결과서 작성 대기", resultReady: "경험 기록 완료", resultHint: "메인봇이 기술 스택·방법·시행착오·결과를 정리하면 여기에 표시됩니다.", downloadMd: "Markdown 다운로드", executionHistory: "실행 이력", routineNext: "봇이 다음 회차를 준비합니다", botManaged: "봇의 작업 보고에 따라 카드가 이동합니다.", savedNotStarted: "저장 후 진행을 켜야 봇에게 실행 요청이 전달됩니다.",
    library: "업무 도서관", trash: "휴지통", archive: "보관", delete: "삭제", restore: "복원", emptyTrash: "휴지통 비우기", purgeHint: "개 업무와 실행 이력을 영구 삭제합니다. 복원할 수 없습니다. 계속할까요?", cli: "CLI 활용", cliHint: "선택은 봇의 운영 지침으로 전달됩니다. 기타 도구의 이름과 사용법은 그록봇에 요청하세요.", occasional: "가끔 활용", never: "사용하지 않음", intensive: "적극 활용", other: "기타 (그록봇에 요청)", realtime: "실시간 연결", fallback: "재연결 중 · 주기 갱신", touching: "봇 작업 보고 중", boardColor: "보드 색상", storedHint: "완료 업무의 방법과 결과, 시행착오를 지식과 경험으로 쌓아둡니다.",

    status: "상태",
    category: "카테고리",
    newCategory: "카테고리 입력 또는 선택",
    uncategorized: "미분류",
    allCategories: "모든 카테고리",
    ready: "봇 확인 대기",
    writing: "작성중",
    start: "진행",
    requestHint: "수정하면 요청이 취소됩니다. 저장 후 진행을 다시 켜세요.",
    moved: "그록봇이 접수했습니다. 모니터링에서 확인하세요.",
    tasks: "업무지시서",
    monitor: "모니터링",
    bots: "나의 그록봇",
    overview: "도시의 모든 움직임, 한눈에.",
    subtitle: "팀의 지침을 정리하고, 다음 미션을 준비하세요.",
    newTask: "지시서 작성",
    all: "전체",
    waiting: "대기중",
    active: "진행중",
    done: "완료",
    draft: "초안",
    routine: "루틴",
    profile: "봇 프로필",
    instructions: "운영 지침",
    mainWork: "주요 업무",
    edit: "수정",
    save: "저장",
    cancel: "취소",
    publish: "반영하기",
    draftSave: "초안 저장",
    pending: "확인 대기",
    applied: "지침 적용완료",
    unconfigured: "설정 대기",
    noReport: "아직 보고 없음",
    lastReport: "최근 보고",
    name: "이름",
    avatar: "얼굴 이미지 경로",
    version: "버전",
    updated: "최근 변경",
    inbox: "변경함",
    emptyInbox: "모든 변경을 확인했습니다.",
    manual: "수동 정정",
    reason: "수동 정정 사유",
    ack: "적용 확인 기록",
    title: "업무 이름",
    description: "상세 지시사항",
    criteria: "완료 기준",
    solo: "개인 업무",
    team: "팀 업무",
    assignee: "담당 봇",
    members: "팀원 · 최대 5명",
    schedule: "반복 주기와 시간대",
    publishTask: "지시서 저장",
    taskSubtitle:
      "지시서를 작성하고 진행을 켜세요. 그록봇이 확인하면 모니터링으로 이동합니다.",
    monitorSubtitle: "실제 보고된 진척과 결과를 확인하세요.",
    noTasks: "아직 등록된 업무가 없습니다.",
    noMatches: "조건에 맞는 업무가 없습니다.",
    noMatchesHelp: "다른 상태를 선택하거나 검색어를 지워보세요.",
    resetFilters: "필터 초기화",
    noTasksHelp: "첫 번째 업무지시서를 작성하고 담당 봇을 지정하세요.",
    details: "업무지시서",
    subtasks: "하위 작업",
    addSubtask: "작업 추가",
    progress: "진행률",
    report: "진척 보고",
    note: "보고 내용 / 막힌 사유",
    blocked: "작업이 막혔습니다",
    history: "변경 이력",
    noHistory: "아직 변경 이력이 없습니다.",
    run: "실행 회차",
    newRun: "새 회차",
    settings: "설정",
    connected: "연결됨",
    offline: "연결 끊김",
    synced: "화면 갱신",
    guide: "운영 가이드",
    noInstruction:
      "아직 지침이 없습니다. 이 봇의 역할과 행동 원칙을 작성해 주세요.",
    unsaved: "게시되지 않은 초안이 있습니다.",
    read: "확인됨",
    taskAccept: "업무 접수 기록",
    source: "기록 주체",
    bot: "봇",
    user: "사용자",
    search: "업무 검색",
    close: "닫기",
    emptyProfile: "이 봇의 주요 업무를 설정해 주세요.",
    teamReady: "등록된 봇 슬롯",
    openTasks: "진행 중인 미션",
    awaiting: "확인을 기다리는 변경",
    completed: "완료된 미션",
    local: "로컬 작업공간",
    welcome: "CONTROL ROOM",
    showAll: "모두 보기",
    instructionsHint:
      "지침을 반영하면 봇에게 변경 항목이 생성됩니다. 적용 확인은 별도로 기록됩니다.",
    language: "언어",
    success: "변경 사항을 저장했습니다.",
    retry: "다시 연결",
    routineHint: "그록봇이 반복 실행을 관리합니다.",
    ackHint: "직접 확인한 경우에만 수동 확인을 기록하세요.",
    owner: "운영자",
    instructionAlert: "새 지침이 봇의 확인을 기다리고 있습니다.",
    taskAlert: "메인봇의 업무 접수를 기다리고 있습니다.",
    noRun:
      "진행을 켠 뒤 메인봇의 확인을 기다리세요. 접수되면 모니터링으로 이동합니다.",
    view: "열기",
    botCount: "봇",
    taskCount: "업무",
    assets: "이미지는 /assets/ 경로로 교체할 수 있습니다.",
  },
  en: {
    monitorSaveHint: "The bot reviews revised instructions before explicitly applying them to the current run.",
    categoryEdit: "Edit category", categoryName: "Category name", categoryHint: "Change the classification and color. Previous execution records stay unchanged.", resultReport: "Task retrospective", resultPending: "Awaiting retrospective", resultReady: "Experience recorded", resultHint: "The main bot will document the stack, method, lessons and verified outcomes here.", downloadMd: "Download Markdown", executionHistory: "Execution history", routineNext: "Bot will prepare the next run", botManaged: "Cards move when bots report their work.", savedNotStarted: "After saving, enable Start to send an execution request to the bot.",
    library: "Task library", trash: "Trash", archive: "Archive", delete: "Delete", restore: "Restore", emptyTrash: "Empty trash", purgeHint: "tasks and their execution history will be permanently deleted. This cannot be undone. Continue?", cli: "CLI usage", cliHint: "Preferences become bot instructions. Ask Grokbot which other tool to use and how.", occasional: "Occasionally", never: "Never", intensive: "Actively", other: "Other (ask Grokbot)", realtime: "Live connection", fallback: "Reconnecting · periodic refresh", touching: "Bot reports working here", boardColor: "Board color", storedHint: "Build a library of methods, outcomes and lessons from completed work.",

    status: "Status",
    category: "Category",
    newCategory: "Type or select a category",
    uncategorized: "Uncategorized",
    allCategories: "All categories",
    ready: "Awaiting bot",
    writing: "Writing",
    start: "Start",
    requestHint: "Editing cancels the request. Save and enable Start again.",
    moved: "Accepted by the bot. Follow progress in Monitoring.",
    tasks: "Task briefs",
    monitor: "Monitoring",
    bots: "MY GROKBOTS",
    overview: "Every move. One clear view.",
    subtitle: "Align your team. Shape the next mission.",
    newTask: "Write brief",
    all: "All",
    waiting: "Waiting",
    active: "In progress",
    done: "Completed",
    draft: "Draft",
    routine: "Routine",
    profile: "Bot profile",
    instructions: "Operating instructions",
    mainWork: "Responsibilities",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    publish: "Publish update",
    draftSave: "Save draft",
    pending: "Awaiting review",
    applied: "Instructions applied",
    unconfigured: "Not configured",
    noReport: "No reports yet",
    lastReport: "Last report",
    name: "Name",
    avatar: "Avatar image path",
    version: "Version",
    updated: "Recent updates",
    inbox: "Inbox",
    emptyInbox: "All updates have been reviewed.",
    manual: "Manual correction",
    reason: "Reason for correction",
    ack: "Record acknowledgement",
    title: "Task name",
    description: "Detailed instructions",
    criteria: "Acceptance criteria",
    solo: "Individual",
    team: "Team",
    assignee: "Assigned bot",
    members: "Members · up to 5",
    schedule: "Repeat schedule and time zone",
    publishTask: "Save brief",
    taskSubtitle:
      "Write a brief and enable Start. Bot acceptance moves it to Monitoring.",
    monitorSubtitle: "Follow reported progress and verified outcomes.",
    noTasks: "No missions yet.",
    noMatches: "No tasks match these filters.",
    noMatchesHelp: "Choose another status or clear your search.",
    resetFilters: "Reset filters",
    noTasksHelp: "Create your first task brief and assign a bot.",
    details: "Mission brief",
    subtasks: "Subtasks",
    addSubtask: "Add subtask",
    progress: "Progress",
    report: "Report progress",
    note: "Report / blocker details",
    blocked: "This task is blocked",
    history: "Activity history",
    noHistory: "No activity yet.",
    run: "Run",
    newRun: "New run",
    settings: "Settings",
    connected: "Connected",
    offline: "Disconnected",
    synced: "View refreshed",
    guide: "Operating guide",
    noInstruction:
      "No instructions yet. Define this bot’s role and working principles.",
    unsaved: "You have an unpublished draft.",
    read: "Reviewed",
    taskAccept: "Record task acceptance",
    source: "Reported by",
    bot: "Bot",
    user: "User",
    search: "Search missions",
    close: "Close",
    emptyProfile: "Define the responsibilities of this bot.",
    teamReady: "Bots in your workspace",
    openTasks: "Missions in progress",
    awaiting: "Updates awaiting review",
    completed: "Missions completed",
    local: "Local workspace",
    welcome: "CONTROL ROOM",
    showAll: "View all",
    instructionsHint:
      "Publishing creates a change item for the bot. Application is acknowledged separately.",
    language: "Language",
    success: "Changes saved.",
    retry: "Reconnect",
    routineHint: "The bot manages recurring execution.",
    ackHint: "Only record a manual acknowledgement after verification.",
    owner: "Operator",
    instructionAlert: "New instructions are awaiting bot review.",
    taskAlert: "Awaiting acceptance by the main bot.",
    noRun: "Enable Start. Bot acceptance moves this brief to Monitoring.",
    view: "Open",
    botCount: "bots",
    taskCount: "tasks",
    assets: "Replace images using an /assets/ path.",
  },
};
type Key = keyof typeof strings.ko;
function Avatar({ bot, size = "small" }: { bot: Bot; size?: string }) {
  const i = Number(bot.id.split("-")[1]);
  return (
    <div
      aria-hidden="true"
      className={`avatar ${size}`}
      style={
        bot.avatar
          ? {
              backgroundImage: `url(${bot.avatar})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              backgroundPosition: `${((i % 4) * 100) / 3}% ${i < 4 ? 0 : 100}%`,
            }
      }
    />
  );
}
const palette: Record<string,string> = {mint:"#a9d8c3",rose:"#e4b6c1",lavender:"#c6b9e5",sky:"#a9cce4",peach:"#e7c2a6",lemon:"#ddd49e",neutral:"#bbc1c9"};
let transitionBusy = false;
function animate(update:()=>void) {
  const doc = document as Document & {startViewTransition?: (f:()=>void)=>{finished:Promise<void>;ready?:Promise<void>}};
  if (document.visibilityState!=="visible" || !doc.startViewTransition || transitionBusy || matchMedia("(prefers-reduced-motion: reduce)").matches) {update(); return;}
  transitionBusy=true;
  const transition=doc.startViewTransition(()=>flushSync(update));
  transition.ready?.catch(()=>{});
  transition.finished.catch(()=>{}).finally(()=>{transitionBusy=false});
}
function App() {
  const [lang, setLang] = useState<Lang>(
    (localStorage.getItem("city.language") as Lang) === "en" ? "en" : "ko",
  );
  const t = (key: Key) => strings[lang][key];
  const mode = "live";
  const
    [state, setState] = useState<State | null>(null),
    [tab, setTabRaw] = useState<"status" | "tasks" | "monitor" | "library" | "trash">("status"),
    [selected, setSelected] = useState("bot-0"),
    [mobile, setMobile] = useState(false),
    [filter, setFilter] = useState("all"),
    [libraryView,setLibraryView]=useState<'briefs'|'wiki'|'map'>('briefs'),
    [query, setQuery] = useState(""),
    [categoryFilter, setCategoryFilter] = useState<string | null>(null),
    [online, setOnline] = useState(false),
    [lastSync, setLastSync] = useState(""),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<ReactNode>(null),
    [inboxOpen, setInboxOpen] = useState(false),
    [taskOpen, setTaskOpen] = useState<string | null>(null);
  const setTab = (value: typeof tab) => setTabRaw(value);
  const [streaming,setStreaming] = useState(false);
  const [now,setNow] = useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  const workspaceRef=useRef(mode);
  workspaceRef.current=mode;
  const requestSequence=useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const epoch = useRef(0);
  const date = (v: string | null) =>
    v
      ? new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(v))
      : t("noReport");
  async function refresh() {
    const current = epoch.current;
    const sequence=++requestSequence.current;
    try {
      const res = await fetch(`/api/state?workspace=${mode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (current !== epoch.current || sequence !== requestSequence.current || data.workspace !== workspaceRef.current) return;
      const previous=stateRef.current;
      stateRef.current=data;
      if (!previous || previous.workspace!==data.workspace || previous.revision!==data.revision) {
        const placement=(value:State)=>JSON.stringify(value.tasks.map(task=>[task.id,task.location,task.stage,task.runs.at(-1)?.status]));
        if (previous && placement(previous)!==placement(data)) animate(()=>setState(data));
        else setState(data);
      } else if(previous.csrf!==data.csrf) setState(data);
      setOnline(true);
      setLastSync(data.serverTime);
    } catch (e) {
      if (current === epoch.current && sequence === requestSequence.current && mode === workspaceRef.current) {
        setOnline(false);
        setError(String(e));
      }
    }
  }
  useEffect(() => {
    epoch.current++;
    setFilter("all");
    setCategoryFilter(null);
    setState(null);
    setTaskOpen(null);
    setModal(null);
    setInboxOpen(false);
    let disposed=false;
    let stream: EventSource | undefined;
    setStreaming(false);
    void refresh().then(()=>{
      if(disposed) return;
      stream=new EventSource(`/api/events?workspace=${mode}`);
      stream.addEventListener("change",()=>{setStreaming(true);void refresh()});
      stream.onerror=()=>setStreaming(false);
    });
    const timer = setInterval(refresh, 15000);
    return () => {disposed=true;stream?.close();clearInterval(timer)};
  }, [mode]);
  useEffect(() => {
    localStorage.setItem("city.language", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function command(
    action: string,
    payload: Record<string, unknown>,
    path = "/api/command",
  ) {
    const commandEpoch=epoch.current;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace": mode,
          "X-CSRF-Token": stateRef.current?.csrf || "",
        },
        body: JSON.stringify({
          action,
          payload: { ...payload, requestId: crypto.randomUUID() },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if(commandEpoch!==epoch.current || mode!==workspaceRef.current) throw new Error("Workspace changed; reopen the current workspace before continuing.");
      await refresh();
      setToast(t("success"));
      return d.result;
    } catch (e) {
      if(commandEpoch===epoch.current) setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }
  function act(fn: () => Promise<unknown>) {
    void fn().catch(() => {});
  }
  const close = () => setModal(null);
  const botName = (id: string) => {
    const b = state?.bots.find((x) => x.id === id);
    if (!b) return id;
    if (lang === "en" && b.name === "메인봇") return "Main bot";
    if (lang === "en" && /^그록봇 \d$/.test(b.name))
      return `Grokbot ${id.split("-")[1]}`;
    return b.name;
  };
  const statusBadge = (status: Status) => (
    <span className={`badge ${status}`}>
      <span className="dot" />
      {t(status)}
    </span>
  );
  const pending =
    state?.inbox.filter((e) => !e.acknowledgedAt && !e.cancelledAt) || [];
  const tasks = state?.tasks || [];
  const bot = state?.bots.find((b) => b.id === selected);
  const monitoredTasks=tasks.filter(x=>(x.location || "active")==="active" && x.stage==="monitor");
  const assignedTasks=monitoredTasks.filter(x=>{const brief=x.runs.at(-1)?.brief || x.published || x.draft;return [brief.boss,...brief.members].includes(selected)});
  const botPending=pending.filter(e=>e.kind==="instruction" ? e.targetId===selected : e.recipient===selected);
  const renderMetrics=(global:boolean)=>{
    const list=global?monitoredTasks:assignedTasks;
    const entries: [string,number,string][]=[...(global?[["teamReady",state?.bots.length || 0,`MAIN + ${Math.max(0,(state?.bots.length || 0)-1)} AGENTS`] as [string,number,string]]:[]),["openTasks",list.filter(x=>x.runs.at(-1)?.status==="active").length,"IN PROGRESS"],["awaiting",global?pending.length:botPending.length,"NEEDS ATTENTION"],["completed",list.filter(x=>x.runs.at(-1)?.status==="done").length,"MISSION COMPLETE"]];
    return <div className={global?"global-metrics":"metrics bot-metrics"} aria-label={global?(lang==="ko"?"전체 현황":"Workspace overview"):`${botName(selected)} ${lang==="ko"?"현황":"overview"}`}>{entries.map(([key,num,caption])=><div className="metric" key={key}><div><span>{t(key as Key)}</span></div><strong>{String(num).padStart(2,"0")}</strong><span className="metric-caption">{caption}</span></div>)}</div>;
  };
  function instructionEditor(b: Bot) {
    setModal(
      <InstructionEditor
        bot={b}
        t={t}
        onClose={close}
        onSave={async (text, publish) => {
          await command(publish ? "instruction.publish" : "instruction.save", {
            id: b.id,
            expectedVersion: b.version,
            text,
          });
          close();
        }}
      />,
    );
  }
  function profileEditor(b: Bot) {
    setModal(
      <ProfileEditor
        bot={b}
        t={t}
        onClose={close}
        onSave={async (values) => {
          await command("bot.update", {
            id: b.id,
            expectedVersion: b.version,
            ...values,
          });
          close();
        }}
      />,
    );
  }
  function categoryEditor(category:string) {
    if(!state)return;
    const revision=state.revision;
    setModal(<CategoryEditor category={category} color={state.categoryColors?.[category] || "neutral"} t={t} onClose={close} onSave={async(name,color)=>{await command("category.update",{category,name,color,expectedRevision:revision});setCategoryFilter(current=>current===category?name:current);close()}}/>);
  }
  function taskEditor(task?: Task) {
    if (!state) return;
    setModal(
      <TaskEditor
        task={task}
        categories={state.categories || []}
        bots={state.bots}
        t={t}
        botName={botName}
        onClose={close}
        onSave={async (values, publish) => {
          const result = await command(publish ? "task.publish" : "task.save", {
            ...values,
            ...(task ? { id: task.id, expectedVersion: task.version } : {}),
          });
          close();
          setTaskOpen(result.id);
          setFilter("all");
          setCategoryFilter(null);
          setTab(result.stage === "monitor" ? "monitor" : "tasks");
        }}
      />,
    );
  }
  function acknowledge(
    kind: "instruction" | "task",
    id: string,
    version: number,
  ) {
    setModal(
      <ReasonDialog
        t={t}
        title={t(kind === "instruction" ? "ack" : "taskAccept")}
        onClose={close}
        onSave={async (reason) => {
          await command(`${kind}.ack`, { id, version, reason });
          close();
        }}
      />,
    );
  }
  function report(task: Task, run: Run, sub?: Subtask, add = false) {
    setModal(
      <ReportEditor
        task={task}
        run={run}
        sub={sub}
        add={add}
        t={t}
        botName={botName}
        onClose={close}
        onSave={async (values) => {
          await command(add || sub ? "subtask.upsert" : "task.report", {
            id: task.id,
            runId: run.id,
            expectedVersion: task.version,
            ...values,
          });
          close();
        }}
      />,
    );
  }
  function history(target?: string) {
    setModal(
      <Dialog title={t("history")} onClose={close} closeLabel={t("close")}>
        <div className="history">
          {state?.history
            .filter((h) => !target || h.targetId === target)
            .slice(0, 80)
            .map((h) => (
              <div key={h.id}>
                <span className="dot" />
                <div>
                  <strong>{h.action}</strong>
                  <p>
                    {h.actor.kind === "bot" ? botName(h.actor.id) : t("manual")}
                    {h.reason && ` · ${h.reason}`}
                  </p>
                  <small>{date(h.at)}</small>
                  <details>
                    <summary>{t("details")}</summary>
                    <pre>{JSON.stringify(h.snapshot, null, 2)}</pre>
                  </details>
                </div>
              </div>
            ))}
          {!state?.history.length && <p>{t("noHistory")}</p>}
        </div>
      </Dialog>,
    );
  }
  const listedTasks = tasks.filter((x) => tab === "library" || tab === "trash"
    ? x.location === tab
    : (x.location || "active") === "active" && (tab === "tasks" ? x.stage === "brief" : x.stage === "monitor"));
  const touching=(id:string)=>state?.activities?.some(a=>a.targetId===id && Date.parse(a.expiresAt)>now);
  const recent=(id:string)=>state?.history.some(h=>h.targetId===id && h.actor.kind==="bot" && now-Date.parse(h.at)<5000);
  function lifecycle(task:Task,action:string) { act(async()=>{await command(`task.${action}`,{id:task.id,expectedVersion:task.version});setTaskOpen(null);if(action==="restore"&&task.location==="library"){setTab("tasks");setFilter("all");setQuery("");setCategoryFilter(null)}}) }
  function emptyTrash() {
    const count=tasks.filter(x=>x.location==="trash").length;
    if(count && confirm(`${count} ${t("purgeHint")}`)) act(()=>command("trash.empty",{expectedRevision:state!.revision,confirm:true,count}));
  }
  const matchesFilter = (x: Task, f: string) =>
    f === "all" ||
    (tab === "tasks"
      ? f === "ready"
        ? x.ready
        : !x.ready
      : x.runs.at(-1)?.status === f);
  function dispatch(task: Task) {
    act(() =>
      command("task.dispatch", {
        id: task.id,
        expectedVersion: task.version,
        enabled: !task.ready,
      }),
    );
  }
  useEffect(() => {
    if (
      tab === "tasks" &&
      taskOpen &&
      tasks.find((x) => x.id === taskOpen)?.stage === "monitor"
    ) {
      setTaskOpen(null);
      setToast(t("moved"));
    }
  }, [state?.revision, tab, taskOpen]);
  const visibleTasks = listedTasks.filter(
    (x) =>
      matchesFilter(x, filter) &&
      ((tab === "tasks" ? x.draft : x.published || x.draft).title + (tab==="library" ? " " + (x.retrospective?.markdown || "") : ""))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (tab !== "tasks" ||
        categoryFilter === null ||
        (x.draft.category || "") === categoryFilter),
  );
  const boardCategories = Array.from(
    new Set(visibleTasks.map((x) => x.draft.category || "")),
  );

  const renderTaskCard = (task: Task) => {
    const brief = tab === "tasks" ? task.draft : task.published || task.draft,
      r = task.runs.at(-1);
    return (
      <article
        key={task.id}
        className={`${tab === "tasks" ? "mission-card" : "monitor-card"} ${touching(task.id) ? "bot-touching" : ""} ${recent(task.id) ? "recent-update" : ""}`}
        style={{viewTransitionName:`task-${task.id}`} as React.CSSProperties}
      >
        {touching(task.id) && <div className="touch-label"><span className="dot"/>{t("touching")}</div>}
        <div className="mission-top">
          <span className="mission-number">
            BRIEF / {task.id.slice(0, 4).toUpperCase()}
          </span>
          {brief.routine && (
            <span className="routine-label">
              <RefreshCw size={12} />
              {t("routine")}
            </span>
          )}
          {tab !== "tasks" && r ? (
            statusBadge(r.status)
          ) : (
            <span className="badge neutral">
              {t(task.ready ? "ready" : "writing")}
            </span>
          )}
        </div>
        <button className="mission-title" onClick={() => setTaskOpen(task.id)}>
          <h2>{brief.title}</h2>
          <ArrowUpRight size={17} />
        </button>
        <p className="mission-description">{brief.description || "—"}</p>
        <div className="mission-people">
          <div className="avatar-stack">
            {[brief.boss, ...brief.members].map((id) => (
              <Avatar key={id} bot={state!.bots.find((b) => b.id === id)!} />
            ))}
          </div>
          <span>
            {brief.type === "team" ? "BOSS" : "OWNER"}{" "}
            <b>{botName(brief.boss)}</b>
          </span>
          {tab === "monitor" && (
            <span className="subtask-count">
              <CheckCheck size={13} />
              {r?.subtasks.filter((s) => s.status === "done").length || 0}/
              {r?.subtasks.length || 0}
            </span>
          )}
        </div>
        {tab === "monitor" && (
          <>
            <div className="progress-label">
              <span>{t("progress")}</span>
              <strong>{r?.progress || 0}%</strong>
            </div>
            <Progress value={r?.progress || 0} />
          </>
        )}{" "}
        {tab === "tasks" && (
          <div className="dispatch-row">
            <span>{t(task.ready ? "ready" : "writing")}</span>
            <button
              className="dispatch-switch"
              role="switch"
              aria-checked={task.ready}
              aria-label={t("start") + " · " + brief.title}
              disabled={busy}
              onClick={() => dispatch(task)}
            >
              <span className="switch-track">
                <i />
              </span>
              {t("start")}
            </button>
          </div>
        )}
        {tab === "monitor" && task.publishedVersion > task.acceptedVersion && (
          <small className="pending-text">{t("taskAlert")}</small>
        )}
        {tab === "monitor" && r && (
          <>
            <div className="monitor-meta">
              <span>
                {t("run")} {task.runs.length} · {date(r.updatedAt)}
              </span>
              <button
                className="text-button"
                onClick={() => setTaskOpen(task.id)}
              >
                {t("details")}
                <ChevronRight size={13} />
              </button>
            </div>
            {r.subtasks.map((sub) => (
              <div className={`subtask-inline ${touching(sub.id) ? "bot-touching" : ""}`} key={sub.id}>
                <span className={`status-dot ${sub.status}`} />
                <span>{sub.title}</span>
                <small>{botName(sub.botId)}</small>
                <Progress value={sub.progress} />
                <strong>{sub.progress}%</strong>
              </div>
            ))}
            {r.blocked && (
              <p className="blocked">
                <AlertCircle size={14} />
                {r.note || t("blocked")}
              </p>
            )}
          </>
        )}
        {tab === "library" && <div className="library-report">
          <span className={`badge ${task.retrospectiveRequestId ? "waiting" : task.retrospective ? "done" : "neutral"}`}><FileText size={13}/>{t(task.retrospectiveRequestId || !task.retrospective ? "resultPending" : "resultReady")}</span>
          {task.retrospective && <p className="report-excerpt">{task.retrospective.markdown.replace(/[#*`]/g,"").slice(0,180)}</p>}
          <button className="text-button" onClick={()=>setTaskOpen(task.id)}>{t("resultReport")}<ArrowUpRight size={14}/></button>
        </div>}
        {tab === "monitor" && r?.status==="done" && brief.routine && <p className="routine-next"><RefreshCw size={13}/>{t("routineNext")}</p>}
        {(task.location === "library" || task.location === "trash" || (task.runs.length>0 && task.runs.every(run=>run.status==="done"))) && <div className="storage-actions">
          {(task.location === "library" || task.location === "trash") && <button className="secondary" disabled={busy} onClick={()=>lifecycle(task,"restore")}><RotateCcw size={14}/>{t("restore")}</button>}
          {(!task.location || task.location==="active") && <button className="secondary" disabled={busy} onClick={()=>lifecycle(task,"archive")}><Archive size={14}/>{t("archive")}</button>}
          {task.location!=="trash" && <button className="text-button" disabled={busy} onClick={()=>lifecycle(task,"trash")}><Trash2 size={14}/>{t("delete")}</button>}
        </div>}
      </article>
    );
  };

  const selectedTask = tasks.find((x) => x.id === taskOpen);
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">
            <img src="/assets/city-mark.png" alt="" />
          </span>
          <span>
            grokbot<span className="brand-city">CITY</span>
          </span>
        </a>
        {state?.bots.filter(b=>b.id==="bot-0").map(b=><button key={b.id} className={`bot-link main-bot-link ${tab==="status" && selected===b.id ? "selected" : ""}`} aria-pressed={tab==="status" && selected===b.id} onClick={()=>{setSelected(b.id);setTab("status");setMobile(false)}}>
          <Avatar bot={b}/><span><strong>{botName(b.id)}</strong><small>MAIN BOT</small></span>
          {b.instructionVersion>b.appliedVersion && <span className="pending-dot"/>}<Crown size={15}/>
        </button>)}
        <div className="side-heading">
          {t("bots")}
          <span>{String(state?.bots.filter(b=>b.id!=="bot-0").length || 0).padStart(2,"0")}</span>
        </div>
        <nav className="bot-nav" aria-label={t("bots")}>
          {state?.bots.filter(b=>b.id!=="bot-0").map((b) => (
            <button
              key={b.id}
              className={`bot-link ${tab === "status" && selected === b.id ? "selected" : ""}`}
              aria-pressed={tab === "status" && selected === b.id}
              onClick={() => {
                setSelected(b.id);
                setTab("status");
                setMobile(false);
              }}
            >
              <Avatar bot={b} />
              <span>
                <strong>{botName(b.id)}</strong>
                <small>
                  {b.id === "bot-0"
                    ? "MAIN BOT"
                    : `AGENT / 0${b.id.split("-")[1]}`}
                </small>
              </span>
              {b.id === "bot-0" ? (
                <Crown size={14} />
              ) : b.instructionVersion > b.appliedVersion ? (
                <span className="pending-dot" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {(["library","trash"] as const).map(key=><button key={key} className={tab===key ? "storage-selected" : ""} onClick={()=>{setTab(key);setFilter("all");setTaskOpen(null);setMobile(false)}}>{key==="library"?<BookOpen size={17}/>:<Trash2 size={17}/>} {t(key)} <span className="storage-count">{tasks.filter(x=>x.location===key).length}</span></button>)}
          <button
            onClick={() =>
              setModal(
                <Dialog
                  title={t("guide")}
                  onClose={close}
                  closeLabel={t("close")}
                >
                  <p>
                    {lang === "ko"
                      ? "메인봇에게 아래 문서를 읽고 실제 봇 이름·사진·지침을 등록하고, 현재 수행 중인 업무와 실제 진척을 모니터링에 이관한 뒤 운영을 시작하라고 전달하세요."
                      : "Ask the main bot to read these guides, migrate real bot names, photos and instructions, and import ongoing work with its actual progress into Monitoring."}
                  </p>
                  <code>docs/GROKBOT_CONTEXT.md</code><br/><code>docs/GROKBOT_MIGRATION.md</code><br/><code>docs/GROKBOT_WIKI.md</code>
                  <p>
                    {lang === "ko"
                      ? "지침을 반영하거나 지시서의 진행을 켜면 봇이 변경함을 확인합니다. 접수된 업무는 모니터링에서 확인합니다."
                      : "Publish instructions or enable Start on a brief. The bot reviews its inbox; accepted tasks move to Monitoring."}
                  </p>
                  <code>node scripts/bot.mjs inbox</code>
                  <p>{t("routineHint")}</p>
                </Dialog>,
              )
            }
          >
            <FileText size={17} />
            {t("guide")}
            <ArrowUpRight size={14} />
          </button>
          <button
            onClick={() =>
              setModal(
                <Dialog
                  title={t("settings")}
                  onClose={close}
                  closeLabel={t("close")}
                >
                  <p>{t("language")}</p>
                  <div className="segmented">
                    <button
                      onClick={() => {
                        setLang("ko");
                        close();
                      }}
                    >
                      한국어
                    </button>
                    <button
                      onClick={() => {
                        setLang("en");
                        close();
                      }}
                    >
                      English
                    </button>
                  </div>
                  <p>{t("local")} · SQLite · Tailscale</p>
                  <p>{t("assets")}</p>
                </Dialog>,
              )
            }
          >
            <Settings2 size={17} />
            {t("settings")}
          </button>
          <div className="operator">
            <span>Y</span>
            <div>
              <strong>{t("owner")}</strong>
              <small>Personal workspace</small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="side-backdrop"
          aria-label={t("close")}
          onClick={() => setMobile(false)}
        />
      )}
      <div className="shell">
        <header>
          <button
            className="mobile-menu icon-button"
            aria-label="Menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
          {renderMetrics(true)}
          <div className="header-actions">
            <span className={`connection ${online ? "" : "disconnected"}`}>
              <span className="dot" />
              {t(!online ? "offline" : streaming ? "realtime" : "fallback")}
            </span>
            <button
              className="language"
              onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            >
              <Globe2 size={14} />
              {lang === "ko" ? "KO" : "EN"}
            </button>
            <button
              className="icon-button bell"
              aria-label={t("inbox")}
              onClick={() => setInboxOpen(!inboxOpen)}
            >
              <Bell size={18} />
              {pending.length > 0 && <i />}
            </button>
          </div>
        </header>
        <div className="topnav">
          <nav>
            {(["status", "tasks", "monitor"] as const).map((key, i) => {
              const Icon = [LayoutDashboard, ScrollText, Activity][i];
              return (
                <button
                  className={tab === key ? "active-tab" : ""}
                  key={key}
                  onClick={() => {
                    setTab(key);
                    setFilter("all");
                    setTaskOpen(null);
                  }}
                >
                  <Icon size={16} />
                  {t(key)}
                </button>
              );
            })}
          </nav>
        </div>
        {error && (
          <div className="error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button
              onClick={() => {
                setError("");
                void refresh();
              }}
            >
              {t("retry")}
            </button>
            <button aria-label={t("close")} onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <main key={tab} className={`page-enter ${tab==='library'?'library-page':''}`}>
          <div className="page-title">
            <div>
              <div className="eyebrow">
                {t("welcome")}
                <span> / </span>
                {tab === "status" ? "01" : tab === "tasks" ? "02" : "03"}
              </div>
              <h1>{tab === "status" ? t("overview") : t(tab)}</h1>
              <p>
                {t(
                  tab === "status"
                    ? "subtitle"
                    : tab === "tasks"
                      ? "taskSubtitle"
                      : tab === "monitor" ? "monitorSubtitle" : "storedHint",
                )}
              </p>
            </div>
            <button
              className="primary"
              disabled={!state}
              onClick={() => taskEditor()}
            >
              <Plus size={17} />
              {t("newTask")}
            </button>
          </div>
          {tab === "trash" && <button className="secondary empty-trash" disabled={busy || !listedTasks.length} onClick={emptyTrash}><Trash2 size={15}/>{t("emptyTrash")}</button>}
          {!state ? (
            <div className="empty">
              <LoaderCircle className="spin" />
              <p>{online ? "Loading…" : t("offline")}</p>
            </div>
          ) : (
            <>
              {tab === "status" && bot && renderMetrics(false)}
              {tab === "status" && bot && (
                <div className="status-layout">
                  <section className={`bot-panel panel ${touching(bot.id) ? "bot-touching" : ""} ${recent(bot.id) ? "recent-update" : ""}`}>
                    <div className="section-label">
                      {t("profile")}
                      <button
                        className="icon-button"
                        aria-label={t("edit")}
                        onClick={() => profileEditor(bot)}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                    <div className="bot-portrait">
                      <div className="portrait-orbit" />
                      <Avatar key={bot.id} bot={bot} size="hero" />
                      <span className="bot-id">
                        {bot.id === "bot-0"
                          ? "MAIN / 00"
                          : `AGENT / 0${bot.id.split("-")[1]}`}
                      </span>
                    </div>
                    <div className="bot-identity">
                      <h2>
                        {botName(bot.id)}
                        {bot.id === "bot-0" && <Crown size={17} />}
                      </h2>
                      <span
                        className={`badge ${bot.instructionVersion > bot.appliedVersion ? "waiting" : bot.instructionVersion ? "done" : "neutral"}`}
                      >
                        <span className="dot" />
                        {t(
                          bot.instructionVersion > bot.appliedVersion
                            ? "pending"
                            : bot.instructionVersion
                              ? "applied"
                              : "unconfigured",
                        )}
                      </span>
                    </div>
                    <div className="profile-copy">
                      <small>{t("mainWork")}</small>
                      <p>{bot.role || t("emptyProfile")}</p>
                    </div>
                    <div className="profile-footer">
                      <span>{t("lastReport")}</span>
                      <strong>{date(bot.lastReportAt)}</strong>
                    </div>
                    <button
                      className="secondary full"
                      onClick={() => profileEditor(bot)}
                    >
                      <Settings2 size={14} />
                      {t("profile")} {t("edit")}
                    </button>
                  </section>
                  <div className="instruction-column">
                    <section className="panel instruction-panel">
                      <div className="panel-heading">
                        <div>
                          <FileText size={18} />
                          <h2>{t("instructions")}</h2>
                          <span className="version">
                            v{bot.instructionVersion}
                          </span>
                        </div>
                        <button
                          className="secondary"
                          onClick={() => instructionEditor(bot)}
                        >
                          {t("edit")}
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                      {bot.instructionVersion > bot.appliedVersion && (
                        <div className="notification">
                          <span className="notification-icon">
                            <Sparkles size={17} />
                          </span>
                          <div>
                            <strong>
                              Hey Grokbot, your information has been updated!
                            </strong>
                            <p>{t("instructionAlert")}</p>
                          </div>
                          <span className="pending-dot" />
                        </div>
                      )}
                      <div className="instruction-content">
                        {bot.instructions ? (
                          <>
                            <div className="document-eyebrow">
                              OPERATING PROTOCOL
                            </div>
                            <p className="preserve">{bot.instructions}</p>
                          </>
                        ) : (
                          <div className="instruction-empty">
                            <Command size={28} />
                            <h3>{t("instructions")}</h3>
                            <p>{t("noInstruction")}</p>
                            <button
                              className="secondary"
                              onClick={() => instructionEditor(bot)}
                            >
                              <Plus size={14} />
                              {t("edit")}
                            </button>
                          </div>
                        )}
                      </div>
                      {bot.draft !== bot.instructions && (
                        <p className="draft-note">{t("unsaved")}</p>
                      )}
                      <div className="instruction-footer">
                        <span>
                          <ShieldCheck size={14} />
                          {t(
                            bot.appliedVersion ? "applied" : "unconfigured",
                          )}{" "}
                          <b>v{bot.appliedVersion}</b>
                          {bot.appliedSource &&
                            ` · ${t(bot.appliedSource === "bot" ? "bot" : "manual")}`}
                          <small>
                            {bot.appliedAt ? date(bot.appliedAt) : "—"}
                          </small>
                        </span>
                        <button
                          className="text-button"
                          disabled={!bot.instructionVersion}
                          onClick={() =>
                            acknowledge(
                              "instruction",
                              bot.id,
                              bot.instructionVersion,
                            )
                          }
                        >
                          {t("manual")}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </section>
                    <section className="panel cli-panel">
                      <div className="panel-heading"><h2>{t("cli")}</h2></div>
                      {bot.id==="bot-0" ? <label className="cli-share-toggle"><span><strong>{lang==="ko"?"전체 봇에 적용":"Apply to all bots"}</strong><small>{lang==="ko"?"켜면 각 봇의 설정을 메인봇 설정으로 바꾸고 이후 변경도 함께 적용합니다. 끄면 마지막 설정을 유지합니다.":"Replace each bot’s preferences with the main bot’s and keep them in sync. Turning off retains the last values."}</small></span><input type="checkbox" role="switch" checked={!!bot.cliApplyAll} disabled={busy} onChange={e=>act(()=>command("bot.cliAll",{id:bot.id,enabled:e.target.checked,expectedRevision:state.revision}))}/></label> : state.bots.find(b=>b.id==="bot-0")?.cliApplyAll && <p className="cli-shared-note">{lang==="ko"?"메인봇의 CLI 활용 설정을 따르고 있습니다.":"CLI preferences are managed by the main bot."}</p>}
                      <p className="muted">{t("cliHint")}</p>
                      {(["codex","claudeCode","other"] as const).map(tool=><fieldset className="cli-field" key={tool}><legend>{tool==="codex"?"Codex":tool==="claudeCode"?"Claude Code":t("other")}</legend><div>
                        {(["active","occasional","never"] as const).map(usage=><label key={usage}><input type="radio" name={`${bot.id}-${tool}`} checked={(bot.cliUsage?.[tool] || "never")===usage} disabled={busy || (bot.id!=="bot-0" && !!state.bots.find(b=>b.id==="bot-0")?.cliApplyAll)} onChange={()=>act(()=>command("bot.cli",{id:bot.id,expectedVersion:bot.version,tool,usage}))}/>{t(usage==="active"?"intensive":usage)}</label>)}
                      </div></fieldset>)}
                    </section>
                    <section className="panel activity-panel">
                      <div className="panel-heading">
                        <div>
                          <Clock3 size={17} />
                          <h2>{t("updated")}</h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => history(bot.id)}
                        >
                          {t("showAll")}
                          <ArrowUpRight size={13} />
                        </button>
                      </div>
                      {state.history
                        .filter((h) => h.targetId === bot.id)
                        .slice(0, 3)
                        .map((h) => (
                          <div className="activity-row" key={h.id}>
                            <span className="activity-icon">
                              {h.action.endsWith("ack") ? (
                                <Check size={14} />
                              ) : (
                                <FileText size={14} />
                              )}
                            </span>
                            <div>
                              <strong>
                                {h.action.startsWith("instruction")
                                  ? t("instructions")
                                  : t("profile")}{" "}
                                ·{" "}
                                {h.action.endsWith("ack")
                                  ? t("applied")
                                  : t("updated")}
                              </strong>
                              <small>
                                {h.actor.kind === "bot"
                                  ? botName(h.actor.id)
                                  : t("user")}
                              </small>
                            </div>
                            <time>{date(h.at)}</time>
                          </div>
                        ))}
                      {!state.history.some((h) => h.targetId === bot.id) && (
                        <div className="quiet-empty">{t("noHistory")}</div>
                      )}
                    </section>
                  </div>
                </div>
              )}
              {tab === "library" && <div className="library-tabs" role="group" aria-label={lang==="ko"?"업무 도서관 보기":"Task library views"}>{(['briefs','wiki','map'] as const).map(view=><button key={view} aria-pressed={libraryView===view} className={libraryView===view?'selected':''} onClick={()=>setLibraryView(view)}>{view==='briefs'?<ScrollText size={16}/>:view==='wiki'?<BookOpen size={16}/>:<LayoutDashboard size={16}/>}<span>{view==='briefs'?t('tasks'):view==='wiki'?(lang==='ko'?'업무 wiki':'Task wiki'):(lang==='ko'?'업무 wiki MAP':'Task wiki MAP')}</span>{view==='briefs'&&<small>{listedTasks.length}</small>}</button>)}</div>}
              {tab === 'library' && libraryView!=='briefs' && <WikiLibrary key={mode} wiki={state.wiki} view={libraryView} lang={lang} onRequest={payload=>command('wiki.request',payload)}/>}
              {tab !== "status" && (tab!=="library" || libraryView==='briefs') && (
                <>
                  <div className="list-toolbar">
                    <div className={`filters ${tab === "monitor" ? "monitor-filters" : ""}`}>
                      {(tab === "tasks"
                        ? ["all", "writing", "ready"]
                        : tab === "monitor" ? ["all", "waiting", "active", "done"] : ["all"]
                      ).map((f) => (
                        <button
                          className={filter === f ? "selected" : ""}
                          aria-pressed={filter === f}
                          key={f}
                          onClick={() => setFilter(f)}
                        >
                          {tab === "monitor" && f !== "all" && <i className={`status-dot ${f}`} aria-hidden="true"/>}{t(f as Key)}
                          <span>
                            {
                              listedTasks.filter((x) => matchesFilter(x, f))
                                .length
                            }
                          </span>
                        </button>
                      ))}
                    </div>
                    {tab === "tasks" && (
                      <select
                        className="category-filter"
                        aria-label={t("category")}
                        value={
                          categoryFilter === null
                            ? "all"
                            : JSON.stringify([categoryFilter])
                        }
                        onChange={(e) =>
                          setCategoryFilter(
                            e.target.value === "all"
                              ? null
                              : JSON.parse(e.target.value)[0],
                          )
                        }
                      >
                        <option value="all">{t("allCategories")}</option>
                        <option value={JSON.stringify([""])}>
                          {t("uncategorized")}
                        </option>
                        {(state.categories || []).map((c) => (
                          <option key={c} value={JSON.stringify([c])}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}
                    <label className="search">
                      <Search size={15} />
                      <input
                        aria-label={t("search")}
                        placeholder={t("search")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  {tab === "tasks" ? (
                    <div className="category-board">
                      {boardCategories.map((category) => (
                        <section className="category-column" key={category} style={{"--category-color":palette[state.categoryColors?.[category] || "neutral"]} as React.CSSProperties}>
                          <div className="category-heading">
                            <button className="category-title" onClick={()=>categoryEditor(category)} aria-label={`${t("categoryEdit")} · ${category || t("uncategorized")}`}>
                              <span className="dot" />{category || t("uncategorized")}<Pencil size={12}/>
                            </button>
                            <b>
                              {
                                visibleTasks.filter(
                                  (x) => (x.draft.category || "") === category,
                                ).length
                              }
                            </b>
                          </div>

                          <div className="category-cards">
                            {visibleTasks
                              .filter(
                                (x) => (x.draft.category || "") === category,
                              )
                              .map(renderTaskCard)}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : tab === "monitor" ? (
                    <><p className="board-explainer">{t("botManaged")}</p><div className={`monitor-board ${filter !== "all" ? "monitor-focused" : ""}`} key={filter}>
                      {(["waiting","active","done"] as const).filter(status=>filter==="all" || filter===status).map(status=><section className={`monitor-column column-${status}`} key={status} aria-label={t(status)}>
                        <div className="monitor-column-heading"><h2><span className={`status-dot ${status}`}/>{t(status)}</h2><span>{visibleTasks.filter(task=>(task.runs.at(-1)?.status || "waiting")===status).length}</span></div>
                        <div className="monitor-column-cards">{visibleTasks.filter(task=>(task.runs.at(-1)?.status || "waiting")===status).map(renderTaskCard)}</div>
                        {!visibleTasks.some(task=>(task.runs.at(-1)?.status || "waiting")===status) && <div className="column-empty">{lang==="ko" ? `${t(status)} 업무가 없습니다.` : `No ${t(status).toLowerCase()} tasks.`}</div>}
                      </section>)}
                    </div></>
                  ) : (
                    <div className="library-grid">{visibleTasks.map(renderTaskCard)}</div>
                  )}

                  {!visibleTasks.length && (
                    <div className="empty">
                      <ScrollText size={36} />
                      <h2>{t(listedTasks.length ? "noMatches" : "noTasks")}</h2>
                      <p>{t(listedTasks.length ? "noMatchesHelp" : "noTasksHelp")}</p>
                      {listedTasks.length ? <button className="secondary" onClick={()=>{setFilter("all");setQuery("");setCategoryFilter(null)}}>{t("resetFilters")}</button> : <button className="primary" onClick={() => taskEditor()}>
                        <Plus size={15} />
                        {t("newTask")}
                      </button>}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <footer>
            <span>
              <span className="dot" />
              GROKBOT CITY <i> / </i> {t("local")}
            </span>
            <span>
              {t("synced")} · {lastSync ? date(lastSync) : "—"}
            </span>
          </footer>
        </main>
      </div>
      {inboxOpen && (
        <div className="inbox-drawer">
          <div className="panel-heading">
            <div>
              <Bell size={18} />
              <h2>{t("inbox")}</h2>
              <span className="version">{pending.length}</span>
            </div>
            <button
              className="icon-button"
              aria-label={t("close")}
              onClick={() => setInboxOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          {pending.length ? (
            pending.map((e) => (
              <button
                className="inbox-item"
                key={e.id}
                onClick={() => {
                  setInboxOpen(false);
                  if (e.kind === "instruction") {
                    setSelected(e.targetId);
                    setTab("status");
                  } else if(e.kind==='wiki') {
                    setTaskOpen(null);setTab('library');setLibraryView('wiki');
                  } else {
                    setTaskOpen(e.targetId);
                    const target=tasks.find(task=>task.id===e.targetId);
                    setTab(target?.location==="library" ? "library" : target?.stage==="monitor" ? "monitor" : "tasks");
                  }
                }}
              >
                <Sparkles size={17} />
                <div>
                  <strong>{e.message}</strong>
                  <p>
                    {e.kind==='wiki' ? (lang==='ko'?'업무 위키':'Task wiki') : e.kind === "instruction"
                      ? botName(e.targetId)
                      : tasks.find((x) => x.id === e.targetId)?.published
                          ?.title}{" "}
                    · v{e.version}
                  </p>
                  <small>{date(e.createdAt)}</small>
                </div>
                <ChevronRight size={15} />
              </button>
            ))
          ) : (
            <div className="empty">
              <CheckCheck size={30} />
              <p>{t("emptyInbox")}</p>
            </div>
          )}
        </div>
      )}
      {selectedTask && (
        <TaskDetail
          key={`${selectedTask.id}-${mode}`}
          task={selectedTask}
          workspace={mode}
          t={t}
          date={date}
          botName={botName}
          statusBadge={statusBadge}
          onClose={() => setTaskOpen(null)}
          lang={lang}
          bots={state!.bots}
          categories={state!.categories || []}
          onSaveBrief={async(values,version)=>{await command("task.publish",{...values,id:selectedTask.id,expectedVersion:version})}}
          onDispatch={() => dispatch(selectedTask)}
          onHistory={() => history(selectedTask.id)}
          onReport={(r, s, add) => report(selectedTask, r, s, add)}
          onAdopt={(r) =>
            setModal(
              <ReasonDialog
                t={t}
                title={
                  selectedTask.flowPlan?.version === selectedTask.publishedVersion
                    ? (lang === "ko" ? "새 계획의 담당자와 구조 적용 · 유지되는 노드의 보고 보존" : "Apply plan structure and owners · retain matching node reports")
                    : lang === "ko"
                    ? "최신 지시 적용 · 제외된 담당자는 새 Boss로 배정"
                    : "Apply latest brief · removed owners move to new Boss"
                }
                onClose={close}
                onSave={async (reason) => {
                  await command("run.adopt", {
                    id: selectedTask.id,
                    runId: r.id,
                    expectedVersion: selectedTask.version,
                    reason,
                    reassign: Object.fromEntries(
                      r.subtasks
                        .filter(
                          (s) =>
                            ![
                              selectedTask.published!.boss,
                              ...selectedTask.published!.members,
                            ].includes(s.botId),
                        )
                        .map((s) => [s.id, selectedTask.published!.boss]),
                    ),
                  });
                  close();
                }}
              />,
            )
          }
          onRun={() =>
            act(() =>
              command("run.create", {
                id: selectedTask.id,
                expectedVersion: selectedTask.version,
              }),
            )
          }
        />
      )}
      {modal}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
type T = (key: Key) => string;
function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
function Dialog({
  title,
  onClose,
  children,
  closeLabel = "Close",
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("button,input,textarea,select")?.focus();
    function key(e: KeyboardEvent) {
      if (
        Array.from(document.querySelectorAll("[aria-modal=true]")).at(-1) !== el
      )
        return;
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
      if (e.key === "Tab" && el) {
        const nodes = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea,select,[tabindex="0"]',
          ),
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`dialog ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FormButtons({
  t,
  onClose,
  busy,
  children,
}: {
  t: T;
  onClose: () => void;
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="form-actions">
      <button type="button" className="secondary" onClick={onClose}>
        {t("cancel")}
      </button>
      {children}
      <button disabled={busy} className="primary" type="submit">
        {busy ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Save size={15} />
        )}{" "}
        {t("save")}
      </button>
    </div>
  );
}
function InstructionEditor({
  bot,
  t,
  onClose,
  onSave,
}: {
  bot: Bot;
  t: T;
  onClose: () => void;
  onSave: (text: string, publish: boolean) => Promise<void>;
}) {
  const [text, setText] = useState(bot.draft),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(publish: boolean) {
    setBusy(true);
    try {
      await onSave(text, publish);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={t("instructions")}
      onClose={onClose}
      closeLabel={t("close")}
      wide
    >
      <p className="muted">{t("instructionsHint")}</p>
      <label>
        {t("instructions")}
        <textarea
          rows={13}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="secondary" onClick={onClose}>
          {t("cancel")}
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void save(false)}
        >
          <Save size={15} />
          {t("draftSave")}
        </button>
        <button
          className="primary"
          disabled={busy || !text.trim()}
          onClick={() => void save(true)}
        >
          <Send size={15} />
          {t("publish")}
        </button>
      </div>
    </Dialog>
  );
}
function ProfileEditor({
  bot,
  t,
  onClose,
  onSave,
}: {
  bot: Bot;
  t: T;
  onClose: () => void;
  onSave: (v: Record<string, string>) => Promise<void>;
}) {
  const [v, setV] = useState({
      name: bot.name,
      role: bot.role,
      avatar: bot.avatar,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog title={t("profile")} onClose={onClose} closeLabel={t("close")}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(v);
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {(["name", "role", "avatar"] as const).map((k) => (
          <label key={k}>
            {t(k === "role" ? "mainWork" : k)}
            <input
              required={k === "name"}
              value={v[k]}
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
              placeholder={k === "avatar" ? "/assets/my-bot.png" : ""}
            />
          </label>
        ))}
        <p className="muted">{t("assets")}</p>
        {error && <p className="form-error">{error}</p>}
        <FormButtons t={t} onClose={onClose} busy={busy} />
      </form>
    </Dialog>
  );
}
function InlineTaskEditor({title,children,onClose,closeLabel}:{title:string;children:ReactNode;onClose:()=>void;closeLabel:string;wide?:boolean}) {return <section className="inline-task-editor"><div className="inline-editor-heading"><h3>{title}</h3><button className="icon-button" onClick={onClose} aria-label={closeLabel}><X size={17}/></button></div>{children}</section>}
function TaskEditor({
  embedded=false,
  categories,
  task,
  bots,
  t,
  botName,
  onClose,
  onSave,
}: {
  embedded?:boolean;
  task?: Task;
  categories: string[];
  bots: Bot[];
  t: T;
  botName: (id: string) => string;
  onClose: () => void;
  onSave: (v: Brief, publish: boolean) => Promise<void>;
}) {
  const [v, setV] = useState<Brief>(
      task?.draft || {
        title: "",
        description: "",
        criteria: "",
        type: "solo",
        boss: "bot-0",
        members: [],
        routine: false,
        schedule: "",
      },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: FormEvent, publish: boolean) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(v, publish);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const Container=embedded ? InlineTaskEditor : Dialog;
  return (
    <Container
      title={task ? t("edit") : t("newTask")}
      onClose={onClose}
      closeLabel={t("close")}
      wide
    >
      <form onSubmit={(e) => void save(e, true)}>
        <div className="segmented">
          <button
            type="button"
            className={v.type === "solo" ? "current" : ""}
            onClick={() => setV({ ...v, type: "solo", members: [] })}
          >
            {t("solo")}
          </button>
          <button
            type="button"
            className={v.type === "team" ? "current" : ""}
            onClick={() => setV({ ...v, type: "team" })}
          >
            {t("team")}
          </button>
        </div>
        <label>
          {t("category")}
          <input
            list="brief-categories"
            value={v.category || ""}
            maxLength={100}
            placeholder={t("newCategory")}
            onChange={(e) => setV({ ...v, category: e.target.value })}
          />
          <datalist id="brief-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label>
          {t("title")}
          <input
            required
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
          />
        </label>
        <label>
          {v.type === "team" ? "Boss" : t("assignee")}
          <select
            value={v.boss}
            onChange={(e) =>
              setV({
                ...v,
                boss: e.target.value,
                members: v.members.filter((id) => id !== e.target.value),
              })
            }
          >
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {botName(b.id)}
              </option>
            ))}
          </select>
        </label>
        {v.type === "team" && (
          <fieldset>
            <legend>{t("members")}</legend>
            <div className="member-picker">
              {bots
                .filter((b) => b.id !== v.boss)
                .map((b) => (
                  <label
                    key={b.id}
                    className={v.members.includes(b.id) ? "checked" : ""}
                  >
                    <input
                      type="checkbox"
                      checked={v.members.includes(b.id)}
                      disabled={
                        !v.members.includes(b.id) && v.members.length >= 5
                      }
                      onChange={(e) =>
                        setV({
                          ...v,
                          members: e.target.checked
                            ? [...v.members, b.id]
                            : v.members.filter((id) => id !== b.id),
                        })
                      }
                    />
                    <Avatar bot={b} />
                    {botName(b.id)}
                  </label>
                ))}
            </div>
          </fieldset>
        )}
        <label>
          {t("description")}
          <textarea
            rows={6}
            value={v.description}
            onChange={(e) => setV({ ...v, description: e.target.value })}
          />
        </label>
        <label>
          {t("criteria")}
          <textarea
            rows={2}
            value={v.criteria}
            onChange={(e) => setV({ ...v, criteria: e.target.value })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={v.routine}
            onChange={(e) => setV({ ...v, routine: e.target.checked })}
          />
          <RefreshCw size={15} />
          {t("routine")}
        </label>
        {v.routine && (
          <label>
            {t("schedule")}
            <input
              value={v.schedule}
              onChange={(e) => setV({ ...v, schedule: e.target.value })}
            />
            <small>{t("routineHint")}</small>
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <p className="muted save-hint">{t(task?.stage==="monitor" ? "monitorSaveHint" : "savedNotStarted")}</p>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button className="primary" type="submit" disabled={busy}>
            <Send size={15} />
            {t("publishTask")}
          </button>
        </div>
      </form>
    </Container>
  );
}
function ReasonDialog({
  t,
  title,
  onClose,
  onSave,
}: {
  t: T;
  title: string;
  onClose: () => void;
  onSave: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog title={title} onClose={onClose} closeLabel={t("close")}>
      <p>{t("ackHint")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(reason);
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("reason")}
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <FormButtons t={t} onClose={onClose} busy={busy} />
      </form>
    </Dialog>
  );
}
function ReportEditor({
  task,
  run,
  sub,
  add,
  t,
  botName,
  onClose,
  onSave,
}: {
  task: Task;
  run: Run;
  sub?: Subtask;
  add: boolean;
  t: T;
  botName: (id: string) => string;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => Promise<void>;
}) {
  const brief = run.brief;
  const [v, setV] = useState({
      subtaskId: sub?.id,
      title: sub?.title || "",
      botId: sub?.botId || brief.boss,
      status: sub?.status || (add ? "waiting" : run.status),
      progress: sub?.progress ?? (add ? 0 : run.progress),
      note: sub?.note ?? (add ? "" : run.note),
      blocked: sub?.blocked ?? (add ? false : run.blocked),
      reason: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title={t(add ? "addSubtask" : "report")}
      onClose={onClose}
      closeLabel={t("close")}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(v);
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {(add || sub) && (
          <>
            <label>
              {t("title")}
              <input
                required
                value={v.title}
                readOnly={!!run.flowPlan}
                onChange={(e) => setV({ ...v, title: e.target.value })}
              />
            </label>
            <label>
              {t("assignee")}
              <select
                value={v.botId}
                disabled={!!run.flowPlan}
                onChange={(e) => setV({ ...v, botId: e.target.value })}
              >
                {[brief.boss, ...brief.members].map((id) => (
                  <option key={id} value={id}>
                    {botName(id)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="form-row">
          <label>
            {t("status")}
            <select
              value={v.status}
              onChange={(e) =>
                setV({
                  ...v,
                  status: e.target.value as Status,
                  progress:
                    e.target.value === "done"
                      ? 100
                      : e.target.value === "waiting"
                        ? 0
                        : Math.min(v.progress, 99),
                })
              }
            >
              {(["waiting", "active", "done"] as const).map((s) => (
                <option value={s} key={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("progress")} (%)
            <input
              type="number"
              min={0}
              max={v.status === "active" ? 99 : 100}
              value={v.progress}
              disabled={v.status !== "active"}
              onChange={(e) => setV({ ...v, progress: Number(e.target.value) })}
            />
          </label>
        </div>
        <label>
          {t("note")}
          <textarea
            value={v.note}
            onChange={(e) => setV({ ...v, note: e.target.value })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={v.blocked}
            onChange={(e) => setV({ ...v, blocked: e.target.checked })}
          />
          {t("blocked")}
        </label>
        <label>
          {t("reason")}
          <input
            required
            value={v.reason}
            onChange={(e) => setV({ ...v, reason: e.target.value })}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <FormButtons t={t} onClose={onClose} busy={busy} />
      </form>
    </Dialog>
  );
}
function CategoryEditor({category,color,t,onClose,onSave}:{category:string;color:string;t:T;onClose:()=>void;onSave:(name:string,color:string)=>Promise<void>}) {
  const [name,setName]=useState(category),[selectedColor,setSelectedColor]=useState(color),[saving,setSaving]=useState(false),[error,setError]=useState("");
  return <Dialog title={t("categoryEdit")} onClose={onClose} closeLabel={t("close")}><form onSubmit={async e=>{e.preventDefault();setSaving(true);try{await onSave(name.trim(),selectedColor)}catch(e){setError(String(e))}finally{setSaving(false)}}}>
    <label>{t("categoryName")}<input autoFocus required={category!==""} maxLength={100} disabled={category===""} value={category===""?t("uncategorized"):name} onChange={e=>setName(e.target.value)}/></label>
    <fieldset className="category-palette"><legend>{t("boardColor")}</legend><div>{Object.entries(palette).map(([key,hex])=><label key={key} className={selectedColor===key?"selected":""} style={{"--swatch":hex} as React.CSSProperties}><input type="radio" name="category-color" value={key} checked={selectedColor===key} onChange={()=>setSelectedColor(key)}/><span>{selectedColor===key&&<Check size={17}/>}</span><small>{key}</small></label>)}</div></fieldset>
    <p className="muted">{t("categoryHint")}</p>{error&&<p className="form-error">{error}</p>}<FormButtons t={t} onClose={onClose} busy={saving}/>
  </form></Dialog>
}
function MarkdownDocument({text}:{text:string}) {
  const nodes:ReactNode[]=[];let code:string[]|null=null;
  text.split("\n").forEach((line,i)=>{
    if(line.startsWith("```")){if(code){nodes.push(<pre key={i}><code>{code.join("\n")}</code></pre>);code=null}else code=[];return}
    if(code){code.push(line);return}
    if(line.startsWith("### "))nodes.push(<h4 key={i}>{line.slice(4)}</h4>);
    else if(line.startsWith("## "))nodes.push(<h3 key={i}>{line.slice(3)}</h3>);
    else if(line.startsWith("# "))nodes.push(<h2 key={i}>{line.slice(2)}</h2>);
    else if(/^[-*] /.test(line))nodes.push(<p className="md-bullet" key={i}>{line.slice(2)}</p>);
    else if(line.trim())nodes.push(<p key={i}>{line}</p>);
  });
  if(code)nodes.push(<pre key="last-code"><code>{(code as string[]).join("\n")}</code></pre>);
  return <article className="markdown-document">{nodes}</article>
}
function TaskDetail({
  task,
  workspace,
  t,
  date,
  botName,
  statusBadge,
  onClose,
  lang,
  bots,
  categories,
  onSaveBrief,
  onDispatch,
  onHistory,
  onReport,
  onRun,
  onAdopt,
}: {
  task: Task;
  workspace:string;
  t: T;
  date: (v: string | null) => string;
  botName: (id: string) => string;
  statusBadge: (s: Status) => ReactNode;
  onClose: () => void;
  lang:Lang;
  bots:Bot[];
  categories:string[];
  onSaveBrief:(values:Brief,version:number)=>Promise<void>;
  onDispatch: () => void;
  onHistory: () => void;
  onReport: (r: Run, s?: Subtask, add?: boolean) => void;
  onRun: () => void;
  onAdopt: (r: Run) => void;
}) {
  const detailRef = useRef<HTMLElement>(null);
  const [editingTask,setEditingTask]=useState<Task|null>(null);
  const [mobilePane,setMobilePane]=useState<"brief"|"flow">("brief");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = detailRef.current;
    el?.querySelector<HTMLElement>("button")?.focus();
    function key(e: KeyboardEvent) {
      if (
        Array.from(document.querySelectorAll("[aria-modal=true]")).at(-1) !== el
      )
        return;
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
      if (e.key === "Tab" && el) {
        const nodes = Array.from(
          el.querySelectorAll<HTMLElement>(
            "button:not(:disabled),select,summary,a[href],input,textarea,[tabindex='0']",
          ),
        );
        const visibleNodes=nodes.filter(node=>node.getClientRects().length>0);
        const first = visibleNodes[0],
          last = visibleNodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  const [runId, setRunId] = useState<string>();
  const run = task.runs.find((r) => r.id === runId) || task.runs.at(-1);
  const runReadOnly=task.location==="library" || task.location==="trash" || run?.id!==task.runs.at(-1)?.id;
  const b = task.stage === "brief" ? task.draft : task.published || task.draft;
  return (
    <div className="detail-backdrop">
      <section
        ref={detailRef}
        className={`task-detail split-detail mobile-${mobilePane}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("details")}
      >
        <div className="panel-heading">
          <div>
            <ScrollText size={18} />
            <h2>{t("details")}</h2>
          </div>
          <button
            className="icon-button"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className="detail-mobile-tabs"><button className={mobilePane==="brief"?"current":""} onClick={()=>setMobilePane("brief")}>{t("details")}</button><button className={mobilePane==="flow"?"current":""} onClick={()=>setMobilePane("flow")}>{lang==="ko"?"업무 플로우":"Task flow"}</button></div>
        <div className="detail-workspace">
        <div className="detail-scroll detail-document">
          {editingTask ? <><p className="inline-edit-notice">{lang==="ko"?"오른쪽은 저장된 지시 기준입니다. 저장하면 봇에게 새 플로우 작성 요청이 전달됩니다.":"The flow reflects the saved brief. Saving requests a new bot plan."}</p><TaskEditor embedded task={editingTask} bots={bots} categories={categories} t={t} botName={botName} onClose={()=>setEditingTask(null)} onSave={async(values)=>{await onSaveBrief(values,editingTask.version);setEditingTask(null)}}/></> : <>
          {(task.location==="library" || task.retrospective) && <section className="retrospective-panel">
            <div className="result-heading"><div><BookOpen size={18}/><h2>{t("resultReport")}</h2></div><span className={`badge ${task.retrospectiveRequestId ? "waiting" : task.retrospective ? "done" : "neutral"}`}>{t(task.retrospectiveRequestId || !task.retrospective ? "resultPending" : "resultReady")}</span></div>
            {task.retrospectiveRequestId && <p className="muted">{t("resultHint")}</p>}
            {task.retrospective ? <><MarkdownDocument text={task.retrospective.markdown}/><div className="result-footer"><small>{botName(task.retrospective.botId)} · {date(task.retrospective.updatedAt)}</small>{task.location!=="trash" && <a className="secondary" href={`/api/retrospective?workspace=${workspace}&id=${encodeURIComponent(task.id)}`} download><Download size={14}/>{t("downloadMd")}</a>}</div></> : !task.retrospectiveRequestId && <p className="muted">{t("resultHint")}</p>}
          </section>}
          <div className="terminal-brief">
            <div className="terminal-bar">
              <span>● ● ●</span>
              <code>grokbot@city: ~/briefs/{task.id.slice(0, 8)}</code>
            </div>
            <div className="terminal-body">
              <div className="terminal-eyebrow">
                MISSION BRIEF <span>v{task.publishedVersion}</span>
              </div>
              <h2>{b.title}</h2>
              <p className="terminal-category">
                // {t("category")}: {b.category || t("uncategorized")}
              </p>
              <div className="terminal-meta">
                <span>
                  {b.type === "team" ? "BOSS" : "OWNER"} / {botName(b.boss)}
                </span>
                {b.routine && <span>↻ {t("routine")}</span>}
              </div>
              {b.members.length > 0 && (
                <p className="terminal-team">
                  {b.members.map(botName).join(" · ")}
                </p>
              )}
              <hr />
              <h3>{t("description")}</h3>
              <p className="preserve">{b.description || "—"}</p>
              <h3>{t("criteria")}</h3>
              <p className="preserve">{b.criteria || "—"}</p>
              {b.routine && (
                <>
                  <h3>{t("schedule")}</h3>
                  <p>{b.schedule || "—"}</p>
                </>
              )}
              <div className="terminal-prompt">
                $ <span>_</span>
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <button className="secondary" disabled={task.location==="library" || task.location==="trash"} onClick={()=>setEditingTask(task)}>
              {t("edit")}
            </button>
            <button className="secondary" onClick={onHistory}>
              {t("history")}
            </button>
            {task.stage === "brief" && (
              <button
                className="dispatch-switch"
                role="switch"
                aria-checked={task.ready}
                aria-label={t("start")}
                onClick={onDispatch}
              >
                <span className="switch-track">
                  <i />
                </span>
                {t("start")}
              </button>
            )}
          </div>
          {task.published &&
            JSON.stringify(task.draft) !== JSON.stringify(task.published) && (
              <p className="draft-note">{t("unsaved")}</p>
            )}
          {task.stage === "monitor" && run ? (
            <>
              {task.flowPlan?.version===task.publishedVersion && run.flowPlan?.version!==task.flowPlan?.version && run.status!=="done" && run.id===task.runs.at(-1)?.id && <div className="flow-adopt-notice"><p>{lang==="ko"?"새 플로우는 현재 회차와 분리되어 있습니다. 보고된 노드를 삭제·교체하는 구조 변경은 다음 회차에서 적용하세요.":"The new plan is separate from this run. Apply structural changes that remove or replace reported nodes in the next run."}</p><button className="secondary" disabled={runReadOnly} onClick={()=>onAdopt(run)}>{lang==="ko"?"플로우 적용":"Apply flow"}</button></div>}
              <section className="execution-timeline"><h3>{t("executionHistory")}</h3><div>{[...task.runs].reverse().map((entry)=><button key={entry.id} className={run.id===entry.id?"selected":""} onClick={()=>setRunId(entry.id)}><span className={`status-dot ${entry.status}`}/><strong>#{task.runs.indexOf(entry)+1}</strong><span>{t(entry.status)} · {entry.progress}%</span><small>{date(entry.updatedAt)}</small></button>)}</div></section>
              <div className="run-heading">
                <label>
                  {t("run")}
                  <select
                    aria-label={t("run")}
                    value={run.id}
                    onChange={(e) => setRunId(e.target.value)}
                  >
                    {task.runs.map((r, i) => (
                      <option value={r.id} key={r.id}>
                        #{i + 1} · {date(r.createdAt)}
                      </option>
                    ))}
                  </select>
                </label>
                {!b.routine &&
                  task.runs.at(-1)?.instructionVersion !==
                    task.publishedVersion && (
                  <button
                    className="secondary"
                    disabled={task.location==="library" || task.location==="trash" || task.runs.some((r) => r.status !== "done")}
                    onClick={onRun}
                  >
                    <Plus size={13} />
                    {t("newRun")}
                  </button>
                )}
              </div>
              {run.instructionVersion !== task.publishedVersion && (
                <div className="run-version">
                  <p className="muted">
                    {t("run")} v{run.instructionVersion} / {t("instructions")} v
                    {task.publishedVersion}
                  </p>
                  <details>
                    <summary>
                      {t("details")} v{run.instructionVersion}
                    </summary>
                    <p className="preserve">
                      {run.brief.title} — {botName(run.brief.boss)}
                      {String.fromCharCode(10)}
                      {run.brief.description}
                    </p>
                  </details>
                  {run.status !== "done" && (
                    <button className="secondary" onClick={() => onAdopt(run)}>
                      {t("publish")} v{task.publishedVersion}
                    </button>
                  )}
                </div>
              )}
              <div className="run-status">
                {statusBadge(run.status)}
                <strong>{run.progress}%</strong>
              </div>
              <Progress value={run.progress} />
              <div className="subtask-heading">
                <h3>{t("subtasks")}</h3>
                <button
                  className="text-button"
                  disabled={runReadOnly || !!run.flowPlan}
                  onClick={() => onReport(run, undefined, true)}
                >
                  <Plus size={14} />
                  {t("addSubtask")}
                </button>
              </div>
              {run.subtasks.map((s) => (
                <button
                  className="detail-subtask"
                  key={s.id}
                  disabled={runReadOnly}
                  onClick={() => onReport(run, s)}
                >
                  <span className={`status-dot ${s.status}`} />
                  <span>
                    <strong>{s.title}</strong>
                    <small>{botName(s.botId)}</small>
                  </span>
                  <b>{s.progress}%</b>
                  <ChevronRight size={14} />
                </button>
              ))}
              {!run.subtasks.length && (
                <button
                  className="secondary full"
                  disabled={runReadOnly}
                  onClick={() => onReport(run)}
                >
                  {t("report")}
                </button>
              )}
              {run.note && (
                <p
                  className={
                    run.blocked ? "blocked preserve" : "report-note preserve"
                  }
                >
                  {run.note}
                </p>
              )}
              <p className="muted">
                {t("lastReport")}:{" "}
                {run.source ? date(run.updatedAt) : t("noReport")}{" "}
                {run.source &&
                  ` · ${t(run.source === "bot" ? "bot" : "manual")}`}
              </p>
            </>
          ) : (
            <div className="brief-hint">
              <strong>{t(task.ready ? "ready" : "writing")}</strong>
              <p>{t("noRun")}</p>
              <small>{t("requestHint")}</small>
            </div>
          )}
          </>}
        </div>
        <div className="detail-flow"><FlowPanel task={task} run={task.stage==="monitor" ? run : undefined} lang={lang} botName={botName}/></div>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
