import { TaskEditorBridge, useTaskEditor } from '../TaskEditor'
import { useTodoPort } from '../TodoPortContext'
import { TaskDianeAction } from '../TaskDianeAction'
import { TaskStepProposal } from '../TaskStepProposal'
import { TaskWorkflowStatus } from '../TaskWorkflowStatus'
import { ParagraphInput } from './ParagraphInput'
import { useState, useRef, useEffect, useId, type PointerEvent, type MouseEvent, type KeyboardEvent } from 'react'
import { format, subDays } from 'date-fns'
import { TaskFinish } from './TaskFinish'
import { effectiveProject } from '../projectPlanning'
import type { GoalItem, Task, DatedTask, FinishPromise } from '../types'
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

function AddStepIcon() {
  return <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
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
  projects?: GoalItem[]
  goalId?: string
  onOpenProject?: (id:string)=>void
  onAssignProject?: (goalId:string,subtaskId?:string)=>void

  finish?: FinishPromise
  onUpdateFinish?: (patch: Partial<FinishPromise>) => void
  onReview?: (decision: 'complete' | 'revise' | 'stop') => void
  id: string
  recordId?: string
  text: string
  status: Task['status']
  isSubtask?: boolean
  isOtherDate?: boolean
  sourceDate?: string
  dianeSourceDate?: string
  moveTargetLabel: string
  subtaskMoveTargetLabel?: string
  onToggle: () => void
  onDelete: () => void
  onPush: () => void
  onCopyTask?: (text: string, subtasks: Task[], finish?: FinishPromise) => void
  onTextChange: (text: string) => void
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
}

