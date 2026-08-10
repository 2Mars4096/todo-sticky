import type { AggregatedTask, ViewMode } from '../types'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: AggregatedTask[]
  viewMode: ViewMode
  selectedTaskId?: string | null
  focusLocked?: boolean
  isCurrentDay: boolean
  moveTargetLabel: string
  onToggle: (taskId: string, subtaskId?: string) => void
  onDelete: (taskId: string, subtaskId?: string) => void
  onPush: (taskId: string, subtaskId?: string) => void
  onTextChange: (taskId: string, text: string, subtaskId?: string) => void
  onAddSubtask: (taskId: string, text: string) => void
  onAIBreakdown: (taskId: string) => void
  onFocusTask: (taskId: string, text: string) => void
  onGoToday: () => void
}

export function TaskList({
  tasks, viewMode, selectedTaskId, focusLocked, isCurrentDay, moveTargetLabel,
  onToggle, onDelete, onPush, onTextChange,
  onAddSubtask, onAIBreakdown, onFocusTask, onGoToday,
}: Props) {
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
