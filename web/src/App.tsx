import { useSyncExternalStore } from 'react'
import { subscribeLanguage, languageSnapshot } from './interfaceLocale'
import { ui } from './interfaceLocale'
import { SentScreenshots } from './components/SentScreenshots'
import { MeetingMonitor, type ReviewRequest } from './components/MeetingMonitor'
import { CitationLookup,TaskCitationContext } from './components/MynitCitation'
import type { MynitSource } from './mynitSource'
import { AssignmentEntry } from './assignmentEntry'
import { datedNotebookTask } from './suiteWorkspace'
import { requestJson, assertSharedNotebookOwner, notebookCitation } from './cloudAccount'
import { listen } from '@tauri-apps/api/event'
import { DIANE_SHARED_ORIGIN, parseTodoTaskLink, readSharedTodoTask } from './cloudAccount'
import { isTauri } from '@tauri-apps/api/core'
import { invoke } from './notebookCommand'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { SyncProgressView } from './components/SyncProgressView'
import { ProjectPage } from './components/ProjectPage'
import { effectiveProject } from './projectPlanning'
import { ArchivePage } from './components/ArchivePage'
import { readTaskArchive } from './taskArchiveReader'
import { archiveRows, type ArchiveRow } from './taskArchive'
import './styles/workflow.css'
import { DateHeader } from './components/DateHeader'
import { TaskList } from './components/TaskList'
import { DianeProvider } from './components/DianeAction'
import { AddTask } from './components/AddTask'
import { AlbumRecommendations } from './components/AlbumRecommendations'
import { DevToolsPanel } from './components/DevToolsPanel'
import { GoalsSidebar } from './components/GoalsSidebar'
import { MissionControlSidebar } from './components/MissionControlSidebar'
import { TrackingStationOverlay } from './components/TrackingStationOverlay'
import { SettingsPanel } from './components/SettingsPanel'
import { ScheduleView } from './components/ScheduleView'
import { WindowResizeHandles } from './components/WindowResizeHandles'
import { useNoteMaterial } from './noteMaterial'
import { useCalendar } from './hooks/useCalendar'
import { useCloudSync } from './hooks/useCloudSync'
import { useRoutines } from './hooks/useRoutines'
import { format } from 'date-fns'
import { useGoals } from './hooks/useGoals'
import { STAR_FOCUS_DEBUG_TIME_SCALE_OPTIONS, useStarFocus } from './hooks/useStarFocus'
import { useTasks } from './hooks/useTasks'
import { api, waitForPendingWrites } from './api'
import { useAppUpdates } from './hooks/useAppUpdates'
import { copyText } from './clipboard'
import { formatAgentPrompt } from './taskTransfer'
import { planningTaskKey, type PlannedBlock } from './taskPlanning'
import {
  isProviderConfigured,
  PROVIDER_ORDER,
  PROVIDER_PRESETS,
  settingsForProvider,
} from './llmProviders'
import type {
  AlbumRecommendationResult,
  AppSettings,
  Provider,
  Task,
} from './types'

const READY_LAYOUT_MIGRATION_KEY = 'todo-sticky-ready-layout-v1'
const COMPACT_LAYOUT_MAX_WIDTH = 760
const INTRO_SEEN_KEY = 'todo-sticky-intro-seen-v1'

interface AppNotice {
  kind: 'success' | 'error'
  title: string
  message?: string
}

