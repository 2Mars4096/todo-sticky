import { useState, useRef, useEffect, type DragEvent, type KeyboardEvent } from 'react'
import { format } from 'date-fns'
import type { Task, DatedTask, ViewMode } from '../types'

function AddStepIcon() {
  return (
    <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function BreakdownIcon() {
  return (
    <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="13" cy="4" r="1.5" />
      <circle cx="13" cy="12" r="1.5" />
      <path d="M4.5 8h3M7.5 4v8M7.5 4h4M7.5 12h4" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 11H2.5A1.5 1.5 0 0 1 1 9.5v-7A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5V3" />
    </svg>
  )
}

function FocusIcon() {
  return (
    <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.5" />
      <circle cx="8" cy="8" r="1" className="task-action-icon-fill" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10M6 2h4l.75 2.5M4.5 4.5l.6 9h5.8l.6-9M6.5 7v4M9.5 7v4" />
    </svg>
  )
}

function PushIcon() {
  return (
    <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  )
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 10 14" aria-hidden="true">
      <circle cx="3" cy="3" r="1" />
      <circle cx="7" cy="3" r="1" />
      <circle cx="3" cy="7" r="1" />
      <circle cx="7" cy="7" r="1" />
      <circle cx="3" cy="11" r="1" />
      <circle cx="7" cy="11" r="1" />
    </svg>
  )
}

export interface SortableTaskProps {
  state?: 'dragging' | 'drop-before' | 'drop-after'
  label: string
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onMove: (direction: -1 | 1) => void
}

interface Props {
  id: string
  text: string
  status: Task['status']
  isSubtask?: boolean
  isOtherDate?: boolean
  isFocusSelected?: boolean
  isFocusLocked?: boolean
  sourceDate?: string
  moveTargetLabel: string
  viewMode: ViewMode
  onToggle: () => void
  onDelete: () => void
  onPush: () => void
  onCopyTask?: (text: string, subtasks: Task[]) => void
  onTextChange: (text: string) => void
  onFocusSelect?: () => void
  onFocusSubtask?: (subtaskId: string, subtaskText: string) => void
  onAddSubtask?: (text: string) => void
  onAIBreakdown?: () => void
  todaySubtasks?: Task[]
  otherSubtasks?: DatedTask[]
  onToggleSubtask?: (subtaskId: string) => void
  onDeleteSubtask?: (subtaskId: string) => void
  onPushSubtask?: (subtaskId: string) => void
  onSubtaskTextChange?: (subtaskId: string, text: string) => void
  sortable?: SortableTaskProps
  getSubtaskSortable?: (subtaskId: string, subtaskText: string) => SortableTaskProps
  parentText?: string
  selectedFocusId?: string | null
}

export function TaskItem({
  id, text, status, isSubtask, isOtherDate, sourceDate, moveTargetLabel,
  isFocusSelected, isFocusLocked,
  viewMode, onToggle, onDelete, onPush, onTextChange,
  onCopyTask,
  onFocusSelect, onFocusSubtask,
  onAddSubtask, onAIBreakdown,
  todaySubtasks, otherSubtasks,
  onToggleSubtask, onDeleteSubtask, onPushSubtask, onSubtaskTextChange,
  sortable, getSubtaskSortable,
  parentText, selectedFocusId,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const [subInput, setSubInput] = useState('')
  const [showSubInput, setShowSubInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const commitEdit = () => {
    setEditing(false)
    const trimmed = editText.trim()
    if (trimmed && trimmed !== text) onTextChange(trimmed)
    else setEditText(text)
  }

  const handleSubAdd = () => {
    const trimmed = subInput.trim()
    if (trimmed && onAddSubtask) {
      onAddSubtask(trimmed)
      setSubInput('')
    }
  }

  const beginEditing = () => {
    if (isOtherDate) return
    setEditing(true)
    setEditText(text)
  }

  const handleTaskTextKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    beginEditing()
  }

  const dateLabel = sourceDate
    ? format(new Date(sourceDate + 'T00:00:00'), 'MMMd')
    : undefined

  const cls = [
    'task-item',
    isSubtask ? 'subtask' : 'main-task',
    isOtherDate ? 'other-date' : '',
    isFocusSelected ? 'selected-for-focus' : '',
    sortable?.state ?? '',
  ].filter(Boolean).join(' ')

  const handleReorderKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    sortable?.onMove(event.key === 'ArrowUp' ? -1 : 1)
  }

  return (
    <>
      <div
        className={cls}
        onDragOver={sortable?.onDragOver}
        onDrop={sortable?.onDrop}
      >
        {sortable && (
          <button
            type="button"
            className="task-drag-handle"
            draggable
            onDragStart={sortable.onDragStart}
            onDragEnd={sortable.onDragEnd}
            onKeyDown={handleReorderKeyDown}
            title="Drag to reorder. Use Arrow Up or Arrow Down from this handle."
            aria-label={sortable.label}
          >
            <DragHandleIcon />
          </button>
        )}
        <button
          className={`task-checkbox ${status === 'done' ? 'done' : ''} ${status === 'partial' ? 'partial' : ''}`}
          onClick={onToggle}
          title={`Status: ${status}. Click to change`}
          aria-label={`${text}. Status ${status}. Change status`}
        />
        <div className="task-content-flow">
          {editing ? (
            <input
              ref={inputRef}
              className="task-text-input task-inline-edit"
              size={Math.max(1, editText.length + 1)}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditing(false); setEditText(text) } }}
            />
          ) : (
            <span
              className={`task-text ${status === 'done' ? 'done' : ''}`}
              role={isOtherDate ? undefined : 'button'}
              tabIndex={isOtherDate ? undefined : 0}
              onClick={beginEditing}
              onKeyDown={isOtherDate ? undefined : handleTaskTextKeyDown}
              title={isOtherDate ? undefined : 'Edit task'}
            >
              {text}
            </span>
          )}
          {dateLabel && <span className="date-tag">{dateLabel}</span>}
          {' '}
          <span className="task-actions">
            {!isSubtask && !isOtherDate && onAIBreakdown && (
              <button
                type="button"
                className="task-action ai-btn"
                onClick={onAIBreakdown}
                title="Break task into steps with AI"
                aria-label={`Break ${text} into steps with AI`}
              >
                <BreakdownIcon />
              </button>
            )}
            {onCopyTask && (
              <button
                type="button"
                className="task-action copy-link"
                onClick={() => onCopyTask(
                  isSubtask && parentText ? parentText : text,
                  isSubtask ? [{ id, text, status, subtasks: [] }] : todaySubtasks ?? [],
                )}
                title={isSubtask ? 'Copy parent task with this step' : 'Copy task and steps'}
                aria-label={isSubtask ? `Copy ${parentText ?? text} with step ${text}` : `Copy ${text} and its steps`}
              >
                <CopyIcon />
              </button>
            )}
            {!isOtherDate && (
              <>
                <button type="button" className="task-action delete" onClick={onDelete} title="Delete" aria-label={`Delete ${text}`}>
                  <DeleteIcon />
                </button>
                <button
                  type="button"
                  className="task-action push"
                  onClick={onPush}
                  title={`Move to ${moveTargetLabel}`}
                  aria-label={`Move ${text} to ${moveTargetLabel}`}
                >
                  <PushIcon />
                </button>
              </>
            )}
            {!isOtherDate && onFocusSelect && (
              <button
                type="button"
                className={`task-action focus-link ${isFocusSelected ? 'active' : ''}`}
                onClick={onFocusSelect}
                title={
                  isFocusSelected
                    ? 'Armed for Mission Control'
                    : isFocusLocked
                      ? 'Mission Control is locked to the active session'
                      : 'Send to Mission Control'
                }
                disabled={Boolean(isFocusLocked && !isFocusSelected)}
                aria-label={isFocusSelected ? `Focused task: ${text}` : `Focus on ${text}`}
              >
                <FocusIcon />
              </button>
            )}
          </span>
        </div>
      </div>

      {!isSubtask && todaySubtasks?.map(sub => (
        <TaskItem
          key={sub.id}
          id={sub.id}
          text={sub.text}
          status={sub.status}
          isSubtask
          moveTargetLabel={moveTargetLabel}
          viewMode={viewMode}
          onToggle={() => onToggleSubtask?.(sub.id)}
          onDelete={() => onDeleteSubtask?.(sub.id)}
          onPush={() => onPushSubtask?.(sub.id)}
          onCopyTask={onCopyTask}
          onTextChange={(t) => onSubtaskTextChange?.(sub.id, t)}
          parentText={text}
          selectedFocusId={selectedFocusId}
          isFocusSelected={selectedFocusId === sub.id}
          isFocusLocked={isFocusLocked}
          onFocusSelect={() => onFocusSubtask?.(sub.id, sub.text)}
          sortable={getSubtaskSortable?.(sub.id, sub.text)}
        />
      ))}

      {!isSubtask && !isOtherDate && onAddSubtask && (
        <div className={`task-step-add-row ${showSubInput ? 'active' : ''}`}>
          <span className="task-step-add-handle-space" aria-hidden="true" />
          <button
            type="button"
            className="task-step-add-button"
            onClick={() => setShowSubInput(true)}
            title="Add a step"
            aria-label={`Add a step to ${text}`}
          >
            <AddStepIcon />
          </button>
          {showSubInput && (
            <input
              className="task-text-input task-step-add-input"
              placeholder="Add step..."
              value={subInput}
              onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubAdd(); if (e.key === 'Escape') setShowSubInput(false) }}
              onBlur={() => { if (!subInput.trim()) setShowSubInput(false) }}
              autoFocus
            />
          )}
        </div>
      )}

      {!isSubtask && viewMode === 'all' && otherSubtasks?.map(sub => (
        <TaskItem
          key={`${sub.sourceDate}-${sub.id}`}
          id={sub.id}
          text={sub.text}
          status={sub.status}
          isSubtask
          isOtherDate
          sourceDate={sub.sourceDate}
          moveTargetLabel={moveTargetLabel}
          viewMode={viewMode}
          onToggle={() => {}}
          onDelete={() => {}}
          onPush={() => {}}
          onCopyTask={onCopyTask}
          onTextChange={() => {}}
          parentText={text}
        />
      ))}

    </>
  )
}
