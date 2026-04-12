import { useEffect, useRef, useState } from 'react'
import type { GoalCategory, GoalItem } from '../types'

interface SidebarProps {
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
  emptyText: string
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
    onUpdateGoal(category, item.id, draft)
  }

  return (
    <div className={`goal-row ${item.done ? 'done' : ''}`}>
      <button
        className={`goal-toggle ${item.done ? 'done' : ''}`}
        onClick={() => onToggleGoal(category, item.id)}
        title={item.done ? 'Mark active' : 'Mark done'}
      />
      {editing ? (
        <textarea
          ref={inputRef}
          className="goal-edit-input"
          rows={2}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') commit()
            if (event.key === 'Escape') {
              setEditing(false)
              setDraft(item.text)
            }
          }}
        />
      ) : (
        <span
          className="goal-text"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
        >
          {item.text}
        </span>
      )}
      <button
        className="goal-delete"
        onClick={() => onDeleteGoal(category, item.id)}
        title="Delete item"
      >
        ✕
      </button>
    </div>
  )
}

function GoalSection({
  title,
  category,
  items,
  placeholder,
  emptyText,
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
        <span>{openCount} open</span>
      </div>

      <div className="goal-list">
        {items.length ? items.map(item => (
          <GoalRow
            key={item.id}
            category={category}
            item={item}
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            onToggleGoal={onToggleGoal}
          />
        )) : (
          <p className="goal-empty">{emptyText}</p>
        )}
      </div>

      <div className="goal-composer">
        <textarea
          className="goal-composer-input"
          rows={2}
          placeholder={placeholder}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleAdd()
          }}
        />
        <button onClick={handleAdd} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </section>
  )
}

export function GoalsSidebar({
  collapsed,
  targets,
  recurring,
  onToggleCollapse,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onToggleGoal,
}: SidebarProps) {
  return (
    <aside className={`goals-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-spacer" />
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {collapsed ? (
        <div className="sidebar-mini-stats">
          <div className="mini-stat">
            <strong>{targets.length}</strong>
            <span>LT</span>
          </div>
          <div className="mini-stat">
            <strong>{recurring.length}</strong>
            <span>RC</span>
          </div>
        </div>
      ) : (
        <div className="sidebar-body">
          <GoalSection
            title="Long-Term"
            category="targets"
            items={targets}
            placeholder="Add a long-term target..."
            emptyText="Nothing pinned here yet."
            onAddGoal={onAddGoal}
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            onToggleGoal={onToggleGoal}
          />

          <GoalSection
            title="Recurring"
            category="recurring"
            items={recurring}
            placeholder="Add a recurring item..."
            emptyText="No recurring anchors yet."
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
