import { useState, useRef, useEffect } from 'react'
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
  onExportPrompt?: (text: string, subtasks: Task[]) => void
  onTextChange: (text: string) => void
  onFocusSelect?: () => void
  onAddSubtask?: (text: string) => void
  onAIBreakdown?: () => void
  todaySubtasks?: Task[]
  otherSubtasks?: DatedTask[]
  onToggleSubtask?: (subtaskId: string) => void
  onDeleteSubtask?: (subtaskId: string) => void
  onPushSubtask?: (subtaskId: string) => void
  onSubtaskTextChange?: (subtaskId: string, text: string) => void
}

export function TaskItem({
  id, text, status, isSubtask, isOtherDate, sourceDate, moveTargetLabel,
  isFocusSelected, isFocusLocked,
  viewMode, onToggle, onDelete, onPush, onTextChange,
  onExportPrompt,
  onFocusSelect,
  onAddSubtask, onAIBreakdown,
  todaySubtasks, otherSubtasks,
  onToggleSubtask, onDeleteSubtask, onPushSubtask, onSubtaskTextChange,
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

  const dateLabel = sourceDate
    ? format(new Date(sourceDate + 'T00:00:00'), 'MMMd')
    : undefined

  const cls = [
    'task-item',
    isSubtask ? 'subtask' : 'main-task',
    isOtherDate ? 'other-date' : '',
    isFocusSelected ? 'selected-for-focus' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <div className={cls}>
        <button
          className={`task-checkbox ${status === 'done' ? 'done' : ''} ${status === 'partial' ? 'partial' : ''}`}
          onClick={onToggle}
          title={`Status: ${status}. Click to change`}
          aria-label={`${text}. Status ${status}. Change status`}
        />
        {editing ? (
          <input
            ref={inputRef}
            className="task-text-input"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditing(false); setEditText(text) } }}
          />
        ) : (
          <button
            type="button"
            className={`task-text ${status === 'done' ? 'done' : ''}`}
            onClick={() => { if (!isOtherDate) { setEditing(true); setEditText(text) } }}
            disabled={isOtherDate}
            title={isOtherDate ? undefined : 'Edit task'}
          >
            {text}
          </button>
        )}
        {dateLabel && <span className="date-tag">{dateLabel}</span>}
        <div className="task-actions">
          {!isSubtask && !isOtherDate && onFocusSelect && (
            <button
              className={`focus-link ${isFocusSelected ? 'active' : ''}`}
              onClick={onFocusSelect}
              title={
                isFocusSelected
                  ? 'Task armed for Mission Control'
                  : isFocusLocked
                    ? 'Mission Control is locked to the active session'
                    : 'Send to Mission Control'
              }
              disabled={Boolean(isFocusLocked && !isFocusSelected)}
              aria-label={isFocusSelected ? `Focused task: ${text}` : `Focus on ${text}`}
            >
              {isFocusSelected ? 'Armed' : 'Focus'}
            </button>
          )}
          {!isSubtask && !isOtherDate && onAddSubtask && (
            <button
              className={`subtask-link ${showSubInput ? 'active' : ''}`}
              onClick={() => setShowSubInput(true)}
              title="Add a step"
              aria-label={`Add a step to ${text}`}
            >
              <AddStepIcon />
            </button>
          )}
          {!isSubtask && !isOtherDate && onAIBreakdown && (
            <button
              className="ai-btn"
              onClick={onAIBreakdown}
              title="Break task into steps with AI"
              aria-label={`Break ${text} into steps with AI`}
            >
              <BreakdownIcon />
            </button>
          )}
          {onExportPrompt && (
            <button
              type="button"
              className="transfer-link prompt-link"
              onClick={() => onExportPrompt(text, isSubtask ? [] : todaySubtasks ?? [])}
              title="Copy an execution-ready agent prompt"
              aria-label={`Copy agent prompt for ${text}`}
            >
              Prompt
            </button>
          )}
          {!isOtherDate && (
            <>
              <button className="delete" onClick={onDelete} title="Delete" aria-label={`Delete ${text}`}>✕</button>
              <button
                className="push"
                onClick={onPush}
                title={`Move to ${moveTargetLabel}`}
                aria-label={`Move ${text} to ${moveTargetLabel}`}
              >
                →
              </button>
            </>
          )}
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
          onExportPrompt={onExportPrompt}
          onTextChange={(t) => onSubtaskTextChange?.(sub.id, t)}
        />
      ))}

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
          onExportPrompt={onExportPrompt}
          onTextChange={() => {}}
        />
      ))}

      {!isSubtask && !isOtherDate && showSubInput && (
        <div className="task-item subtask">
          <div style={{ width: 16 }} />
          <input
            className="task-text-input"
            placeholder="Add subtask..."
            value={subInput}
            onChange={e => setSubInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubAdd(); if (e.key === 'Escape') setShowSubInput(false) }}
            onBlur={() => { if (!subInput.trim()) setShowSubInput(false) }}
            autoFocus
          />
        </div>
      )}

    </>
  )
}
