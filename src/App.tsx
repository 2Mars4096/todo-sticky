import { useState, useCallback, useEffect, useRef } from 'react'
import { DateHeader } from './components/DateHeader'
import { TaskList } from './components/TaskList'
import { AddTask } from './components/AddTask'
import { DevToolsPanel } from './components/DevToolsPanel'
import { GoalsSidebar } from './components/GoalsSidebar'
import { MissionControlSidebar } from './components/MissionControlSidebar'
import { TrackingStationOverlay } from './components/TrackingStationOverlay'
import { SettingsPanel } from './components/SettingsPanel'
import { WindowResizeHandles } from './components/WindowResizeHandles'
import { useCalendar } from './hooks/useCalendar'
import { useGoals } from './hooks/useGoals'
import { STAR_FOCUS_DEBUG_TIME_SCALE_OPTIONS, useStarFocus } from './hooks/useStarFocus'
import { useTasks } from './hooks/useTasks'
import { api } from './api'
import { copyText, pasteText } from './clipboard'
import { formatAgentPrompt, formatTaskChecklist, parseTaskChecklist } from './taskTransfer'
import {
  isProviderConfigured,
  PROVIDER_ORDER,
  PROVIDER_PRESETS,
  settingsForProvider,
} from './llmProviders'
import type { AppSettings, Provider, Task, ViewMode } from './types'

const READY_LAYOUT_MIGRATION_KEY = 'todo-sticky-ready-layout-v1'
const COMPACT_LAYOUT_MAX_WIDTH = 760

interface AppNotice {
  kind: 'success' | 'error'
  title: string
  message: string
}

