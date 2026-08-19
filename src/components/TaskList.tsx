import type { AggregatedTask, Task, ViewMode } from '../types'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: AggregatedTask[]
  loading?: boolean
  loadError?: 'cloud-only' | 'failed' | null
  viewMode: ViewMode
  selectedTaskId?: string | null
  focusLocked?: boolean
  isCurrentDay: boolean
  moveTargetLabel: string
  onToggle: (taskId: string, subtaskId?: string) => void
  onDelete: (taskId: string, subtaskId?: string) => void
  onPush: (taskId: string, subtaskId?: string) => void
  onExportPrompt: (text: string, subtasks: Task[]) => void
  onTextChange: (taskId: string, text: string, subtaskId?: string) => void
  onAddSubtask: (taskId: string, text: string) => void
  onAIBreakdown: (taskId: string) => void
  onFocusTask: (taskId: string, text: string) => void
  onGoToday: () => void
  onRetryLoad: () => void
}

export function TaskList({
  tasks, loading, loadError, viewMode, selectedTaskId, focusLocked, isCurrentDay, moveTargetLabel,
  onToggle, onDelete, onPush, onExportPrompt, onTextChange,
  onAddSubtask, onAIBreakdown, onFocusTask, onGoToday, onRetryLoad,
}: Props) {
  if (loading && tasks.length === 0) {
    return (
      <div className="task-list empty" aria-live="polite">
        <div className="task-empty-state">
          <span className="task-loading-mark" aria-hidden="true" />
          <strong>Loading your tasks…</strong>
          <span>Waiting for the task archive to become available.</span>
        </div>
      </div>
    )
  }

  if (loadError && tasks.length === 0) {
    const cloudOnly = loadError === 'cloud-only'
    return (
      <div className="task-list empty" role="alert">
        <div className="task-empty-state task-load-error">
          <span className="task-empty-mark" aria-hidden="true">↓</span>
          <strong>{cloudOnly ? 'Tasks are waiting in Dropbox' : 'Tasks could not be loaded'}</strong>
          <span>
            {cloudOnly
              ? 'Make index.md available offline in Finder, then try again.'
              : 'Check the task folder and try again.'}
          </span>
          <button className="task-empty-today" onClick={onRetryLoad}>Retry</button>
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list empty">
        <div className="task-empty-state">
          <span className="task-empty-mark" aria-hidden="true">✓</span>
          <strong>{isCurrentDay ? 'Start with one clear task' : 'No tasks on this day'}</strong>
          <span>
            {isCurrentDay
              ? 'Add it above, then break it down, plan it, or start a focus session.'
              : 'Tasks stay on their saved dates. Use the calendar for another day or return to today.'}
          </span>
          {!isCurrentDay && (
            <button className="task-empty-today" onClick={onGoToday}>
              Go to today
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          id={task.id}
          text={task.text}
          status={task.status}
          isFocusSelected={selectedTaskId === task.id}
          isFocusLocked={focusLocked}
          moveTargetLabel={moveTargetLabel}
          viewMode={viewMode}
          todaySubtasks={task.todaySubtasks}
          otherSubtasks={task.otherSubtasks}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
          onPush={() => onPush(task.id)}
          onExportPrompt={onExportPrompt}
          onTextChange={(t) => onTextChange(task.id, t)}
          onFocusSelect={() => onFocusTask(task.id, task.text)}
          onAddSubtask={(t) => onAddSubtask(task.id, t)}
          onAIBreakdown={() => onAIBreakdown(task.id)}
          onToggleSubtask={(sid) => onToggle(task.id, sid)}
          onDeleteSubtask={(sid) => onDelete(task.id, sid)}
          onPushSubtask={(sid) => onPush(task.id, sid)}
          onSubtaskTextChange={(sid, t) => onTextChange(task.id, t, sid)}
        />
      ))}
    </div>
  )
}
