import type { AggregatedTask, ViewMode } from '../types'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: AggregatedTask[]
  viewMode: ViewMode
  selectedTaskId?: string | null
  focusLocked?: boolean
  onToggle: (taskId: string, subtaskId?: string) => void
  onDelete: (taskId: string, subtaskId?: string) => void
  onPush: (taskId: string, subtaskId?: string) => void
  onTextChange: (taskId: string, text: string, subtaskId?: string) => void
  onAddSubtask: (taskId: string, text: string) => void
  onAIBreakdown: (taskId: string) => void
  onFocusTask: (taskId: string, text: string) => void
}

export function TaskList({
  tasks, viewMode, selectedTaskId, focusLocked,
  onToggle, onDelete, onPush, onTextChange,
  onAddSubtask, onAIBreakdown, onFocusTask,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="task-list empty">
        <div className="task-empty-state">
          <span className="task-empty-mark" aria-hidden="true">✓</span>
          <strong>Start with one clear task</strong>
          <span>Add it above, then break it down, plan it, or start a focus session.</span>
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
