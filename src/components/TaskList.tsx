import type { AggregatedTask, ViewMode } from '../types'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: AggregatedTask[]
  viewMode: ViewMode
  onToggle: (taskId: string, subtaskId?: string) => void
  onDelete: (taskId: string, subtaskId?: string) => void
  onPush: (taskId: string, subtaskId?: string) => void
  onTextChange: (taskId: string, text: string, subtaskId?: string) => void
  onAddSubtask: (taskId: string, text: string) => void
  onAIBreakdown: (taskId: string) => void
}

export function TaskList({
  tasks, viewMode,
  onToggle, onDelete, onPush, onTextChange,
  onAddSubtask, onAIBreakdown,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="task-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No tasks for this day</span>
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
          viewMode={viewMode}
          todaySubtasks={task.todaySubtasks}
          otherSubtasks={task.otherSubtasks}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
          onPush={() => onPush(task.id)}
          onTextChange={(t) => onTextChange(task.id, t)}
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
