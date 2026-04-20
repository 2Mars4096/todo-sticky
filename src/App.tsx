import { useState, useCallback, useEffect, useRef } from 'react'
import { DateHeader } from './components/DateHeader'
import { TaskList } from './components/TaskList'
import { AddTask } from './components/AddTask'
import { DevToolsPanel } from './components/DevToolsPanel'
import { GoalsSidebar } from './components/GoalsSidebar'
import { MissionControlSidebar } from './components/MissionControlSidebar'
import { TrackingStationOverlay } from './components/TrackingStationOverlay'
import { SettingsPanel } from './components/SettingsPanel'
import { useCalendar } from './hooks/useCalendar'
import { useGoals } from './hooks/useGoals'
import { STAR_FOCUS_DEBUG_TIME_SCALE_OPTIONS, useStarFocus } from './hooks/useStarFocus'
import { useTasks } from './hooks/useTasks'
import { api } from './api'
import type { ViewMode } from './types'

export default function App() {
  const calendar = useCalendar()
  const tasks = useTasks(calendar.dateStr)
  const goals = useGoals()
  const starFocus = useStarFocus(tasks.tasks)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showTrackingStation, setShowTrackingStation] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [firstRun, setFirstRun] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [schedulePlan, setSchedulePlan] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState(() => (
    typeof window === 'undefined' ? 1024 : window.innerWidth
  ))
  const restoredOverlaySessionRef = useRef<string | null>(null)
  const isCompactWindow = windowWidth <= 520
  const isDevMode = import.meta.env.DEV

  useEffect(() => {
    api.checkFirstRun().then(isFirst => {
      if (isFirst) {
        setFirstRun(true)
        setShowSettings(true)
      }
    }).catch(() => {})
  }, [])

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
    } finally {
      setAiLoading(null)
    }
  }, [tasks])

  const handleSchedule = useCallback(async () => {
    if (!tasks.tasks.length) return
    setAiLoading('schedule')
    try {
      const result = await api.llmSchedule({ tasks: tasks.tasks, machines: [] })
      if (result.schedule?.length) {
        tasks.applySchedule(result.schedule)
      }
      if (result.plan) {
        setSchedulePlan(result.plan)
        setTimeout(() => setSchedulePlan(null), 6000)
      }
    } catch (e) {
      console.error('Scheduling failed:', e)
    } finally {
      setAiLoading(null)
    }
  }, [tasks])

  const handleFocusTask = useCallback((taskId: string, taskText: string) => {
    starFocus.selectTask(taskId, taskText)
    if (starFocus.sidebarCollapsed) {
      setShowTrackingStation(true)
    }
  }, [starFocus.selectTask, starFocus.sidebarCollapsed])

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
    <div className="app-shell">
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

      <div className="sticky-container">
        <DateHeader
          displayDate={calendar.displayDate}
          selectedDate={calendar.selectedDate}
          calendarOpen={calendar.calendarOpen}
          viewMode={viewMode}
          onPrev={calendar.goPrev}
          onNext={calendar.goNext}
          onToggleCalendar={calendar.toggleCalendar}
          onSelectDate={calendar.goToDate}
          onCloseCalendar={() => calendar.setCalendarOpen(false)}
          onViewModeChange={setViewMode}
        />

        {aiLoading && (
          <div className="ai-loading">
            <div className="spinner" />
            <span>{aiLoading === 'schedule' ? 'Generating schedule...' : 'Breaking down task...'}</span>
          </div>
        )}

        <TaskList
          tasks={tasks.tasks}
          viewMode={viewMode}
          selectedTaskId={starFocus.selectedTaskId}
          focusLocked={Boolean(starFocus.activeSession)}
          onToggle={tasks.toggleStatus}
          onDelete={tasks.deleteTask}
          onPush={tasks.pushToTomorrow}
          onTextChange={tasks.updateTaskText}
          onAddSubtask={tasks.addSubtask}
          onAIBreakdown={handleAIBreakdown}
          onFocusTask={handleFocusTask}
        />

        <AddTask onAdd={tasks.addTask} />

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
          <button onClick={handleSchedule} disabled={!!aiLoading}>
            Schedule
          </button>
          <div className="spacer" />
          <button className="gear" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
        </div>

        {schedulePlan && (
          <div className="schedule-toast" onClick={() => setSchedulePlan(null)}>
            <strong>Schedule applied</strong>
            <p>{schedulePlan}</p>
          </div>
        )}
        {showSettings && (
          <SettingsPanel
            onClose={() => { setShowSettings(false); setFirstRun(false) }}
            firstRun={firstRun}
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
