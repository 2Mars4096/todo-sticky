import { useState, useCallback } from 'react'
import { DateHeader } from './components/DateHeader'
import { TaskList } from './components/TaskList'
import { AddTask } from './components/AddTask'
import { SettingsPanel } from './components/SettingsPanel'
import { useCalendar } from './hooks/useCalendar'
import { useTasks } from './hooks/useTasks'
import type { ViewMode } from './types'

export default function App() {
  const calendar = useCalendar()
  const tasks = useTasks(calendar.dateStr)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [schedulePlan, setSchedulePlan] = useState<string | null>(null)

  const handleAIBreakdown = useCallback(async (taskId: string) => {
    const task = tasks.tasks.find(t => t.id === taskId)
    if (!task || !window.electronAPI) return

    setAiLoading(taskId)
    try {
      const existing = task.todaySubtasks.map(s => s.text)
      const result = await window.electronAPI.llmBreakdown({
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
    if (!tasks.tasks.length || !window.electronAPI) return
    setAiLoading('schedule')
    try {
      const result = await window.electronAPI.llmSchedule({ tasks: tasks.tasks, machines: [] })
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

  return (
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
        onToggle={tasks.toggleStatus}
        onDelete={tasks.deleteTask}
        onPush={tasks.pushToTomorrow}
        onTextChange={tasks.updateTaskText}
        onAddSubtask={tasks.addSubtask}
        onAIBreakdown={handleAIBreakdown}
      />

      <AddTask onAdd={tasks.addTask} />

      <div className="action-bar">
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
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
