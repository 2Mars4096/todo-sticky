import { Fragment, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { AggregatedTask, Task, FinishPromise } from '../types'
import type { ReorderPosition } from '../hooks/useTasks'
import { TaskItem } from './TaskItem'
import { AddTask } from './AddTask'

type DraggedItem =
  | { kind: 'task'; id: string }
  | { kind: 'subtask'; id: string; parentId: string }

type DropTarget = (DraggedItem & { position: ReorderPosition }) | { kind: 'today'; id?: string; position: ReorderPosition }

interface Props {
  tasks: AggregatedTask[]
  loading?: boolean
  rolloverError?: boolean
  rolloverLoading?: boolean
  loadError?: 'cloud-only' | 'failed' | null
  selectedTaskId?: string | null
  focusLocked?: boolean
  isCurrentDay: boolean
  moveTargetLabel: string
  onUpdateFinish?: (taskId: string, patch: Partial<FinishPromise>) => void
  onReview?: (taskId: string, decision: 'complete' | 'revise' | 'stop') => void
  onToggle: (taskId: string, subtaskId?: string) => void
  onDelete: (taskId: string, subtaskId?: string) => void
  onPush: (taskId: string, subtaskId?: string) => void
  onCopyTask: (text: string, subtasks: Task[], finish?: FinishPromise) => void
  onTextChange: (taskId: string, text: string, subtaskId?: string) => void
  onAddSubtask: (taskId: string, text: string) => void
  onAddTask: (text: string) => void
  onMoveToToday?: (taskId: string, targetId?: string, position?: ReorderPosition) => void
  onReorderTask: (sourceId: string, targetId: string, position: ReorderPosition) => void
  onReorderSubtask: (taskId: string, sourceId: string, targetId: string, position: ReorderPosition) => void
  onAIBreakdown: (taskId: string) => void
  onFocusTask: (taskId: string, text: string) => void
  onGoToday: () => void
  onRetryLoad: () => void
}

export function TaskList({
  tasks, loading, loadError, rolloverError, rolloverLoading, selectedTaskId, focusLocked, isCurrentDay, moveTargetLabel,
  onToggle, onDelete, onPush, onCopyTask, onTextChange, onUpdateFinish, onReview,
  onAddSubtask, onAddTask, onMoveToToday, onReorderTask, onReorderSubtask,
  onAIBreakdown, onFocusTask, onGoToday, onRetryLoad,
}: Props) {
  const [carriedOpen, setCarriedOpen] = useState(() => {
    try { return window.localStorage.getItem('todo-sticky-carried-open-v1') === 'true' }
    catch { return false }
  })
  const [reorderNotice, setReorderNotice] = useState('')
  useEffect(() => {
    try { window.localStorage.setItem('todo-sticky-carried-open-v1', String(carriedOpen)) }
    catch { /* Disclosure remains usable without storage. */ }
  }, [carriedOpen])
  const [carriedLimit, setCarriedLimit] = useState(40)
  const orderedTasks = [...tasks.filter(task => !task.sourceDate), ...tasks.filter(task => task.sourceDate).slice(0, carriedLimit)]
  const firstCarriedId = orderedTasks.find(task => task.sourceDate)?.id
  const carriedCount = tasks.filter(task => task.sourceDate).length
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const earlierRef = useRef<HTMLButtonElement>(null)
  const draggingEarlier = draggedItem?.kind === 'task' && Boolean(tasks.find(task => task.id === draggedItem.id)?.sourceDate)
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
      const promoting = source.kind === 'task' && isCurrentDay && onMoveToToday
        && tasks.find(task => task.id === source.id)?.sourceDate
        && event.clientY < (earlierRef.current?.getBoundingClientRect().top ?? -Infinity)
      const ids = promoting ? tasks.filter(task => !task.sourceDate).map(task => task.id) : source.kind === 'task'
        ? tasks.filter(task => task.sourceDate === tasks.find(item => item.id === source.id)?.sourceDate).map(task => task.id)
        : tasks.find(task => task.id === source.parentId)?.todaySubtasks.map(task => task.id) ?? []
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-reorder-id]'))
        .filter(row => ids.includes(row.dataset.reorderId!))
      // Parent drags span their whole group; step drags stay inside their parent.
      const withinScope = source.kind === 'task' || (rows.length > 0
        && event.clientY >= rows[0].getBoundingClientRect().top - 6
        && event.clientY <= rows[rows.length - 1].getBoundingClientRect().bottom + 6)
      if (promoting && rows.length === 0) next = { kind: 'today', position: 'after' }
      if (withinScope) {
        let distance = Infinity
        for (const row of rows) {
          const rect = row.getBoundingClientRect()
          const center = rect.top + rect.height / 2
          const delta = Math.abs(event.clientY - center)
          if (delta >= distance) continue
          distance = delta
          next = row.dataset.reorderId === source.id ? null : {
            ...(promoting ? { kind: 'today' as const } : source), id: row.dataset.reorderId!, position: event.clientY < center ? 'before' : 'after',
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
      if (current.item.kind === 'task' && target.kind === 'today') {
        onMoveToToday?.(current.item.id, target.id, target.position)
        setReorderNotice('Task moved to Today.')
      } else if (current.item.kind === 'task' && target.kind !== 'today') {
        onReorderTask(current.item.id, target.id, target.position)
      } else if (current.item.kind === 'subtask' && target.kind === 'subtask') {
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
    if ((dropTarget?.kind === item.kind || (dropTarget?.kind === 'today' && item.kind === 'task')) && dropTarget?.id === item.id) return `drop-${dropTarget.position}` as const
    return undefined
  }

  const moveTaskByKeyboard = (taskId: string, direction: -1 | 1) => {
    const siblings = tasks.filter(task => task.sourceDate === tasks.find(item => item.id === taskId)?.sourceDate)
    const index = siblings.findIndex(task => task.id === taskId)
    const target = siblings[index + direction]
    if (index === 0 && direction < 0 && isCurrentDay && onMoveToToday && siblings[0]?.sourceDate) {
      onMoveToToday(taskId)
      setReorderNotice('Task moved to Today.')
      return
    }
    if (index < 0 || !target) return
    onReorderTask(taskId, target.id, direction < 0 ? 'before' : 'after')
    setReorderNotice(`Task moved ${direction < 0 ? 'before' : 'after'} ${target.text}.`)
  }

  const moveSubtaskByKeyboard = (taskId: string, subtaskId: string, direction: -1 | 1) => {
    const parent = tasks.find(task => task.id === taskId)
    const index = parent?.todaySubtasks.findIndex(subtask => subtask.id === subtaskId) ?? -1
    const target = parent?.todaySubtasks[index + direction]
    if (index < 0 || !target) return
    onReorderSubtask(taskId, subtaskId, target.id, direction < 0 ? 'before' : 'after')
    setReorderNotice(`Step moved ${direction < 0 ? 'before' : 'after'} ${target.text}.`)
  }

  if (loading) {
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

  if (loadError) {
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

  if (tasks.length === 0 && !rolloverError && !rolloverLoading) {
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
      <span className="task-reorder-status" role="status" aria-live="polite">{reorderNotice}</span>
      {rolloverLoading && <div className="rollover-error" role="status">Loading carried tasks…</div>}
      {rolloverError && <div className="rollover-error" role="alert">
        Some earlier tasks could not be loaded. <button onClick={onRetryLoad}>Retry</button>
      </div>}
      {isCurrentDay && onMoveToToday && carriedCount > 0 && !tasks.some(task => !task.sourceDate) && (
        <div className={`today-drop-zone${dropTarget?.kind === 'today' ? ' is-target' : ''}`}>
          {draggingEarlier ? 'Drop here for Today' : 'Today is clear'}
        </div>
      )}
      {orderedTasks.map(task => (
        <Fragment key={task.id}>
          {task.id === firstCarriedId && <button
            ref={earlierRef} type="button" className="carried-toggle" aria-expanded={carriedOpen} title={`${carriedCount} unfinished tasks from earlier dates`}
            onClick={() => setCarriedOpen(open => !open)}
          >
            <span aria-hidden="true">{carriedOpen ? '▾' : '▸'}</span>
            <span>Earlier tasks</span>{!carriedOpen && <span className="carried-attention" aria-hidden="true" />}<span className="carried-rule" /><span>{carriedCount}</span>
          </button>}
          {(!task.sourceDate || carriedOpen) && <TaskItem
            id={task.id}
            sourceDate={task.sourceDate}
            text={task.text}
            status={task.status}
            finish={task.finish}
            onUpdateFinish={onUpdateFinish ? patch => onUpdateFinish(task.id, patch) : undefined}
            onReview={onReview ? decision => onReview(task.id, decision) : undefined}
            isFocusSelected={selectedTaskId === task.id}
            isFocusLocked={focusLocked}
            moveTargetLabel={task.sourceDate && isCurrentDay && onMoveToToday ? 'today' : moveTargetLabel}
            subtaskMoveTargetLabel={moveTargetLabel}

            todaySubtasks={task.todaySubtasks}
            otherSubtasks={task.otherSubtasks}
            onToggle={() => onToggle(task.id)}
            onDelete={() => onDelete(task.id)}
            onPush={() => task.sourceDate && isCurrentDay && onMoveToToday ? onMoveToToday(task.id) : onPush(task.id)}
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
          />}
        </Fragment>
      ))}
      {carriedOpen && carriedCount > carriedLimit && <button
        className="carried-toggle" type="button" onClick={() => setCarriedLimit(limit => limit + 40)}
      >Show more earlier tasks ({carriedCount - carriedLimit} remaining)</button>}
      <AddTask inline onAdd={onAddTask} disabled={loading || Boolean(loadError)} />
    </div>
  )
}
