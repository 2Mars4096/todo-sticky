import { useRef, useState, type PointerEvent } from 'react'
import type { AggregatedTask, Task, ViewMode } from '../types'
import type { ReorderPosition } from '../hooks/useTasks'
import { TaskItem } from './TaskItem'

type DraggedItem =
  | { kind: 'task'; id: string }
  | { kind: 'subtask'; id: string; parentId: string }

type DropTarget = DraggedItem & { position: ReorderPosition }

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
  onCopyTask: (text: string, subtasks: Task[]) => void
  onTextChange: (taskId: string, text: string, subtaskId?: string) => void
  onAddSubtask: (taskId: string, text: string) => void
  onReorderTask: (sourceId: string, targetId: string, position: ReorderPosition) => void
  onReorderSubtask: (taskId: string, sourceId: string, targetId: string, position: ReorderPosition) => void
  onAIBreakdown: (taskId: string) => void
  onFocusTask: (taskId: string, text: string) => void
  onGoToday: () => void
  onRetryLoad: () => void
}

export function TaskList({
  tasks, loading, loadError, viewMode, selectedTaskId, focusLocked, isCurrentDay, moveTargetLabel,
  onToggle, onDelete, onPush, onCopyTask, onTextChange,
  onAddSubtask, onReorderTask, onReorderSubtask,
  onAIBreakdown, onFocusTask, onGoToday, onRetryLoad,
}: Props) {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<{
    item: DraggedItem; pointerId: number; x: number; y: number; active: boolean
  } | null>(null)
  const targetRef = useRef<DropTarget | null>(null)

  const finishDrag = () => {
    gesture.current = null
    targetRef.current = null
    setDraggedItem(null)
    setDropTarget(null)
  }

  const startDrag = (event: PointerEvent<HTMLButtonElement>, item: DraggedItem) => {
    if (event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      item, pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false,
    }
  }

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current
    const list = listRef.current
    if (!current || current.pointerId !== event.pointerId || !list) return
    if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 4) return
    current.active = true
    setDraggedItem(current.item)
    const bounds = list.getBoundingClientRect()
    let next: DropTarget | null = null
    if (event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom) {
      if (event.clientY < bounds.top + 24) list.scrollTop -= 12
      if (event.clientY > bounds.bottom - 24) list.scrollTop += 12
      const source = current.item
      const ids = source.kind === 'task'
        ? tasks.map(task => task.id)
        : tasks.find(task => task.id === source.parentId)?.todaySubtasks.map(task => task.id) ?? []
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-reorder-id]'))
        .filter(row => ids.includes(row.dataset.reorderId!))
      // Parent drags span their whole group; step drags stay inside their parent.
      const withinScope = source.kind === 'task' || (rows.length > 0
        && event.clientY >= rows[0].getBoundingClientRect().top - 6
        && event.clientY <= rows[rows.length - 1].getBoundingClientRect().bottom + 6)
      if (withinScope) {
        let distance = Infinity
        for (const row of rows) {
          const rect = row.getBoundingClientRect()
          const center = rect.top + rect.height / 2
          const delta = Math.abs(event.clientY - center)
          if (delta >= distance) continue
          distance = delta
          next = row.dataset.reorderId === source.id ? null : {
            ...source, id: row.dataset.reorderId!, position: event.clientY < center ? 'before' : 'after',
          }
        }
      }
    }
    targetRef.current = next
    setDropTarget(next)
  }

  const drop = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    moveDrag(event)
    const target = targetRef.current
    if (current.active && target) {
      if (current.item.kind === 'task') {
        onReorderTask(current.item.id, target.id, target.position)
      } else {
        onReorderSubtask(current.item.parentId, current.item.id, target.id, target.position)
      }
    }
    finishDrag()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const dragStateFor = (item: DraggedItem) => {
    if (draggedItem?.kind === item.kind && draggedItem.id === item.id) return 'dragging' as const
    if (dropTarget?.kind === item.kind && dropTarget.id === item.id) return `drop-${dropTarget.position}` as const
    return undefined
  }

  const moveTaskByKeyboard = (taskId: string, direction: -1 | 1) => {
    const index = tasks.findIndex(task => task.id === taskId)
    const target = tasks[index + direction]
    if (index < 0 || !target) return
    onReorderTask(taskId, target.id, direction < 0 ? 'before' : 'after')
  }

  const moveSubtaskByKeyboard = (taskId: string, subtaskId: string, direction: -1 | 1) => {
    const parent = tasks.find(task => task.id === taskId)
    const index = parent?.todaySubtasks.findIndex(subtask => subtask.id === subtaskId) ?? -1
    const target = parent?.todaySubtasks[index + direction]
    if (index < 0 || !target) return
    onReorderSubtask(taskId, subtaskId, target.id, direction < 0 ? 'before' : 'after')
  }

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
    <div className="task-list" ref={listRef}>
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
          onCopyTask={onCopyTask}
          onTextChange={(t) => onTextChange(task.id, t)}
          sortable={{
            state: dragStateFor({ kind: 'task', id: task.id }),
            label: `Reorder ${task.text}`,
            onPointerDown: event => startDrag(event, { kind: 'task', id: task.id }),
            onPointerMove: moveDrag,
            onPointerUp: drop,
            onCancel: finishDrag,
            onMove: direction => moveTaskByKeyboard(task.id, direction),
          }}
          getSubtaskSortable={(subtaskId, subtaskText) => ({
            state: dragStateFor({ kind: 'subtask', id: subtaskId, parentId: task.id }),
            label: `Reorder ${subtaskText} within ${task.text}`,
            onPointerDown: event => startDrag(event, { kind: 'subtask', id: subtaskId, parentId: task.id }),
            onPointerMove: moveDrag,
            onPointerUp: drop,
            onCancel: finishDrag,
            onMove: direction => moveSubtaskByKeyboard(task.id, subtaskId, direction),
          })}
          onFocusSelect={() => onFocusTask(task.id, task.text)}
          onFocusSubtask={(subtaskId, subtaskText) => onFocusTask(subtaskId, subtaskText)}
          selectedFocusId={selectedTaskId}
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