export default function App() {
  const calendar = useCalendar()
  const tasks = useTasks(calendar.dateStr)
  const goals = useGoals()
  const starFocus = useStarFocus(tasks.tasks)
  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [showSettings, setShowSettings] = useState(false)
  const [settingsProvider, setSettingsProvider] = useState<Provider | undefined>()
  const [showTrackingStation, setShowTrackingStation] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [firstRun, setFirstRun] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiSettings, setAiSettings] = useState<AppSettings | null>(null)
  const [providerSwitching, setProviderSwitching] = useState(false)
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null)
  const [windowWidth, setWindowWidth] = useState(() => (
    typeof window === 'undefined' ? 1024 : window.innerWidth
  ))
  const restoredOverlaySessionRef = useRef<string | null>(null)
  const isCompactWindow = windowWidth <= COMPACT_LAYOUT_MAX_WIDTH
  const isDevMode = import.meta.env.DEV
  const albumTaskContext = useMemo(() => tasks.tasks.map(task => ({
    text: task.text,
    status: task.status,
    steps: task.todaySubtasks.map(step => ({ text: step.text, status: step.status })),
  })), [tasks.tasks])
  const albumTaskKey = useMemo(() => JSON.stringify(albumTaskContext), [albumTaskContext])

  const presentNotice = useCallback((notice: AppNotice) => {
    setAppNotice(notice)
    window.setTimeout(() => setAppNotice(null), 6000)
  }, [])

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
        message: `Using ${nextSettings.model}.`,
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
        setFirstRun(true)
        setShowSettings(true)
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
    if (!showTrackingStation) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTrackingStation(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showTrackingStation])

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
    const task = tasks.tasks.find(t => t.id === taskId)
    if (!task) return

    setAiLoading(taskId)
    try {
      const existing = task.todaySubtasks.map(s => s.text)
      const result = await api.llmBreakdown({
        taskText: task.text,
        existingSubtasks: existing,
      })
      if (result.subtasks?.length) {
        tasks.addAISubtasks(taskId, result.subtasks)
      }
    } catch (e) {
      console.error('AI breakdown failed:', e)
      presentNotice({
        kind: 'error',
        title: 'Could not break down task',
        message: 'Check the AI provider in Settings, then try again.',
      })
    } finally {
      setAiLoading(null)
    }
  }, [tasks, presentNotice])

  const handleSchedule = useCallback(async () => {
    if (!tasks.tasks.length) return
    setAiLoading('schedule')
    try {
      const result = await api.llmSchedule({ tasks: tasks.tasks, machines: [] })
      if (result.schedule?.length) {
        tasks.applySchedule(result.schedule)
      }
      if (result.plan) {
        presentNotice({ kind: 'success', title: 'Plan applied', message: result.plan })
      }
    } catch (e) {
      console.error('Scheduling failed:', e)
      presentNotice({
        kind: 'error',
        title: 'Could not plan the day',
        message: 'Check the AI provider in Settings, then try again.',
      })
    } finally {
      setAiLoading(null)
    }
  }, [tasks, presentNotice])

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
        message: target.kind === 'today'
          ? 'The task has caught up to today.'
          : target.kind === 'tomorrow'
            ? 'The task is ready tomorrow.'
            : 'The task moved one day forward.',
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

  const handleCopyTask = useCallback(async (text: string, subtasks: Task[]) => {
    try {
      await copyText(formatTaskChecklist({
        text,
        subtasks: subtasks.map(subtask => subtask.text),
      }))
      presentNotice({
        kind: 'success',
        title: 'Task copied',
        message: subtasks.length
          ? `Copied with ${subtasks.length} ${subtasks.length === 1 ? 'step' : 'steps'}.`
          : 'Copied as a portable checklist item.',
      })
    } catch (error) {
      console.error('Copy task failed:', error)
      presentNotice({
        kind: 'error',
        title: 'Could not copy task',
        message: 'Clipboard access was unavailable. Try again with the app active.',
      })
    }
  }, [presentNotice])

  const handleExportPrompt = useCallback(async (text: string, subtasks: Task[]) => {
    try {
      await copyText(formatAgentPrompt({
        text,
        subtasks: subtasks.map(subtask => subtask.text),
      }))
      presentNotice({
        kind: 'success',
        title: 'Agent prompt copied',
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

  const handlePasteTask = useCallback(async () => {
    try {
      const parsed = parseTaskChecklist(await pasteText())
      if (!parsed) {
        presentNotice({
          kind: 'error',
          title: 'Nothing to paste',
          message: 'Copy a task or plain-text checklist, then try again.',
        })
        return
      }

      tasks.addTaskBundle(parsed.text, parsed.subtasks)
      presentNotice({
        kind: 'success',
        title: 'Task pasted',
        message: parsed.subtasks.length
          ? `Added with ${parsed.subtasks.length} ${parsed.subtasks.length === 1 ? 'step' : 'steps'}.`
          : 'Added as a new unchecked task.',
      })
    } catch (error) {
      console.error('Paste task failed:', error)
      presentNotice({
        kind: 'error',
        title: 'Could not paste task',
        message: 'Clipboard access was unavailable. Try again with the app active.',
      })
    }
  }, [tasks.addTaskBundle, presentNotice])

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
          onPrev={calendar.goPrev}
          onNext={calendar.goNext}
          onToggleCalendar={calendar.toggleCalendar}
          onSelectDate={calendar.goToDate}
          onToday={calendar.goToday}
          onCloseCalendar={() => calendar.setCalendarOpen(false)}
          onViewModeChange={setViewMode}
        />

        <AddTask
          onAdd={tasks.addTask}
          onPaste={handlePasteTask}
          prominent={!tasks.loading && !tasks.tasks.length}
          autoFocus={!showSettings}
          disabled={tasks.loading || Boolean(tasks.loadError)}
        />

        {aiLoading && (
          <div className="ai-loading">
            <div className="spinner" />
            <span>{aiLoading === 'schedule' ? 'Generating schedule...' : 'Breaking down task...'}</span>
          </div>
        )}

        <TaskList
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
          onCopy={handleCopyTask}
          onExportPrompt={handleExportPrompt}
          onTextChange={tasks.updateTaskText}
          onAddSubtask={tasks.addSubtask}
          onAIBreakdown={handleAIBreakdown}
          onFocusTask={handleFocusTask}
          onGoToday={calendar.goToday}
          onRetryLoad={tasks.load}
        />

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

        <div className="action-bar">
          {isDevMode && (
            <button
              className={`dev-toggle ${showDevTools ? 'active' : ''}`}
              onClick={() => setShowDevTools(value => !value)}
            >
              Dev
            </button>
          )}
          <button
            onClick={handleSchedule}
            disabled={!!aiLoading || !tasks.tasks.length}
            title={tasks.tasks.length ? 'Build a schedule with AI' : 'Add a task before planning the day'}
          >
            Plan day
          </button>
          <div className="spacer" />
          <div
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
          </div>
          <button
            className="gear"
            onClick={() => openSettingsForProvider(aiSettings?.provider)}
            title="Settings"
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>

        {appNotice && (
          <div
            className={`schedule-toast ${appNotice.kind}`}
            onClick={() => setAppNotice(null)}
            role="status"
          >
            <strong>{appNotice.title}</strong>
            <p>{appNotice.message}</p>
          </div>
        )}
        {showSettings && (
          <SettingsPanel
            onClose={() => {
              setShowSettings(false)
              setFirstRun(false)
              setSettingsProvider(undefined)
            }}
            onSaved={setAiSettings}
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
