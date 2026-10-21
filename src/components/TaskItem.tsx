import { useState, useRef, useEffect, useId, type PointerEvent, type KeyboardEvent } from 'react'
import { format, subDays } from 'date-fns'
import { TaskFinish } from './TaskFinish'
import { DianeAction } from './DianeAction'
import type { Task, DatedTask, ViewMode, FinishPromise } from '../types'
import '../styles/task-interactions.css'

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
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
  onCancel: () => void
  onMove: (direction: -1 | 1) => void
}

interface Props {
  finish?: FinishPromise
  onUpdateFinish?: (patch: Partial<FinishPromise>) => void
  onReview?: (decision: 'complete' | 'revise' | 'stop') => void
  id: string
  text: string
  status: Task['status']
  isSubtask?: boolean
  isOtherDate?: boolean
  isFocusSelected?: boolean
  isFocusLocked?: boolean
  sourceDate?: string
  dianeSourceDate?: string
  moveTargetLabel: string
  viewMode: ViewMode
  onToggle: () => void
  onDelete: () => void
  onPush: () => void
  onCopyTask?: (text: string, subtasks: Task[], finish?: FinishPromise) => void
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
  id, text, status, isSubtask, isOtherDate, sourceDate, dianeSourceDate, moveTargetLabel,
  isFocusSelected, isFocusLocked, viewMode, onToggle, onDelete, onPush, onTextChange,
  onCopyTask, onFocusSelect, onFocusSubtask, onAddSubtask, onAIBreakdown,
  todaySubtasks, otherSubtasks, onToggleSubtask, onDeleteSubtask, onPushSubtask, onSubtaskTextChange,
  sortable, getSubtaskSortable, parentText, selectedFocusId, finish, onUpdateFinish, onReview,
}: Props) {
  const [selected, setSelected] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [addingStep, setAddingStep] = useState(false)
  const [breakingDown, setBreakingDown] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const [subInput, setSubInput] = useState('')
  const groupRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreTriggerRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stepInputRef = useRef<HTMLInputElement>(null)
  const titleEditActive = useRef(false)
  const pointerActive = useRef(false)
  const afterPointer = useRef<Array<() => void>>([])
  const moreId = useId()
  const stepsId = useId()
  const closed = status === 'done' || status === 'stopped'
  const steps = todaySubtasks ?? []
  const history = viewMode === 'all' ? otherSubtasks ?? [] : []
  const doneSteps = steps.filter(step => step.status === 'done').length
  const nextStep = steps.find(step => step.status !== 'done' && step.status !== 'stopped')

  // Blurring a selected row must not move the button under an in-progress click.
  // Save values immediately; postpone only the layout change until that click lands.
  const settleLayout = (update: () => void) => {
    if (pointerActive.current) afterPointer.current.push(update)
    else update()
  }
  useEffect(() => {
    let releaseTimer: ReturnType<typeof setTimeout> | undefined
    const finishPointer = () => {
      clearTimeout(releaseTimer)
      pointerActive.current = false
      const pending = afterPointer.current
      afterPointer.current = []
      pending.forEach(update => update())
    }
    const startPointer = (event: globalThis.PointerEvent) => {
      if (event.button === 0) pointerActive.current = true
    }
    const releasePointer = () => { releaseTimer = setTimeout(finishPointer, 0) }
    const dismiss = (event: MouseEvent) => {
      finishPointer()
      const target = event.target as HTMLElement | null
      const path = event.composedPath()
      // A clicked control can unmount after its action (for example Use suggestion).
      // Its original event path still identifies the row that received the click.
      const belongsTo = (element: HTMLElement | null) => Boolean(element && (path.includes(element) || element.contains(target)))
      // Diane details render in a portal; their controls still belong to this task.
      if (target?.closest('.diane-details') || path.some(node => node instanceof Element && node.matches('.diane-details'))) return
      if (!belongsTo(groupRef.current)) {
        setSelected(false); setDateOpen(false); setAddingStep(false)
      }
      if (!belongsTo(moreRef.current) && !belongsTo(moreTriggerRef.current)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', startPointer, true)
    document.addEventListener('pointerup', releasePointer)
    document.addEventListener('pointercancel', finishPointer)
    document.addEventListener('click', dismiss)
    return () => {
      clearTimeout(releaseTimer)
      document.removeEventListener('pointerdown', startPointer, true)
      document.removeEventListener('pointerup', releasePointer)
      document.removeEventListener('pointercancel', finishPointer)
      document.removeEventListener('click', dismiss)
    }
  }, [])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { if (addingStep) stepInputRef.current?.focus() }, [addingStep])

  const returnToTitle = () => requestAnimationFrame(() => titleRef.current?.focus())
  const commitEdit = (restoreFocus = false) => {
    if (!titleEditActive.current) return
    titleEditActive.current = false
    settleLayout(() => setEditing(false))
    const trimmed = editText.trim()
    if (trimmed && trimmed !== text) onTextChange(trimmed)
    else setEditText(text)
    if (restoreFocus) returnToTitle()
  }
  const cancelEdit = () => {
    titleEditActive.current = false
    setEditing(false); setEditText(text); returnToTitle()
  }
  const beginEditing = () => {
    if (isOtherDate) return
    setMoreOpen(false); setDateOpen(false)
    titleEditActive.current = true
    setEditing(true); setEditText(text)
  }
  const handleTaskTextKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault(); beginEditing()
  }
  const closeMore = (restoreFocus = false) => {
    setMoreOpen(false)
    if (restoreFocus) requestAnimationFrame(() => moreTriggerRef.current?.focus())
  }
  const openStepEntry = () => {
    setStepsOpen(true); setAddingStep(true); setMoreOpen(false)
    requestAnimationFrame(() => stepInputRef.current?.focus())
  }
  const handleSubAdd = () => {
    const trimmed = subInput.trim()
    if (trimmed && onAddSubtask) { onAddSubtask(trimmed); setSubInput(''); setStepsOpen(true) }
  }
  const breakdown = async () => {
    if (!onAIBreakdown || breakingDown || closed) return
    setBreakingDown(true); closeMore(); setStepsOpen(true)
    try { await onAIBreakdown() }
    finally { setBreakingDown(false) }
  }
  const copyTask = () => {
    onCopyTask?.(
      isSubtask && parentText ? parentText : text,
      isSubtask ? [{ id, text, status, subtasks: [] }] : steps,
      finish,
    )
    closeMore(true)
  }
  const dateLabel = sourceDate
    ? (isOtherDate ? format(new Date(sourceDate + 'T00:00:00'), 'MMMd')
      : `From ${sourceDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? 'yesterday' : sourceDate}`)
    : undefined
  const statusLabel = status === 'done' ? 'Complete' : status === 'stopped' ? 'Stopped'
    : finish?.reviewReady ? '' : status === 'partial' ? 'In progress' : status === 'question' ? 'Needs a decision' : ''
  const cls = [
    'task-item', isSubtask ? 'subtask' : 'main-task', isOtherDate ? 'other-date' : '',
    isFocusSelected ? 'selected-for-focus' : '', selected ? 'task-selected' : '', sortable?.state ?? '',
  ].filter(Boolean).join(' ')
  const handleReorderKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { event.stopPropagation(); sortable?.onCancel(); return }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault(); sortable?.onMove(event.key === 'ArrowUp' ? -1 : 1)
  }

  return <div className={`task-entry${selected ? ' task-entry-selected' : ''}${isSubtask ? ' task-entry-step' : ''}`}
    ref={groupRef} onBlur={event => {
      const target = event.relatedTarget as HTMLElement | null
      if (target?.closest('.diane-details')) return
      if (target && !event.currentTarget.contains(target)) {
        settleLayout(() => { setSelected(false); setMoreOpen(false); setDateOpen(false); setAddingStep(false) })
      }
    }}>
    <div ref={rowRef} onClick={() => setSelected(true)} onFocusCapture={() => settleLayout(() => setSelected(true))}
      className={cls} data-reorder-id={sortable ? id : undefined}>
      {sortable && <button type="button" className="task-drag-handle"
        onPointerDown={sortable.onPointerDown} onPointerMove={sortable.onPointerMove} onPointerUp={sortable.onPointerUp}
        onPointerCancel={sortable.onCancel} onLostPointerCapture={sortable.onCancel} onDragStart={event => event.preventDefault()}
        onKeyDown={handleReorderKeyDown} title="Drag to reorder. Use Arrow Up or Arrow Down from this handle." aria-label={sortable.label}>
        <DragHandleIcon />
      </button>}
      <button type="button" className={`task-checkbox ${status === 'done' ? 'done' : ''} ${status === 'partial' ? 'partial' : ''} ${status === 'stopped' ? 'stopped' : ''}`}
        onClick={onToggle} disabled={isOtherDate}
        title={isOtherDate ? 'Historical step · read only' : closed ? 'Reopen task' : finish?.doneWhen ? 'Review outcome' : 'Complete task'}
        aria-label={`${text}. Status ${status}. Change status`} />
      <div className={`task-content-flow${isOtherDate ? '' : ' editable'}${editing ? ' editing' : ''}`}>
        <div className="task-title-line">
          {editing ? <input ref={inputRef} aria-label={`Edit title: ${text}`} className="task-text-input task-inline-edit"
            value={editText} onChange={event => setEditText(event.target.value)} onBlur={() => commitEdit()}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'Enter') { event.preventDefault(); commitEdit(true) }
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelEdit() }
            }} /> : <span ref={titleRef} className={`task-text ${status === 'done' ? 'done' : ''}`}
              role={isOtherDate ? undefined : 'button'} tabIndex={isOtherDate ? undefined : 0}
              onClick={() => setSelected(true)} onDoubleClick={beginEditing} onKeyDown={isOtherDate ? undefined : handleTaskTextKeyDown}
              title={isOtherDate ? undefined : 'Select task. Double-click or press Enter to edit title.'}>{text}</span>}
        </div>
        {(statusLabel || dateLabel) && <div className="task-state-line">
          {statusLabel && <span className={`task-state-label state-${status}`}>{statusLabel}</span>}
          {dateLabel && <span className="task-source-label">{dateLabel}</span>}
        </div>}
        {!isSubtask && !isOtherDate && onUpdateFinish && onReview && <TaskFinish taskText={text} finish={finish}
          selected={selected && !editing} dateOpen={dateOpen} setDateOpen={setDateOpen} status={status} onUpdate={onUpdateFinish} onReview={onReview} settleLayout={settleLayout} />}
        {!isSubtask && (steps.length > 0 || history.length > 0) && <div className="task-steps-summary">
          <button type="button" className="task-steps-toggle" aria-expanded={stepsOpen} aria-controls={stepsId}
            aria-label={`${stepsOpen ? 'Hide' : 'Show'} steps for ${text}. ${doneSteps} of ${steps.length} done`}
            onClick={() => setStepsOpen(value => !value)}>
            <span aria-hidden="true">{stepsOpen ? '▾' : '▸'}</span>
            {steps.length ? `${doneSteps}/${steps.length} steps done` : 'Historical steps'}
            {history.length > 0 && <span className="task-history-count"> · {history.length} from other dates</span>}
          </button>
          {!stepsOpen && nextStep && <p className="task-next-step"><span>Next</span> {nextStep.text}</p>}
        </div>}
        {(selected || moreOpen || isOtherDate) && !editing && <div className="task-primary-actions">
          {!isOtherDate && !closed && onFocusSelect && <button type="button" className={`task-text-action task-focus-action${isFocusSelected ? ' active' : ''}`}
            onClick={event => { event.currentTarget.focus(); onFocusSelect() }} disabled={Boolean(isFocusLocked && !isFocusSelected)}
            title={isFocusLocked && !isFocusSelected ? 'A focus session is already active' : 'Choose this task for a focus session'}
            aria-label={isFocusSelected ? `Focused task: ${text}` : `Focus on ${text}`}><FocusIcon /> Focus</button>}
          {!isSubtask && !isOtherDate && !closed && onAddSubtask && <button type="button" className="task-text-action" onClick={openStepEntry}>Add step</button>}
          <button ref={moreTriggerRef} type="button" className="task-text-action task-more-trigger" aria-expanded={moreOpen} aria-controls={moreId}
            aria-label={`More actions for ${text}`} onClick={() => setMoreOpen(value => !value)}
            onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeMore(true) } }}>More <span aria-hidden="true">{moreOpen ? '▴' : '▾'}</span></button>
        </div>}
        <div ref={moreRef} id={moreId} className="task-more-panel" hidden={!moreOpen} role="group" aria-label={`More actions for ${text}`}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMore(true) } }}>
          {!isOtherDate && <button type="button" onClick={beginEditing}>Edit title</button>}
          {!isSubtask && !isOtherDate && !closed && onAIBreakdown && <button type="button" className="task-ai-action" disabled={breakingDown}
            onClick={() => void breakdown()} aria-label={`Break ${text} into steps with AI`}><BreakdownIcon /> Suggest steps with AI</button>}
          {onCopyTask && <button type="button" onClick={copyTask}
            aria-label={isSubtask ? `Copy ${parentText ?? text} with step ${text}` : `Copy ${text} and its steps`}><CopyIcon /> Copy task{!isSubtask && steps.length > 0 ? ' and steps' : ''}</button>}
          {!isOtherDate && <>
            <button type="button" onClick={() => { closeMore(); onPush() }} aria-label={`Move ${text} to ${moveTargetLabel}`}><PushIcon /> Move to {moveTargetLabel}</button>
            {!closed && !isSubtask && onReview && <button type="button" onClick={() => { closeMore(true); onReview('stop') }}>Stop task</button>}
            <button type="button" className="task-delete-action" onClick={() => { closeMore(); onDelete() }} aria-label={`Delete ${text}`}><DeleteIcon /> Delete</button>
          </>}
          {!isOtherDate && <span className="task-diane-control"><DianeAction sourceDate={dianeSourceDate ?? sourceDate}
            id={sourceDate ? id.replace(`${sourceDate}:`, '') : id} text={text} parent={parentText}
            steps={todaySubtasks?.map(step => `${step.status === 'done' ? '[completed] ' : ''}${step.text}`)} /></span>}
        </div>
        {breakingDown && <span className="task-inline-status" role="status">Preparing suggested steps…</span>}
      </div>
    </div>
    {!isSubtask && stepsOpen && <div id={stepsId} className="task-steps-body">
      {steps.map(sub => <TaskItem key={sub.id} id={sub.id} dianeSourceDate={dianeSourceDate ?? sourceDate} text={sub.text} status={sub.status}
        isSubtask moveTargetLabel={moveTargetLabel} viewMode={viewMode} onToggle={() => onToggleSubtask?.(sub.id)}
        onDelete={() => onDeleteSubtask?.(sub.id)} onPush={() => onPushSubtask?.(sub.id)} onCopyTask={onCopyTask}
        onTextChange={value => onSubtaskTextChange?.(sub.id, value)} parentText={text} selectedFocusId={selectedFocusId}
        isFocusSelected={selectedFocusId === sub.id} isFocusLocked={isFocusLocked}
        onFocusSelect={() => onFocusSubtask?.(sub.id, sub.text)} sortable={getSubtaskSortable?.(sub.id, sub.text)} />)}
      {history.length > 0 && <div className="task-history-heading">From other dates · read only</div>}
      {history.map(sub => <TaskItem key={`${sub.sourceDate}-${sub.id}`} id={sub.id} text={sub.text} status={sub.status}
        isSubtask isOtherDate sourceDate={sub.sourceDate} moveTargetLabel={moveTargetLabel} viewMode={viewMode}
        onToggle={() => {}} onDelete={() => {}} onPush={() => {}} onCopyTask={onCopyTask} onTextChange={() => {}} parentText={text} />)}
    </div>}
    {!isSubtask && !isOtherDate && !closed && onAddSubtask && (selected || addingStep || subInput) && <div className="task-step-composer">
      <input ref={stepInputRef} className="task-text-input task-step-add-input" placeholder="Add a step…" aria-label={`New step for ${text}`}
        value={subInput} onChange={event => setSubInput(event.target.value)}
        onFocus={() => { setSelected(true); setAddingStep(true) }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter') { event.preventDefault(); handleSubAdd() }
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setSubInput(''); setAddingStep(false); returnToTitle() }
        }} />
      <span className="task-step-entry-hint">Enter to add</span>
    </div>}
  </div>
}
