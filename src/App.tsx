import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
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
import { useCalendar } from './hooks/useCalendar'
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
  ViewMode,
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
  const calendar = useCalendar()
  const tasks = useTasks(calendar.dateStr, calendar.isCurrentDay)
  const goals = useGoals()
  const starFocus = useStarFocus(tasks.tasks)
  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [showSettings, setShowSettings] = useState(false)
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
  const currentDateRef = useRef(calendar.dateStr)
  currentDateRef.current = calendar.dateStr
  const isCompactWindow = windowWidth <= COMPACT_LAYOUT_MAX_WIDTH
  const isDevMode = import.meta.env.DEV
  const updateBlockedReason = starFocus.activeSession
    ? 'Finish the focus session before updating.'
    : aiLoading || providerSwitching || tasks.loading
      ? 'Wait for the current operation to finish.'
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
    try { await tasks.flushPendingSave(); navigate() }
    catch {
      presentNotice({ kind: 'error', title: 'Date unchanged', message: 'Retry saving your changes before switching days.' })
    }
  }, [tasks.flushPendingSave, presentNotice])

  const openSettingsForProvider = useCallback((provider?: Provider) => {
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
        title: `AI: ${PROVIDER_PRESETS[provider].shortLabel}`,
        message: provider === 'codex'
          ? 'Using your local Codex login.'
          : `Using ${nextSettings.model}.`,
      })
    } catch (error) {
      console.error('Provider switch failed', error)
      presentNotice({
        kind: 'error',
        title: 'Provider unchanged',
        message: 'Could not save the selected AI provider.',
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
        title: 'Could not break down task',
        message: 'Check the AI provider in Settings, then try again.',
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

      if (!albums.length) throw new Error('The AI provider returned no album recommendations')

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
        title: 'Could not find albums',
        message: 'Check the AI provider in Settings, then try again.',
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

  const handleCarryForward = useCallback(async (taskId: string, subtaskId?: string) => {
    try {
      const target = await tasks.carryForward(taskId, subtaskId)
      if (!target) return

      presentNotice({
        kind: 'success',
        title: `Moved to ${target.actionLabel}`,
      })
    } catch (error) {
      console.error('Carry task forward failed:', error)
      presentNotice({
        kind: 'error',
        title: 'Could not move task',
        message: 'The task was restored. Try again in a moment.',
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
        title: 'Task copied',
        message: 'Paste it into Codex or another execution agent.',
      })
    } catch (error) {
      console.error('Copy agent prompt failed:', error)
      presentNotice({
        kind: 'error',
        title: 'Could not copy prompt',
        message: 'Clipboard access was unavailable. Try again with the app active.',
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
    <div className={`app-shell ${isCompactWindow ? 'is-compact' : 'is-wide'}`}>
      <WindowResizeHandles />
      <GoalsSidebar
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
          aria-label="Close side panel"
        />
      )}

      <div className="sticky-container">
        <DateHeader
          displayDate={calendar.displayDate}
          selectedDate={calendar.selectedDate}
          calendarOpen={calendar.calendarOpen}
          isCurrentDay={calendar.isCurrentDay}
          viewMode={viewMode}
          onPrev={() => { void navigateAfterSave(calendar.goPrev) }}
          onNext={() => { void navigateAfterSave(calendar.goNext) }}
          onToggleCalendar={calendar.toggleCalendar}
          onSelectDate={date => { void navigateAfterSave(() => calendar.goToDate(date)) }}
          onToday={() => { void navigateAfterSave(calendar.goToday) }}
          onCloseCalendar={() => calendar.setCalendarOpen(false)}
          onViewModeChange={setViewMode}
        />

        <AddTask
          onAdd={text => { tasks.addTask(text); if (firstRun) dismissIntro() }}
          prominent={!tasks.loading && !tasks.tasks.length}
          autoFocus={!showSettings && !showPlanner && !showTrackingStation}
          disabled={tasks.loading || Boolean(tasks.loadError)}
        />

        {firstRun && !showSettings && (
          <div className="first-use-note">
            <p>Capture a task to begin. AI assistance is optional.</p>
            <button onClick={event => { event.currentTarget.focus(); openSettingsForProvider(aiSettings?.provider) }}>Set up AI</button>
            <button onClick={dismissIntro} aria-label="Dismiss introduction">✕</button>
          </div>
        )}

        {tasks.saveError && (
          <div className="task-save-error" role="alert">
            <div><strong>Changes not saved · {tasks.saveError.date}</strong><p>{tasks.saveError.message}</p></div>
            <button disabled={tasks.saving} onClick={async () => {
              if (await tasks.retrySave() && tasks.dataDate !== calendar.dateStr) await tasks.load()
            }}>{tasks.saving ? 'Retrying…' : 'Retry save'}</button>
          </div>
        )}

        {aiLoading && (
          <div className="ai-loading">
            <div className="spinner" />
            <span>
              {aiLoading === 'schedule'
                ? 'Generating schedule...'
                : aiLoading === 'albums'
                  ? 'Finding albums...'
                  : 'Breaking down task...'}
            </span>
          </div>
        )}

        <DianeProvider enabled={aiSettings?.connectDiane === true} date={calendar.dateStr} kbPath={aiSettings?.kbPath || "default"}>
          <TaskList
            rolloverLoading={tasks.rolloverLoading}
            rolloverError={tasks.rolloverError}
            tasks={tasks.tasks}
            loading={tasks.loading}
            loadError={tasks.loadError}
            viewMode={viewMode}
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
            <button disabled={tasks.loading} onClick={tasks.undoLastAction}>Undo</button>
            <button onClick={tasks.dismissUndo} aria-label="Dismiss undo">✕</button>
          </div>
        )}

        <div className="action-bar">
          {isDevMode && (
            <button
              className={`dev-toggle ${showDevTools ? 'active' : ''}`}
              onClick={() => setShowDevTools(value => !value)}
            >
              Dev
            </button>
          )}
          {isCompactWindow && (
            <>
              <button className="compact-goals-entry" aria-controls="goals-panel" aria-expanded={!goals.sidebarCollapsed}
                onClick={event => { event.currentTarget.focus(); handleToggleGoalsSidebar() }}>Goals</button>
              <button className={`compact-focus-entry${starFocus.activeSession ? ' active' : ''}`}
                onClick={event => { event.currentTarget.focus(); goals.setSidebarCollapsed(true); setShowTrackingStation(true) }}
                title={starFocus.activeSession?.pausedAt ? 'Focus paused' : starFocus.activeSession ? 'Focus session in progress' : 'Open Focus Mode'}>
                Focus{starFocus.activeSnapshot && <span className="compact-focus-clock">
                  {starFocus.activeSession?.pausedAt ? 'Ⅱ ' : ''}{Math.floor(Math.ceil(starFocus.activeSnapshot.remainingMs / 1000) / 60)}:{String(Math.ceil(starFocus.activeSnapshot.remainingMs / 1000) % 60).padStart(2, '0')}
                </span>}
              </button>
            </>
          )}
          <button
            onClick={event => { event.currentTarget.focus(); setShowPlanner(true) }}
            disabled={!!aiLoading || !tasks.tasks.some(task => task.status !== 'done' && task.status !== 'stopped') || tasks.loading}
            title="Preview an AI plan for the selected date"
          >
            Plan day
          </button>
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
              ? 'Recommend albums for the current tasks'
              : 'Add a task before finding albums'}
          >
            Albums
          </button>
          <div className="spacer" />
          {!isCompactWindow && <div
            className={`provider-quick-control ${
              aiSettings && isProviderConfigured(aiSettings, aiSettings.provider)
                ? 'configured'
                : 'needs-setup'
            }`}
            title={aiSettings
              ? isProviderConfigured(aiSettings, aiSettings.provider)
                ? `AI provider: ${PROVIDER_PRESETS[aiSettings.provider].label}`
                : `Set up ${PROVIDER_PRESETS[aiSettings.provider].label}`
              : 'Loading AI provider'}
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
              aria-label="Active AI provider"
              aria-busy={providerSwitching}
            >
              {!aiSettings && <option value="">AI</option>}
              {aiSettings && !isProviderConfigured(aiSettings, aiSettings.provider) && (
                <option value="">
                  Set up {PROVIDER_PRESETS[aiSettings.provider].shortLabel}
                </option>
              )}
              {PROVIDER_ORDER.map(provider => (
                <option key={provider} value={provider}>
                  {PROVIDER_PRESETS[provider].shortLabel}
                  {aiSettings && !isProviderConfigured(aiSettings, provider) ? ' · Set up' : ''}
                </option>
              ))}
            </select>
          </div>}
          <button
            className="gear settings-update-button"
            onClick={event => { event.currentTarget.focus(); openSettingsForProvider() }}
            title={appUpdates.needsAttention ? "Settings · Update ready" : "Settings"}
            aria-label={appUpdates.needsAttention ? "Settings, update ready" : "Settings"}
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
            appUpdates={appUpdates}
            updateBlockedReason={updateBlockedReason}
            onClose={() => {
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
    </div>
  )
}