export function TaskItem({
  projects=[], goalId, onOpenProject, onAssignProject,
  id, recordId, text, status, isSubtask, isOtherDate, sourceDate, dianeSourceDate, moveTargetLabel, subtaskMoveTargetLabel,
  onToggle, onDelete, onPush, onTextChange,
  onCopyTask, onAddSubtask, onAIBreakdown,
  todaySubtasks, otherSubtasks, onToggleSubtask, onDeleteSubtask, onPushSubtask, onSubtaskTextChange,
  sortable, getSubtaskSortable, finish, onUpdateFinish, onReview,
}: Props) {
  const port = useTodoPort()
  const taskEditor = useTaskEditor()
  const [selected, setSelected] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [addingStep, setAddingStep] = useState(false)
  const [breakingDown, setBreakingDown] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const [subInput, setSubInput] = useState('')
  const groupRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stepInputRef = useRef<HTMLTextAreaElement>(null)
  const editCaret = useRef<number | null>(null)
  const titleEditActive = useRef(false)
  const pointerActive = useRef(false)
  const afterPointer = useRef<Array<() => void>>([])
  const stepsId = useId()
  const closed = status === 'done' || status === 'stopped'
  const steps = todaySubtasks ?? []
  const history = otherSubtasks ?? []
  const doneSteps = steps.filter(step => step.status === 'done').length
  const nextStep = steps.find(step => step.status !== 'done' && step.status !== 'stopped')

  const revealId = port?.selection?.recordId
  const containsReveal = (items: Task[]): boolean => items.some(task => task.id === revealId || containsReveal(task.subtasks || []))
  const revealDescendant = containsReveal(todaySubtasks || [])
  useEffect(() => {
    if (revealId === id) {
      setSelected(true)
      requestAnimationFrame(() => rowRef.current?.scrollIntoView({ block: 'nearest' }))
    }
    if (revealDescendant) setStepsOpen(true)
  }, [port?.selection?.requestId, revealId, id, revealDescendant])

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
    const dismiss = (event: globalThis.MouseEvent) => {
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
  useEffect(() => {
    if (!editing || !inputRef.current) return
    inputRef.current.focus()
    const position = editCaret.current ?? inputRef.current.value.length
    inputRef.current.setSelectionRange(position, position)
  }, [editing])
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
  const beginEditing = (event?: MouseEvent<HTMLSpanElement>) => {
    // Preserve text selection for copying; a click edits at the pointed character.
    if (event && !window.getSelection()?.isCollapsed) return
    editCaret.current = null
    if (event && event.detail > 0) {
      const doc = document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
        caretRangeFromPoint?: (x: number, y: number) => Range | null
      }
      const position = doc.caretPositionFromPoint?.(event.clientX, event.clientY)
      const range = position ? document.createRange() : doc.caretRangeFromPoint?.(event.clientX, event.clientY)
      if (range && position) range.setStart(position.offsetNode, position.offset)
      if (range && event.currentTarget.contains(range.startContainer)) {
        const prefix = document.createRange()
        prefix.selectNodeContents(event.currentTarget)
        prefix.setEnd(range.startContainer, range.startOffset)
        editCaret.current = prefix.toString().length
      }
    }
    if (isOtherDate) return
    setDateOpen(false)
    titleEditActive.current = true
    setEditing(true); setEditText(text)
  }
  const handleTaskTextKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault(); beginEditing()
  }
  const openStepEntry = () => {
    setStepsOpen(true); setAddingStep(true)
    requestAnimationFrame(() => stepInputRef.current?.focus())
  }
  const handleSubAdd = () => {
    const trimmed = subInput.trim()
    if (trimmed && onAddSubtask) { onAddSubtask(trimmed); setSubInput(''); setStepsOpen(true) }
  }
  const breakdown = async () => {
    if (!onAIBreakdown || breakingDown || closed) return
    setBreakingDown(true); setStepsOpen(true)
    try { await onAIBreakdown() }
    finally { setBreakingDown(false) }
  }
  const dateLabel = sourceDate
    ? (isOtherDate ? format(new Date(sourceDate + 'T00:00:00'), 'MMMd')
      : `Carried from ${sourceDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? 'yesterday' : format(new Date(sourceDate + 'T00:00:00'), 'MMM d, yyyy')}`)
    : undefined
  const statusLabel = status === 'done' ? 'Complete' : status === 'stopped' ? 'Stopped'
    : finish?.reviewReady ? '' : status === 'partial' ? 'In progress' : status === 'question' ? 'Needs a decision' : ''
  const cls = [
    'task-item', isSubtask ? 'subtask' : 'main-task', isOtherDate ? 'other-date' : '',
    selected ? 'task-selected' : '', sortable?.state ?? '',
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
        settleLayout(() => { setSelected(false); setDateOpen(false); setAddingStep(false) })
      }
    }}>
    <div ref={rowRef} onClick={() => setSelected(true)} onFocusCapture={() => settleLayout(() => setSelected(true))}
      className={cls} data-task-id={id} data-reorder-id={sortable ? id : undefined}>
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
        <div className="task-title-line" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commitEdit()
        }}>
          {taskEditor && port ? <TaskEditorBridge key={JSON.stringify([port.scope, recordId ?? id])} editor={taskEditor}
            scope={port.scope} taskId={recordId ?? id} content={text} readOnly={Boolean(isOtherDate || !port.enabled)} onChange={onTextChange} /> : editing ? <ParagraphInput ref={inputRef} aria-label={`Edit title: ${text}`} className="task-text-input task-inline-edit"
            value={editText} onChange={event => setEditText(event.target.value)}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); commitEdit(true) }
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelEdit() }
            }} /> : <span ref={titleRef} className={`task-text ${status === 'done' ? 'done' : ''}`}
              role={isOtherDate ? undefined : 'button'} tabIndex={isOtherDate ? undefined : 0}
              onClick={beginEditing} onKeyDown={isOtherDate ? undefined : handleTaskTextKeyDown}
              title={isOtherDate ? undefined : 'Edit task'}>{text || 'Untitled task'}</span>}
          {editing && <div className="task-edit-actions">
            <button type="button" className="task-text-action primary" disabled={!editText.trim()} onClick={() => commitEdit(true)}>Save</button>
            <button type="button" className="task-text-action" onClick={cancelEdit}>Cancel</button>
          </div>}
        </div>
        {(statusLabel || dateLabel) && <div className="task-state-line">
          {statusLabel && <span className={`task-state-label state-${status}`}>{statusLabel}</span>}
          {dateLabel && <span className="task-source-label">{dateLabel}</span>}
        </div>}
        {!isOtherDate && <TaskWorkflowStatus taskId={recordId ?? id} />}
        {!isSubtask && !isOtherDate && onUpdateFinish && onReview && <TaskFinish taskText={text} finish={finish}
          selected={selected} dateOpen={dateOpen} setDateOpen={setDateOpen} status={status} onUpdate={onUpdateFinish} onReview={onReview} settleLayout={settleLayout} />}
        {!isOtherDate && projects.length>0 && selected && <div className="task-project">
          {selected && onAssignProject ? <select aria-label={`Task project for ${text}`} value={goalId??''} onChange={event=>onAssignProject(event.target.value)}>
            <option value="" disabled={Boolean(goalId)}>No project</option>{projects.filter(project=>!project.done||project.id===goalId).map(project=><option key={project.id} value={project.id}>{project.text.split('\n')[0]}</option>)}
          </select> : goalId && <button onClick={()=>onOpenProject?.(goalId)} title="Open project">{projects.find(project=>project.id===goalId)?.text.split('\n')[0]??'Project'}</button>}
        </div>}
        {!isSubtask && steps.length > 0 && <div className="task-steps-summary">
          <button type="button" className="task-steps-toggle" aria-expanded={stepsOpen} aria-controls={stepsId}
            aria-label={`${stepsOpen ? 'Hide' : 'Show'} steps for ${text}. ${doneSteps} of ${steps.length} done`}
            onClick={() => setStepsOpen(value => !value)}>
            <span aria-hidden="true">{stepsOpen ? '▾' : '▸'}</span>
            {`${doneSteps}/${steps.length} steps done`}
          </button>
          {selected && !stepsOpen && nextStep && <p className="task-next-step"><span>Next</span> {nextStep.text}</p>}
        </div>}
        {(selected && !isOtherDate) && <div className="task-primary-actions">
          {!isSubtask && !isOtherDate && !closed && onAddSubtask && <button type="button" className="task-text-action task-icon-action" title="Add step" aria-label="Add step" onClick={openStepEntry}><AddStepIcon /></button>}
          {!isSubtask && !isOtherDate && !closed && onAIBreakdown && <button type="button" className="task-text-action task-icon-action task-ai-action" title={breakingDown ? 'Preparing suggested steps…' : 'Suggest steps with AI'} disabled={breakingDown}
            onClick={() => void breakdown()} aria-label={`Break ${text} into steps with AI`}><BreakdownIcon /></button>}
          {!isOtherDate && <button type="button" className="task-text-action task-icon-action" title={`Move to ${moveTargetLabel} · due date stays unchanged`}
            onClick={() => { onPush() }} aria-label={`Move ${text} to ${moveTargetLabel}`}><PushIcon /></button>}
          {!isOtherDate && <button type="button" className="task-text-action task-icon-action task-delete-action" title="Delete"
            onClick={onDelete} aria-label={`Delete ${text}`}><DeleteIcon /></button>}
        </div>}
        {selected && !isOtherDate && <TaskDianeAction id={recordId ?? id} />}
        {!isOtherDate && <TaskStepProposal taskId={id} />}
        {breakingDown && <span className="task-inline-status" role="status">Preparing suggested steps…</span>}
      </div>
    </div>
    {!isSubtask && stepsOpen && <div id={stepsId} className="task-steps-body">
      {steps.map(sub => <TaskItem projects={projects} goalId={effectiveProject(sub,projects,goalId)} onOpenProject={onOpenProject} onAssignProject={onAssignProject ? value=>onAssignProject(value,sub.id):undefined} key={sub.id} id={sub.id} dianeSourceDate={dianeSourceDate ?? sourceDate} text={sub.text} status={sub.status}
        isSubtask moveTargetLabel={subtaskMoveTargetLabel ?? moveTargetLabel} onToggle={() => onToggleSubtask?.(sub.id)}
        onDelete={() => onDeleteSubtask?.(sub.id)} onPush={() => onPushSubtask?.(sub.id)} onCopyTask={onCopyTask}
        onTextChange={value => onSubtaskTextChange?.(sub.id, value)} parentText={text}
        sortable={getSubtaskSortable?.(sub.id, sub.text)} />)}
    </div>}
    {!isSubtask && history.length > 0 && <details className="task-earlier-steps">
      <summary>Earlier steps ({history.length})</summary>
      {history.map(sub => <TaskItem key={`${sub.sourceDate}-${sub.id}`} id={sub.id} text={sub.text} status={sub.status}
        isSubtask isOtherDate sourceDate={sub.sourceDate} moveTargetLabel={moveTargetLabel}
        onToggle={() => {}} onDelete={() => {}} onPush={() => {}} onTextChange={() => {}} parentText={text} />)}
    </details>}
    {!isSubtask && !isOtherDate && !closed && onAddSubtask && (selected || addingStep || subInput) && <div className="task-step-composer">
      <ParagraphInput ref={stepInputRef} className="task-text-input task-step-add-input" placeholder="Add a step…" aria-label={`New step for ${text}`}
        value={subInput} onChange={event => setSubInput(event.target.value)}
        onFocus={() => { setSelected(true); setAddingStep(true) }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); handleSubAdd() }
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setSubInput(''); setAddingStep(false); returnToTitle() }
        }} />
      {subInput.trim() && <button type="button" className="task-text-action" onClick={handleSubAdd} aria-label="Add step">Add</button>}
    </div>}
  </div>
}