export default function App() {
  const interfaceVersion = useSyncExternalStore(subscribeLanguage,languageSnapshot)
  useEffect(() => {
    if (!isTauri()) return
    const labels = {toggle:ui('Show or hide Dockit'),quit:ui('Quit Dockit'),about:ui('About Dockit'),
      hide:ui('Hide Dockit'),hideOthers:ui('Hide others'),edit:ui('Edit'),copy:ui('Copy'),paste:ui('Paste'),
      tray:ui('Dockit ({0} to toggle)')}
    void invoke('set_interface_menu',{labels}).catch(error => console.warn('Dockit menu refresh',error))
  },[interfaceVersion])
  const noteMaterial = useNoteMaterial()
  const calendar = useCalendar()
  const tasks = useTasks(calendar.dateStr, calendar.isCurrentDay)
  const goals = useGoals()
  const starFocus = useStarFocus(tasks.tasks)
  const [archivePage, setArchivePage] = useState<'search' | 'progress' | null>(null)
  const [activeProject,setActiveProject]=useState<string|null>(null)
  const [returnProject,setReturnProject]=useState<string|null>(null)
  const projectLeaveGuard=useRef<()=>boolean>(()=>true)
  const registerProjectLeaveGuard=useCallback((guard:(()=>boolean)|null)=>{projectLeaveGuard.current=guard??(()=>true)},[])
  const [projectWriting,setProjectWriting]=useState(false)
  const [archiveQuery, setArchiveQuery] = useState('')
  const [archiveTarget, setArchiveTarget] = useState<ArchiveRow | null>(null)
  const archiveOpener = useRef<HTMLElement | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsAccount, setSettingsAccount] = useState(false)
  const [showPlanner, setShowPlanner] = useState(false)
  const [settingsProvider, setSettingsProvider] = useState<Provider | undefined>()
  const [showTrackingStation, setShowTrackingStation] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [firstRun, setFirstRun] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiSettings, setAiSettings] = useState<AppSettings | null>(null)
  const [providerSwitching, setProviderSwitching] = useState(false)
  const [showAlbumRecommendations, setShowAlbumRecommendations] = useState(false)
  const [albumRecommendations, setAlbumRecommendations] = useState<AlbumRecommendationResult | null>(null)
  const [albumRecommendationTaskKey, setAlbumRecommendationTaskKey] = useState<string | null>(null)
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null)
  const [windowWidth, setWindowWidth] = useState(() => (
    typeof window === 'undefined' ? 1024 : window.innerWidth
  ))
  const restoredOverlaySessionRef = useRef<string | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiOperationRef = useRef(false)
  const currentFolderRef = useRef(aiSettings?.kbPath ?? '')
  currentFolderRef.current = aiSettings?.kbPath ?? ''
  const navigationRequest = useRef(0)
  const currentDateRef = useRef(calendar.dateStr)
  currentDateRef.current = calendar.dateStr
  const isCompactWindow = windowWidth <= COMPACT_LAYOUT_MAX_WIDTH
  const isDevMode = import.meta.env.DEV
  useEffect(() => {
    if (isTauri() || (!tasks.saving && !tasks.saveError)) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [tasks.saving, tasks.saveError])
  const [assignmentKey,setAssignmentKey] = useState<string>()
  const [citation,setCitation] = useState<{uid:string;date:string;taskId:string;source:MynitSource}>()
  const [taskLink,setTaskLink]=useState<string|null>(()=>{try{return parseTodoTaskLink(window.location.href)||localStorage.getItem('todo-sticky-pending-task-link-v1')}catch{return null}})
  const linkBusy=useRef(false),linkAccountShown=useRef(false),linkMounted=useRef(true)
  const taskLinkRef=useRef(taskLink);taskLinkRef.current=taskLink
  useEffect(()=>{linkMounted.current=true;return()=>{linkMounted.current=false}},[])
  const [linkTick,setLinkTick]=useState(0)


  const account = useCloudSync({
    kbPath: aiSettings?.kbPath || '',
    ready: Boolean(aiSettings) && !tasks.loading && !tasks.loadError && starFocus.hydrated,
    blocked: Boolean(aiLoading || providerSwitching || tasks.saveError || goals.storageError || showPlanner || projectWriting),
    focusActive: Boolean(starFocus.activeSession),
    changeKey: JSON.stringify([tasks.tasks, goals.targets, goals.recurring, starFocus.missionHistory]),
    flush: tasks.flushPendingSave, reload: tasks.load,
    goals: { targets: goals.targets, recurring: goals.recurring }, missions: starFocus.missionHistory,
    applyGoals: goals.applyCloudGoals, applyMission: starFocus.applyCloudMission,
  })
  const routines = useRoutines(aiSettings?.kbPath ?? '', format(new Date(), 'yyyy-MM-dd'), calendar.isCurrentDay && !tasks.loading && !tasks.loadError && !tasks.saveError && !tasks.rolloverLoading && !tasks.rolloverError && !goals.storageError && !account.applying, goals.recurring, tasks.ensureRoutineTask)
  useEffect(() => {
    if (!account.applying) return
    const shell = document.querySelector<HTMLElement>('.app-shell')
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    shell?.setAttribute('inert', '')
    return () => { shell?.removeAttribute('inert'); if (focused?.isConnected) focused.focus() }
  }, [account.applying])

  useEffect(() => {
    let revealed = false
    let frame = 0
    const reveal = () => {
      if (revealed) return
      revealed = true
      window.__stickyTodoBoot?.record('render-complete', '')
      if (isTauri()) void invoke('frontend_ready').catch(() => {})
    }
    // Commit the real shell before native launch visibility. Two frames allow a paint;
    // the short timer also handles WebKit throttling frames in a hidden window.
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(reveal) })
    const fallback = setTimeout(reveal, 120)
    return () => { cancelAnimationFrame(frame); clearTimeout(fallback) }
  }, [])
  const updateBlockedReason = starFocus.activeSession
    ? ui("Finish the focus session before updating.")
    : aiLoading || providerSwitching || tasks.loading
      ? ui("Wait for the current operation to finish.")
      : undefined
  const appUpdates = useAppUpdates(async () => {
    if (updateBlockedReason) throw new Error(updateBlockedReason)
    await tasks.flushPendingSave()
    await waitForPendingWrites()
  })
  const albumTaskContext = useMemo(() => tasks.tasks.map(task => ({
    text: task.text,
    status: task.status,
    steps: task.todaySubtasks.map(step => ({ text: step.text, status: step.status })),
  })), [tasks.tasks])
  const albumTaskKey = useMemo(() => JSON.stringify(albumTaskContext), [albumTaskContext])

  const presentNotice = useCallback((notice: AppNotice) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setAppNotice(notice)
    noticeTimerRef.current = setTimeout(() => setAppNotice(null), 6000)
  }, [])
  useEffect(() => () => { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current) }, [])

  const dismissIntro = useCallback(() => {
    setFirstRun(false)
    try { window.localStorage.setItem(INTRO_SEEN_KEY, 'seen') } catch { /* capture works without browser storage */ }
  }, [])

  const navigateAfterSave = useCallback(async (navigate: () => void) => {
    const request = ++navigationRequest.current
    try { await tasks.flushPendingSave(); if (request === navigationRequest.current) navigate() }
    catch {
      presentNotice({ kind: 'error', title: ui("Date unchanged"), message: ui("Retry saving your changes before switching days.") })
    }
  }, [tasks.flushPendingSave, presentNotice])

  const closeArchive = useCallback(() => {
    navigationRequest.current++
    setArchivePage(null)
    requestAnimationFrame(() => archiveOpener.current?.focus())
  }, [])
  const openArchiveTask = useCallback(async (row: ArchiveRow) => {
    if(!projectLeaveGuard.current())return
    const request = ++navigationRequest.current
    const folder = currentFolderRef.current
    await tasks.flushPendingSave()
    if (request !== navigationRequest.current || folder !== currentFolderRef.current) return
    setReturnProject(activeProject)
    setActiveProject(null)
    setArchiveTarget(row)
    calendar.goToDate(new Date(`${row.date}T12:00:00`))
    setArchivePage(null)
  }, [tasks.flushPendingSave, calendar.goToDate, activeProject])
  useEffect(() => {
    if (!archiveTarget || tasks.loading || tasks.dataDate !== archiveTarget.date || calendar.dateStr !== archiveTarget.date) return
    const root = document.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(archiveTarget.rootId)}"]`)
    if (!root) { if (!tasks.loadError) { presentNotice({ kind: 'error', title: ui("Task is no longer on this date") }); setArchiveTarget(null) }; return }
    const disclosure = root.querySelector<HTMLButtonElement>('.task-steps-toggle')
    if (archiveTarget.task.id !== archiveTarget.rootId && disclosure?.getAttribute('aria-expanded') === 'false') disclosure.click()
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(archiveTarget.task.id)}"]`) ?? root
      target.scrollIntoView({ block: 'center' })
      target.querySelector<HTMLElement>('.task-text')?.focus()
      setArchiveTarget(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [archiveTarget, tasks.loading, tasks.dataDate, tasks.loadError, tasks.tasks, calendar.dateStr, presentNotice])
  useEffect(()=>{
    let disposed=false,unlisten:(()=>void)|undefined
    const accept=(id:string|null)=>{if(!id||disposed||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(id))return;try{localStorage.setItem('todo-sticky-pending-task-link-v1',id)}catch{}setTaskLink(id);linkAccountShown.current=false;setLinkTick(value=>value+1)}
    const take=()=>{if(isTauri())void invoke<string|null>('take_task_link').then(accept).catch(()=>{})}
    if(isTauri())void listen('todo-task-link',take).then(fn=>{if(disposed)fn();else{unlisten=fn;take()}})
    const fromUrl=()=>accept(parseTodoTaskLink(window.location.href))
    const settled=()=>setTimeout(()=>{if(!disposed)setLinkTick(value=>value+1)},100)
    window.addEventListener('popstate',fromUrl);window.addEventListener('focus',take);document.addEventListener('focusout',settled);document.addEventListener('keyup',settled)
    return()=>{disposed=true;unlisten?.();window.removeEventListener('popstate',fromUrl);window.removeEventListener('focus',take);document.removeEventListener('focusout',settled);document.removeEventListener('keyup',settled)}
  },[])
  const lookupCitation = useMemo(() => {
    const {auth,user,server} = account
    return auth && user && server === DIANE_SHARED_ORIGIN ? (id:string) => notebookCitation(auth,user,id) : undefined
  },[account.auth,account.user,account.server])
  const linkAccount=useRef(account);linkAccount.current=account
  const meetingRequest = useMemo<ReviewRequest>(() => {
    const user = account.user
    return async (path, body) => {
      const current = () => user && linkAccount.current.user === user && linkAccount.current.server === DIANE_SHARED_ORIGIN
      if (!user || !current()) throw Error(ui("Account changed. Reopen the meeting review."))
      const token = await user.getIdToken()
      if (!current()) throw Error(ui("Account changed. Reopen the meeting review."))
      const value = await requestJson(DIANE_SHARED_ORIGIN, path, body ? {method:'POST', body:JSON.stringify(body)} : {}, token)
      if (!current()) throw Error(ui("Account changed. Reopen the meeting review."))
      return value
    }
  }, [account.user])
  useEffect(()=>{
    if(!taskLink||linkBusy.current||tasks.loading||!account.identityReady)return
    if(!account.user||account.server!==DIANE_SHARED_ORIGIN||(!datedNotebookTask(taskLink)&&!account.enabled)){
      if(!linkAccountShown.current){linkAccountShown.current=true;setSettingsAccount(true);setShowSettings(true);presentNotice({kind:'success',title:ui("Shared task waiting"),message:datedNotebookTask(taskLink) ? ui("Sign in with the account that assigned this task.") : ui("Sign in and enable sync to open this task.")})}
      return
    }
    if (linkAccountShown.current && showSettings) { linkAccountShown.current=false; setShowSettings(false); return }
    if(showSettings||showPlanner||showTrackingStation||projectWriting||!projectLeaveGuard.current())return
    const drafts=[...document.querySelectorAll<HTMLTextAreaElement>('textarea.task-inline-edit,textarea.outcome-editor,textarea#quick-add-task')]
    if(drafts.some(field=>field.value.trim()))return
    linkBusy.current=true;const uid=account.user.uid,requested=taskLink
    const current=()=>linkMounted.current&&taskLinkRef.current===requested&&linkAccount.current.user?.uid===uid
    void (async()=>{
      try{
        if (!account.auth || !account.user) throw Error(ui("Sign in to open this notebook task."))
        assertSharedNotebookOwner(account.auth,account.user)
        const local = datedNotebookTask(taskLink)
        const shared = local ? undefined : await readSharedTodoTask(taskLink,aiSettings?.kbPath || await invoke<string>('cloud_task_folder'))
        const target = local ?? shared!
        if (!local) await linkAccount.current.sync()
        const data=await api.extractTaskApi({date:target.date,canonicalDates:true})
        if(!current()||!projectLeaveGuard.current())return
        const rows=archiveRows(data.dates,goals.targets).filter(row=>row.date===target.date&&row.task.id===target.taskId)
        if(rows.length!==1)throw new Error(local ? ui("Open this link in the notebook where you assigned the task. If it was synced, sync this date in Account.") : ui("Sync this date in Account, then open the shared task again. The link is retained."))
        await openArchiveTask(rows[0]);if(!current())return
        setCitation(shared?.source ? {uid,date:target.date,taskId:target.taskId,source:shared.source} : undefined)
        localStorage.removeItem('todo-sticky-pending-task-link-v1');setTaskLink(null)
      }catch(error){if(current())presentNotice({kind:'error',title:ui("Task link waiting"),message:error instanceof Error?error.message:String(error)})}
      finally{linkBusy.current=false;if(linkMounted.current&&taskLinkRef.current!==requested)setLinkTick(value=>value+1)}
    })()
  },[taskLink,account.identityReady,account.user?.uid,account.server,account.enabled,tasks.loading,showSettings,showPlanner,showTrackingStation,projectWriting,linkTick])

  const syncState = account.error || account.conflicts.length ? 'attention'
    : !account.enabled || !account.user ? 'local'
      : account.busy && !account.background ? 'syncing' : account.upToDate && !tasks.saving ? 'synced' : 'waiting'
  const syncLabel = { attention: ui("Sync needs attention"), local: ui("Local only"), syncing: ui("Syncing"), synced: ui("Synced with cloud"), waiting: ui("Waiting to sync") }[syncState]

  useEffect(()=>{
    document.querySelector('.action-bar')?.toggleAttribute('inert',projectWriting)
    document.querySelector('.goals-sidebar')?.toggleAttribute('inert',projectWriting)
  },[projectWriting])
  const openProject = (id:string) => {
    if(projectWriting||!projectLeaveGuard.current())return
    setReturnProject(null)
    navigationRequest.current++;setActiveProject(id);setArchivePage(null);goals.setSidebarCollapsed(true);setShowAlbumRecommendations(false)
  }
  const assignProject = (taskId:string,goalId:string,subtaskId?:string) => {
    const project=goals.targets.find(goal=>goal.id===goalId)
    if(goalId && (!project || project.done))return
    if(goalId && !/^[A-Za-z0-9_-]{1,128}$/.test(goalId)){presentNotice({kind:'error',title:ui("Create a new project before linking this older goal.")});return}
    const root=tasks.tasks.find(task=>task.id===taskId)
    if(!root)return
    const target=subtaskId?root.todaySubtasks.find(step=>step.id===subtaskId):root
    if(!target)return
    tasks.assignProject(taskId,goalId||undefined,effectiveProject(target,goals.targets,effectiveProject(root,goals.targets)),subtaskId)
  }

  const openSettingsForProvider = useCallback((provider?: Provider) => {
    setSettingsAccount(false)
    setSettingsProvider(provider)
    setShowSettings(true)
  }, [])

  const handleQuickProviderChange = useCallback(async (provider: Provider) => {
    if (!aiSettings) return

    if (provider === aiSettings.provider) {
      if (!isProviderConfigured(aiSettings, provider)) {
        openSettingsForProvider(provider)
      }
      return
    }

    if (!isProviderConfigured(aiSettings, provider)) {
      openSettingsForProvider(provider)
      return
    }

    const nextSettings = settingsForProvider(aiSettings, provider)
    setProviderSwitching(true)
    try {
      await api.saveSettings(nextSettings)
      setAiSettings(nextSettings)
      presentNotice({
        kind: 'success',
        title: ui("AI: {0}", [PROVIDER_PRESETS[provider].shortLabel]),
        message: provider === 'codex'
          ? ui("Using your local Codex login.")
          : ui("Using {0}.", [nextSettings.model]),
      })
    } catch (error) {
      console.error('Provider switch failed', error)
      presentNotice({
        kind: 'error',
        title: ui("Provider unchanged"),
        message: ui("Could not save the selected AI provider."),
      })
    } finally {
      setProviderSwitching(false)
    }
  }, [aiSettings, openSettingsForProvider, presentNotice])

  useEffect(() => {
    api.checkFirstRun().then(isFirst => {
      if (isFirst) {
        try { setFirstRun(!window.localStorage.getItem(INTRO_SEEN_KEY)) }
        catch { setFirstRun(true) }
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.getSettings().then(setAiSettings).catch(() => {})
  }, [])

  useEffect(() => {
    if(!account.user || account.server!==DIANE_SHARED_ORIGIN || !aiSettings || showSettings || providerSwitching) return
    const unconfigured = aiSettings.providerChosen===false && !aiSettings.apiKey.trim() && !isProviderConfigured(aiSettings,aiSettings.provider)
    if(aiSettings.provider!=='openrouter' && !unconfigured) return
    let disposed=false
    const next=settingsForProvider(aiSettings,'diane')
    void api.saveSettings(next).then(()=>{if(!disposed)setAiSettings(next)}).catch(()=>{})
    return()=>{disposed=true}
  },[account.user,account.server,aiSettings,showSettings,providerSwitching])


  useEffect(() => {
    if (!starFocus.hydrated || typeof window === 'undefined') return

    try {
      if (window.localStorage.getItem(READY_LAYOUT_MIGRATION_KEY)) return
      goals.setSidebarCollapsed(true)
      starFocus.setSidebarCollapsed(true)
      if (starFocus.activeSession) setShowTrackingStation(true)
      window.localStorage.setItem(READY_LAYOUT_MIGRATION_KEY, 'complete')
    } catch (error) {
      console.error('Failed to normalize the ready layout', error)
    }
  }, [
    goals.setSidebarCollapsed,
    starFocus.activeSession,
    starFocus.hydrated,
    starFocus.setSidebarCollapsed,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!showAlbumRecommendations) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowAlbumRecommendations(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAlbumRecommendations])

  useEffect(() => {
    setShowPlanner(false)
    setShowAlbumRecommendations(false)
    setAlbumRecommendations(null)
    setAlbumRecommendationTaskKey(null)
  }, [calendar.dateStr])

  useEffect(() => {
    if (!albumRecommendationTaskKey || albumRecommendationTaskKey === albumTaskKey) return
    setShowAlbumRecommendations(false)
    setAlbumRecommendations(null)
    setAlbumRecommendationTaskKey(null)
  }, [albumRecommendationTaskKey, albumTaskKey])

  useEffect(() => {
    if (!isCompactWindow || (goals.sidebarCollapsed && starFocus.sidebarCollapsed)) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      goals.setSidebarCollapsed(true)
      starFocus.setSidebarCollapsed(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isCompactWindow,
    goals.sidebarCollapsed,
    goals.setSidebarCollapsed,
    starFocus.sidebarCollapsed,
    starFocus.setSidebarCollapsed,
  ])

  useEffect(() => {
    if (!isCompactWindow) return
    if (goals.sidebarCollapsed || starFocus.sidebarCollapsed) return

    goals.setSidebarCollapsed(true)
  }, [
    isCompactWindow,
    goals.sidebarCollapsed,
    goals.setSidebarCollapsed,
    starFocus.sidebarCollapsed,
  ])

  useEffect(() => {
    if (!starFocus.hydrated || !starFocus.activeSession || !starFocus.restoredSession) return

    const sessionKey = `${starFocus.activeSession.taskId}:${starFocus.activeSession.startedAt}`
    if (restoredOverlaySessionRef.current === sessionKey) return

    restoredOverlaySessionRef.current = sessionKey

    if (starFocus.sidebarCollapsed) {
      setShowTrackingStation(true)
    }
  }, [
    starFocus.hydrated,
    starFocus.activeSession,
    starFocus.restoredSession,
    starFocus.sidebarCollapsed,
  ])

  useEffect(() => {
    if (starFocus.activeSession) return
    restoredOverlaySessionRef.current = null
  }, [starFocus.activeSession])

  const handleAIBreakdown = useCallback(async (taskId: string) => {
    if (aiOperationRef.current) return
    const task = tasks.tasks.find(t => t.id === taskId)
    if (!task || task.status === 'done' || task.status === 'stopped' || tasks.loading
      || tasks.dataDate !== calendar.dateStr) return
    const requestDate = calendar.dateStr
    const requestTaskKey = planningTaskKey([task])
    aiOperationRef.current = true
    setAiLoading(taskId)
    try {
      const existing = task.todaySubtasks.map(s => s.text)
      const result = await api.llmBreakdown({
        taskText: [task.text, task.finish?.doneWhen && `Done when: ${task.finish.doneWhen}`, task.finish?.by && `Committed deadline: ${task.finish.by}`].filter(Boolean).join('\n'),
        existingSubtasks: existing,
      })
      if (currentDateRef.current === requestDate && result.subtasks?.length) {
        tasks.addAISubtasks(taskId, result.subtasks, requestDate, requestTaskKey)
      }
    } catch (e) {
      console.error('AI breakdown failed:', e)
      presentNotice({
        kind: 'error',
        title: ui("Could not break down task"),
        message: ui("Check the AI provider in Settings, then try again."),
      })
    } finally {
      aiOperationRef.current = false
      setAiLoading(null)
    }
  }, [tasks, calendar.dateStr, presentNotice])

  const handleApplyPlan = useCallback((schedule: PlannedBlock[], date: string, taskKey: string) => {
    if (tasks.loading || date !== calendar.dateStr || taskKey !== planningTaskKey(tasks.tasks)) return
    tasks.applySchedule(schedule, date, taskKey)
    setShowPlanner(false)
  }, [calendar.dateStr, tasks.tasks, tasks.loading, tasks.applySchedule])

  const handleAlbumRecommendations = useCallback(async () => {
    if (!albumTaskContext.length || aiOperationRef.current) return
    aiOperationRef.current = true
    setShowAlbumRecommendations(true)
    setAiLoading('albums')
    try {
      const result = await api.llmRecommendAlbums({
        tasks: albumTaskContext,
      })
      const albums = Array.isArray(result.albums)
        ? result.albums.filter(album => album?.title && album?.artist).slice(0, 4)
        : []

      if (!albums.length) throw new Error(ui("The AI provider returned no album recommendations"))

      setAlbumRecommendations({
        summary: typeof result.summary === 'string' ? result.summary : '',
        albums,
      })
      setAlbumRecommendationTaskKey(albumTaskKey)
    } catch (error) {
      console.error('Album recommendations failed:', error)
      setShowAlbumRecommendations(false)
      presentNotice({
        kind: 'error',
        title: ui("Could not find albums"),
        message: ui("Check the AI provider in Settings, then try again."),
      })
    } finally {
      aiOperationRef.current = false
      setAiLoading(null)
    }
  }, [albumTaskContext, albumTaskKey, presentNotice])

  const handleFocusTask = useCallback((taskId: string, taskText: string) => {
    starFocus.selectTask(taskId, taskText)
    if (starFocus.sidebarCollapsed) {
      setShowTrackingStation(true)
    }
  }, [starFocus.selectTask, starFocus.sidebarCollapsed])

  const handleReviewFocus = useCallback(async () => {
    const mission = starFocus.latestCompletedMission
    if (!mission) return
    const folder = currentFolderRef.current
    const date = currentDateRef.current
    const request = ++navigationRequest.current
    setShowTrackingStation(false)
    try {
      await tasks.flushPendingSave()
      const result = await readTaskArchive(folder)
      if (folder !== currentFolderRef.current || date !== currentDateRef.current || request !== navigationRequest.current) return
      const matches = archiveRows(result.dates).filter(row => row.task.id === mission.taskId || `${row.date}:${row.task.id}` === mission.taskId)
      if (matches.length === 1) await openArchiveTask(matches[0])
      else {
        setArchiveQuery(mission.taskText)
        setArchivePage('search')
        presentNotice({ kind: 'error', title: matches.length ? ui("Find the task by its date") : ui("The focus task may have moved or been removed") })
      }
    } catch {
      presentNotice({ kind: 'error', title: ui("Could not open the task"), message: ui("Your focus session is saved. Retry from Focus when history is available.") })
    }
  }, [starFocus.latestCompletedMission, tasks.flushPendingSave, openArchiveTask, presentNotice])

  const handleCarryForward = useCallback(async (taskId: string, subtaskId?: string) => {
    try {
      const target = await tasks.carryForward(taskId, subtaskId)
      if (!target) return

      presentNotice({
        kind: 'success',
        title: ui("Moved to {0}", [target.actionLabel]),
      })
    } catch (error) {
      console.error('Carry task forward failed:', error)
      presentNotice({
        kind: 'error',
        title: ui("Could not move task"),
        message: error instanceof Error ? error.message : ui("The task could not be moved. Your current edits are still here."),
      })
    }
  }, [tasks.carryForward, presentNotice])

  const handleCopyTask = useCallback(async (text: string, subtasks: Task[], finish?: import('./types').FinishPromise) => {
    try {
      await copyText(formatAgentPrompt({
        text,
        finish,
        subtasks: subtasks.map(subtask => subtask.text),
      }))
      presentNotice({
        kind: 'success',
        title: ui("Task copied"),
        message: ui("Paste it into Codex or another execution agent."),
      })
    } catch (error) {
      console.error('Copy agent prompt failed:', error)
      presentNotice({
        kind: 'error',
        title: ui("Could not copy prompt"),
        message: ui("Clipboard access was unavailable. Try again with the app active."),
      })
    }
  }, [presentNotice])

  const handleToggleGoalsSidebar = useCallback(() => {
    const willExpand = goals.sidebarCollapsed

    if (willExpand && isCompactWindow) {
      starFocus.setSidebarCollapsed(true)
    }

    goals.toggleSidebar()
  }, [
    goals.sidebarCollapsed,
    goals.toggleSidebar,
    isCompactWindow,
    starFocus.setSidebarCollapsed,
  ])

  const handleToggleMissionSidebar = useCallback(() => {
    const willExpand = starFocus.sidebarCollapsed

    if (willExpand && isCompactWindow) {
      goals.setSidebarCollapsed(true)
    }

    starFocus.toggleSidebar()
  }, [
    goals.setSidebarCollapsed,
    isCompactWindow,
    starFocus.sidebarCollapsed,
    starFocus.toggleSidebar,
  ])

  return (
    <CitationLookup.Provider value={lookupCitation}><AssignmentEntry.Provider value={{requested:assignmentKey,open:(id,date) => {
      setAssignmentKey((date || calendar.dateStr) + ':' + id)
      setSettingsAccount(true); setShowSettings(true)
    }}}><TaskCitationContext.Provider value={citation && citation.uid === account.user?.uid && citation.date === calendar.dateStr ? citation : undefined}><div data-material={noteMaterial.material} className={`app-shell ${isCompactWindow ? 'is-compact' : 'is-wide'}`}>
      {isTauri() && /Mac/.test(navigator.platform) && <SentScreenshots date={calendar.dateStr}
        disabled={tasks.loading || Boolean(tasks.loadError) || tasks.dataDate !== calendar.dateStr}
        onAdd={(title, steps) => { tasks.addTaskBundle(title, steps); if (firstRun) dismissIntro() }} />}
      {isTauri() && <WindowResizeHandles />}
      <GoalsSidebar
        onOpenProject={openProject}
        routines={routines}
        storageError={goals.storageError}
        recoveryNotice={goals.recoveryNotice}
        onRetrySave={goals.retrySave}
        collapsed={goals.sidebarCollapsed}
        targets={goals.targets}
        recurring={goals.recurring}
        onToggleCollapse={handleToggleGoalsSidebar}
        onAddGoal={goals.addGoal}
        onUpdateGoal={goals.updateGoal}
        onDeleteGoal={goals.deleteGoal}
        onToggleGoal={goals.toggleGoal}
      />

      {isCompactWindow && (!goals.sidebarCollapsed || !starFocus.sidebarCollapsed) && (
        <button
          className="sidebar-backdrop"
          onClick={() => {
            goals.setSidebarCollapsed(true)
            starFocus.setSidebarCollapsed(true)
          }}
          aria-label={ui("Close side panel")}
        />
      )}

      <div className="sticky-container">
        {activeProject ? <ProjectPage key={`${activeProject}:${aiSettings?.kbPath}`} goalId={activeProject} goals={goals.targets} folder={aiSettings?.kbPath??''}
          flush={tasks.flushPendingSave} getGoal={goals.currentProject} saveGoal={goals.saveProject} reloadTasks={tasks.load}
          onWriting={setProjectWriting} registerLeaveGuard={registerProjectLeaveGuard} onOpen={openArchiveTask} onBack={()=>{if(!projectWriting){const id=activeProject;setActiveProject(null);goals.setSidebarCollapsed(false);requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-project-id="${CSS.escape(id)}"]`)?.focus())}}} /> : archivePage ? <ArchivePage goals={goals.targets} key={`${archivePage}:${aiSettings?.kbPath}`} folder={aiSettings?.kbPath ?? ''} initialQuery={archiveQuery} mode={archivePage} date={calendar.dateStr}
          flush={tasks.flushPendingSave} missions={starFocus.missionHistory} onBack={closeArchive} onOpen={openArchiveTask} /> : <>
        <DateHeader
          projectBackLabel={returnProject?goals.targets.find(goal=>goal.id===returnProject)?.text.split('\n')[0]:undefined}
          onBackProject={()=>{if(returnProject)openProject(returnProject)}}
          displayDate={calendar.displayDate}
          selectedDate={calendar.selectedDate}
          calendarOpen={calendar.calendarOpen}
          isCurrentDay={calendar.isCurrentDay}

          onPrev={() => { void navigateAfterSave(calendar.goPrev) }}
          onNext={() => { void navigateAfterSave(calendar.goNext) }}
          onToggleCalendar={calendar.toggleCalendar}
          onSelectDate={date => { void navigateAfterSave(() => calendar.goToDate(date)) }}
          onToday={() => { void navigateAfterSave(calendar.goToday) }}
          onCloseCalendar={() => calendar.setCalendarOpen(false)}
        />

        <AddTask
          onAdd={text => { tasks.addTask(text); if (firstRun) dismissIntro() }}
          screenshot={isTauri() && /Mac/.test(navigator.platform) ? {
            context: JSON.stringify([calendar.dateStr, aiSettings?.kbPath]),
            ready: tasks.dataDate === calendar.dateStr,
          } : undefined}
          prominent={!tasks.loading && !tasks.tasks.length}
          autoFocus={!showSettings && !showPlanner && !showTrackingStation}
          disabled={tasks.loading || Boolean(tasks.loadError)}
        />

        {calendar.isCurrentDay && account.user && account.server === DIANE_SHARED_ORIGIN &&
          <MeetingMonitor key={account.user.uid} request={meetingRequest} onAdded={() => { if (account.enabled) void account.sync() }}/>}
        {firstRun && !showSettings && (
          <div className="first-use-note">
            <p>{ui("AI assistance is optional.")}</p>
            <button onClick={event => { event.currentTarget.focus(); openSettingsForProvider(aiSettings?.provider) }}>{ui("Set up AI")}</button>
            <button onClick={dismissIntro} aria-label={ui("Dismiss introduction")}>✕</button>
          </div>
        )}

        {tasks.saveError && (
          <div className="task-save-error" role="alert">
            <div><strong>{ui("Changes not saved · {0}", [tasks.saveError.date])}</strong><p>{tasks.saveError.message}</p></div>
            <button disabled={tasks.saving} onClick={async () => {
              if (await tasks.retrySave() && tasks.dataDate !== calendar.dateStr) await tasks.load()
            }}>{tasks.saving ? ui("Retrying…") : ui("Retry save")}</button>
          </div>
        )}

        {aiLoading && (
          <div className="ai-loading">
            <div className="spinner" />
            <span>
              {aiLoading === 'schedule'
                ? ui("Generating schedule...")
                : aiLoading === 'albums'
                  ? ui("Finding albums...")
                  : ui("Breaking down task...")}
            </span>
          </div>
        )}

        <DianeProvider enabled={aiSettings?.connectDiane === true} date={calendar.dateStr} kbPath={aiSettings?.kbPath || "default"}>
          <TaskList
            projects={goals.targets} onOpenProject={openProject} onAssignProject={assignProject}
            rolloverLoading={tasks.rolloverLoading}
            rolloverError={tasks.rolloverError}
            tasks={tasks.tasks}
            loading={tasks.loading}
            loadError={tasks.loadError}

            selectedTaskId={starFocus.selectedTaskId}
            focusLocked={Boolean(starFocus.activeSession)}
            isCurrentDay={calendar.isCurrentDay}
            moveTargetLabel={tasks.carryForwardTarget.actionLabel}
            onToggle={tasks.toggleStatus}
            onDelete={tasks.deleteTask}
            onPush={handleCarryForward}
            onCopyTask={handleCopyTask}
            onTextChange={tasks.updateTaskText}
            onUpdateFinish={tasks.updateFinish}
            onReview={tasks.reviewTask}
            onAddSubtask={tasks.addSubtask}
            onAddTask={tasks.addTask}
            onMoveToToday={tasks.moveToToday}
            onReorderTask={tasks.reorderTasks}
            onReorderSubtask={tasks.reorderSubtasks}
            onAIBreakdown={handleAIBreakdown}
            onFocusTask={handleFocusTask}
            onGoToday={() => { void navigateAfterSave(calendar.goToday) }}
            onRetryLoad={tasks.load}
          />
        </DianeProvider>

        {isDevMode && showDevTools && (
          <DevToolsPanel
            taskCount={tasks.tasks.length}
            missionActive={Boolean(starFocus.activeSession)}
            missionTimeScale={starFocus.debugTimeScale}
            missionTimeScaleOptions={[...STAR_FOCUS_DEBUG_TIME_SCALE_OPTIONS]}
            onAddSampleTask={tasks.addDebugTask}
            onAddTaskPack={tasks.addDebugTaskPack}
            onClearDay={tasks.clearAllTasks}
            onReload={tasks.load}
            onSetMissionTimeScale={starFocus.setDebugTimeScale}
          />
        )}

        {showAlbumRecommendations && (
          <AlbumRecommendations
            result={albumRecommendations}
            loading={aiLoading === 'albums'}
            providerLabel={aiSettings
              ? PROVIDER_PRESETS[aiSettings.provider].shortLabel
              : 'AI'}
            onClose={() => setShowAlbumRecommendations(false)}
            onRegenerate={handleAlbumRecommendations}
          />
        )}

        {tasks.undo && (
          <div className="task-undo-notice" role="status">
            <span>{tasks.undo.label}</span>
            <button disabled={tasks.loading} onClick={tasks.undoLastAction}>{ui("Undo")}</button>
            <button onClick={tasks.dismissUndo} aria-label={ui("Dismiss undo")}>✕</button>
          </div>
        )}

        </>}
        <div className="action-bar">
          {isDevMode && (
            <button
              className={`dev-toggle ${showDevTools ? 'active' : ''}`}
              onClick={() => setShowDevTools(value => !value)}
            >{ui("Dev")}</button>
          )}
          {isCompactWindow && (
            <>
              <button className="compact-goals-entry" aria-controls="goals-panel" aria-expanded={!goals.sidebarCollapsed}
                onClick={event => { event.currentTarget.focus(); handleToggleGoalsSidebar() }}>{ui("Goals")}</button>
              <button className={`compact-focus-entry${starFocus.activeSession ? ' active' : ''}`}
                onClick={event => { event.currentTarget.focus(); goals.setSidebarCollapsed(true); setShowTrackingStation(true) }}
                title={starFocus.activeSession?.pausedAt ? ui("Focus paused") : starFocus.activeSession ? ui("Focus session in progress") : ui("Open Focus Mode")}>{ui("Focus")}{starFocus.activeSnapshot && <span className="compact-focus-clock">
                  {starFocus.activeSession?.pausedAt ? 'Ⅱ ' : ''}{Math.floor(Math.ceil(starFocus.activeSnapshot.remainingMs / 1000) / 60)}:{String(Math.ceil(starFocus.activeSnapshot.remainingMs / 1000) % 60).padStart(2, '0')}
                </span>}</button>
            </>
          )}
          <button
            onClick={event => { event.currentTarget.focus(); setShowPlanner(true) }}
            disabled={!!aiLoading || !tasks.tasks.some(task => task.status !== 'done' && task.status !== 'stopped') || tasks.loading}
            title={ui("Preview an AI plan for the selected date")}
          >{ui("Plan")}</button>
          <button
            className={showAlbumRecommendations ? 'active' : ''}
            onClick={() => {
              if (showAlbumRecommendations) {
                setShowAlbumRecommendations(false)
              } else if (albumRecommendations && albumRecommendationTaskKey === albumTaskKey) {
                setShowAlbumRecommendations(true)
              } else {
                handleAlbumRecommendations()
              }
            }}
            disabled={!!aiLoading || !tasks.tasks.length}
            aria-expanded={showAlbumRecommendations}
            title={tasks.tasks.length
              ? ui("Recommend albums for the current tasks")
              : ui("Add a task before finding albums")}
          >{ui("Albums")}</button>
          <button className="workflow-entry" aria-label={ui("Search tasks")} title={ui("Search tasks")} onClick={event => { if(!projectLeaveGuard.current())return; navigationRequest.current++; archiveOpener.current = event.currentTarget; goals.setSidebarCollapsed(true); calendar.setCalendarOpen(false); setShowAlbumRecommendations(false); setArchiveQuery(''); setActiveProject(null); setArchivePage('search') }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5"/><path d="m12 12 5 5"/></svg>
          </button>
          <button className="workflow-entry" aria-label={ui("Progress")} title={ui("Progress")} onClick={event => { if(!projectLeaveGuard.current())return; navigationRequest.current++; archiveOpener.current = event.currentTarget; goals.setSidebarCollapsed(true); calendar.setCalendarOpen(false); setShowAlbumRecommendations(false); setActiveProject(null); setArchivePage('progress') }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3v14h14M7 14V9m4 5V5m4 9v-7"/></svg>
          </button>
          <div className="spacer" />
          <button className="sync-indicator" onClick={() => { setSettingsAccount(true); setSettingsProvider(undefined); setShowSettings(true) }}
            title={ui("{0}. Open Account", [syncLabel])} aria-label={ui("{0}. Open Account", [syncLabel])}>
            <span className={`sync-mark ${syncState}`} aria-hidden="true">{{ attention: '!', local: '−', syncing: '↻', synced: '✓', waiting: '·' }[syncState]}</span>
          </button>
          {!isCompactWindow && <div
            className={`provider-quick-control ${
              aiSettings && isProviderConfigured(aiSettings, aiSettings.provider)
                ? 'configured'
                : 'needs-setup'
            }`}
            title={aiSettings
              ? isProviderConfigured(aiSettings, aiSettings.provider)
                ? ui("AI provider: {0}", [PROVIDER_PRESETS[aiSettings.provider].label])
                : ui("Set up {0}", [PROVIDER_PRESETS[aiSettings.provider].label])
              : ui("Loading AI provider")}
          >
            <span className="provider-status-dot" aria-hidden="true" />
            <select
              value={
                aiSettings && isProviderConfigured(aiSettings, aiSettings.provider)
                  ? aiSettings.provider
                  : ''
              }
              onChange={event => handleQuickProviderChange(event.target.value as Provider)}
              disabled={!aiSettings || providerSwitching || Boolean(aiLoading)}
              aria-label={ui("Active AI provider")}
              aria-busy={providerSwitching}
            >
              {!aiSettings && <option value="">{ui("AI")}</option>}
              {aiSettings && !isProviderConfigured(aiSettings, aiSettings.provider) && (
                <option value="">{ui("Set up {0}", [PROVIDER_PRESETS[aiSettings.provider].shortLabel])}</option>
              )}
              {PROVIDER_ORDER.filter(provider => isTauri() || provider === 'diane').map(provider => (
                <option key={provider} value={provider}>
                  {PROVIDER_PRESETS[provider].shortLabel}
                  {aiSettings && !isProviderConfigured(aiSettings, provider) ? ui(" · Set up") : ''}
                </option>
              ))}
            </select>
          </div>}
          <button
            className="gear settings-update-button"
            onClick={event => { event.currentTarget.focus(); openSettingsForProvider() }}
            title={appUpdates.needsAttention ? ui("Settings · Update ready") : ui("Settings")}
            aria-label={appUpdates.needsAttention ? ui("Settings, update ready") : ui("Settings")}
          >
            ⚙
            {appUpdates.needsAttention && <span className="update-dot settings-update-dot" aria-hidden="true" />}
          </button>
        </div>

        {appNotice && !showSettings && !showPlanner && !showTrackingStation && (
          <div
            className={`schedule-toast ${appNotice.kind}`}
            onClick={() => setAppNotice(null)}
            role="status"
          >
            <strong>{appNotice.title}</strong>
            {appNotice.message && <p>{appNotice.message}</p>}
          </div>
        )}
        {showPlanner && (
          <ScheduleView date={calendar.dateStr} tasks={tasks.tasks} tasksLoading={tasks.loading} machines={aiSettings?.machines ?? []}
            onApply={handleApplyPlan} onClose={() => setShowPlanner(false)} />
        )}
        {showSettings && (
          <SettingsPanel
            account={account}
            initialAccount={settingsAccount}
            noteMaterial={noteMaterial.material}
            onNoteMaterial={noteMaterial.choose}
            materialSaveError={noteMaterial.error}
            appUpdates={appUpdates}
            updateBlockedReason={updateBlockedReason}
            onClose={() => {
              setAssignmentKey(undefined)
              setShowSettings(false)
              dismissIntro()
              setSettingsProvider(undefined)
            }}
            onBeforeSave={tasks.flushPendingSave}
            onSaved={settings => {
              const folderChanged = aiSettings?.kbPath !== settings.kbPath
              setAiSettings(settings)
              if (folderChanged) { tasks.dismissUndo(); void tasks.load() }
            }}
            firstRun={firstRun}
            initialProvider={settingsProvider}
          />
        )}
      </div>

      <MissionControlSidebar
        collapsed={starFocus.sidebarCollapsed}
        taskCount={tasks.tasks.length}
        selectedTaskText={starFocus.selectedTaskText}
        sessionDurationMinutes={starFocus.sessionDurationMinutes}
        activeSession={starFocus.activeSession}
        activeSnapshot={starFocus.activeSnapshot}
        missionHistory={starFocus.missionHistory}
        onReviewTask={handleReviewFocus}
        latestCompletedMission={starFocus.latestCompletedMission}
        restoredSession={starFocus.restoredSession}
        onToggleCollapse={handleToggleMissionSidebar}
        onOpenOverlay={() => setShowTrackingStation(true)}
        onSelectDuration={starFocus.setSessionDuration}
        onLaunch={starFocus.launchSession}
        onPause={starFocus.pauseSession}
        onResume={starFocus.resumeSession}
        onCancel={starFocus.cancelSession}
        onComplete={starFocus.completeSession}
        onClearSelection={starFocus.clearSelectedTask}
        onDismissCompletion={starFocus.dismissCompletion}
        onClearHistory={starFocus.clearHistory}
        onResetOrbitMap={starFocus.resetOrbitMap}
      />

      {showTrackingStation && (
        <TrackingStationOverlay
          collapsed={starFocus.sidebarCollapsed}
          taskCount={tasks.tasks.length}
          selectedTaskText={starFocus.selectedTaskText}
          sessionDurationMinutes={starFocus.sessionDurationMinutes}
          archiveRetentionLimit={starFocus.archiveRetentionLimit}
          activeSession={starFocus.activeSession}
          activeSnapshot={starFocus.activeSnapshot}
          missionHistory={starFocus.missionHistory}
          onReviewTask={handleReviewFocus}
        latestCompletedMission={starFocus.latestCompletedMission}
          restoredSession={starFocus.restoredSession}
          onClose={() => setShowTrackingStation(false)}
          onSelectDuration={starFocus.setSessionDuration}
          onSelectArchiveRetentionLimit={starFocus.setArchiveRetentionLimit}
          onLaunch={starFocus.launchSession}
          onPause={starFocus.pauseSession}
          onResume={starFocus.resumeSession}
          onCancel={starFocus.cancelSession}
          onComplete={starFocus.completeSession}
          onClearSelection={starFocus.clearSelectedTask}
          onDismissCompletion={starFocus.dismissCompletion}
          onClearHistory={starFocus.clearHistory}
          onResetOrbitMap={starFocus.resetOrbitMap}
        />
      )}
    </div>{account.applying && !account.background && <div className="cloud-sync-applying"><div>{account.progress ? <SyncProgressView progress={account.progress} /> : ui("Updating your notes…")}</div></div>}</TaskCitationContext.Provider></AssignmentEntry.Provider></CitationLookup.Provider>
  )
}
