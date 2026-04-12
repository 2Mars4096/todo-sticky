import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import type { Task, DatedTask, ViewMode } from '../types'

interface Props {
  id: string
  text: string
  status: Task['status']
  isSubtask?: boolean
  isOtherDate?: boolean
  sourceDate?: string
  viewMode: ViewMode
  onToggle: () => void
  onDelete: () => void
  onPush: () => void
  onTextChange: (text: string) => void
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
  id, text, status, isSubtask, isOtherDate, sourceDate,
  viewMode, onToggle, onDelete, onPush, onTextChange,
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
  ].filter(Boolean).join(' ')

  return (
    <>
      <div className={cls}>
        <button
          className={`task-checkbox ${status === 'done' ? 'done' : ''} ${status === 'partial' ? 'partial' : ''}`}
          onClick={onToggle}
          title={status}
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
          <span
            className={`task-text ${status === 'done' ? 'done' : ''}`}
            onClick={() => { if (!isOtherDate) { setEditing(true); setEditText(text) } }}
          >
            {text}
          </span>
        )}
        {dateLabel && <span className="date-tag">{dateLabel}</span>}
        <div className="task-actions">
          {!isSubtask && !isOtherDate && onAIBreakdown && (
            <button className="ai-btn" onClick={onAIBreakdown} title="AI breakdown">✦</button>
          )}
          {!isOtherDate && (
            <>
              <button className="delete" onClick={onDelete} title="Delete">✕</button>
              <button className="push" onClick={onPush} title="Push to tomorrow">→</button>
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
          viewMode={viewMode}
          onToggle={() => onToggleSubtask?.(sub.id)}
          onDelete={() => onDeleteSubtask?.(sub.id)}
          onPush={() => onPushSubtask?.(sub.id)}
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
          viewMode={viewMode}
          onToggle={() => {}}
          onDelete={() => {}}
          onPush={() => {}}
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

      {!isSubtask && !isOtherDate && !showSubInput && (
        <div
          className="task-item subtask"
          style={{ opacity: 0, height: 0, overflow: 'hidden' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.opacity = '0.5'
            el.style.height = 'auto'
          }}
        >
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: '2px 0' }}
            onClick={() => setShowSubInput(true)}
          >
            + subtask
          </button>
        </div>
      )}
    </>
  )
}
