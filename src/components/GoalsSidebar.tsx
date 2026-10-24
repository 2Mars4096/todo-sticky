import { useEffect, useRef, useState } from 'react'
import type { GoalCategory, GoalItem } from '../types'
import '../styles/settings-navigation.css'

interface SidebarProps {
  storageError?: string | null
  recoveryNotice?: string | null
  onRetrySave?: () => void
  collapsed: boolean
  targets: GoalItem[]
  recurring: GoalItem[]
  onToggleCollapse: () => void
  onAddGoal: (category: GoalCategory, text: string) => void
  onUpdateGoal: (category: GoalCategory, goalId: string, text: string) => void
  onDeleteGoal: (category: GoalCategory, goalId: string) => void
  onToggleGoal: (category: GoalCategory, goalId: string) => void
}

interface SectionProps {
  title: string
  category: GoalCategory
  items: GoalItem[]
  placeholder: string
  onAddGoal: SidebarProps['onAddGoal']
  onUpdateGoal: SidebarProps['onUpdateGoal']
  onDeleteGoal: SidebarProps['onDeleteGoal']
  onToggleGoal: SidebarProps['onToggleGoal']
}

interface RowProps {
  category: GoalCategory
  item: GoalItem
  onUpdateGoal: SidebarProps['onUpdateGoal']
  onDeleteGoal: SidebarProps['onDeleteGoal']
  onToggleGoal: SidebarProps['onToggleGoal']
}

function GoalRow({
  category,
  item,
  onUpdateGoal,
  onDeleteGoal,
  onToggleGoal,
}: RowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(item.text)
  }, [item.text])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const text = draft.trim()
    if (text) onUpdateGoal(category, item.id, text)
    else setDraft(item.text)
  }

  return (
    <div className={`goal-row ${item.done ? 'done' : ''}`}>
      <button
        className={`goal-toggle ${item.done ? 'done' : ''}`}
        onClick={() => onToggleGoal(category, item.id)}
        title={item.done ? 'Mark active' : 'Mark done'}
        aria-label={`${item.done ? 'Reactivate' : 'Complete'} ${item.text}`}
        aria-pressed={item.done}
      />
      {editing ? (
        <textarea
          ref={inputRef}
          className="goal-edit-input"
          rows={1}
          aria-label={`Edit ${item.text}`}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') {
              event.stopPropagation()
              setEditing(false)
              setDraft(item.text)
            }
          }}
        />
      ) : (
        <span
          className="goal-text"
          role="button"
          tabIndex={0}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEditing(true) } }}
          onDoubleClick={() => setEditing(true)}
          title="Double-click or press Enter to edit"
        >
          {item.text}
        </span>
      )}
      <button
        className="goal-delete"
        onClick={() => onDeleteGoal(category, item.id)}
        title="Delete item"
        aria-label={`Delete ${item.text}`}
      >
        <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6 2h4l.75 2.5M4.5 4.5l.6 9h5.8l.6-9M6.5 7v4M9.5 7v4" /></svg>
      </button>
    </div>
  )
}

function GoalSection({
  title,
  category,
  items,
  placeholder,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onToggleGoal,
}: SectionProps) {
  const [draft, setDraft] = useState('')
  const openCount = items.filter(item => !item.done).length

  const handleAdd = () => {
    if (!draft.trim()) return
    onAddGoal(category, draft)
    setDraft('')
  }

  return (
    <section className="goal-section">
      <div className="goal-section-header">
        <h2>{title}</h2>
        {items.length > 0 && <span>{openCount} open</span>}
      </div>
      {category === 'recurring' && <p className="goal-section-description">Reusable reminders you reset yourself.</p>}

      <div className="goal-list">
        {items.map(item => (
          <GoalRow
            key={item.id}
            category={category}
            item={item}
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            onToggleGoal={onToggleGoal}
          />
        ))}
      </div>

      <div className="goal-composer">
        <span className="goal-add-mark" aria-hidden="true">+</span>
        <input
          className="goal-composer-input"
          aria-label={placeholder}
          placeholder={placeholder}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter') { event.preventDefault(); handleAdd() }
            if (event.key === 'Escape') { event.stopPropagation(); setDraft(''); event.currentTarget.blur() }
          }}
        />
      </div>
    </section>
  )
}

export function GoalsSidebar({
  storageError,
  recoveryNotice,
  onRetrySave,
  collapsed,
  targets,
  recurring,
  onToggleCollapse,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onToggleGoal,
}: SidebarProps) {
  const openTargets = targets.filter(item => !item.done).length
  const openRoutines = recurring.filter(item => !item.done).length
  return (
    <aside id="goals-panel" className={`goals-sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Goals and routines">
      <div className="sidebar-top">
        {collapsed ? <div className="sidebar-spacer" /> : <span className="goals-heading">Goals</span>}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Open goals' : 'Close goals'}
          aria-label={collapsed ? 'Open goals' : 'Close goals'}
          aria-expanded={!collapsed}
        >
          {collapsed ? '›' : <span className="goals-close-label">Close</span>}
        </button>
      </div>

      {collapsed ? (
        <div className="sidebar-mini-stats" aria-label={`${openTargets} open long-term goals and ${openRoutines} open routines`}>
          <span className="rail-name">Goals</span>
          <div className="mini-stat">
            <strong>{openTargets}</strong>
            <span>Long</span>
          </div>
          <div className="mini-stat">
            <strong>{openRoutines}</strong>
            <span>Routines</span>
          </div>
        </div>
      ) : (
        <div className="sidebar-body">
          {recoveryNotice && <p className="goal-section-description" role="status">{recoveryNotice}</p>}
          {storageError && <div className="settings-error" role="alert">
            <p>{storageError}</p>
            {onRetrySave && <button type="button" onClick={onRetrySave}>Retry save</button>}
          </div>}
          <GoalSection
            title="Long-term"
            category="targets"
            items={targets}
            placeholder="Add a goal"
            onAddGoal={onAddGoal}
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            onToggleGoal={onToggleGoal}
          />

          <GoalSection
            title="Routines"
            category="recurring"
            items={recurring}
            placeholder="Add a routine"
            onAddGoal={onAddGoal}
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            onToggleGoal={onToggleGoal}
          />
        </div>
      )}
    </aside>
  )
}
