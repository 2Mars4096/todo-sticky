import { useEffect, useRef, useState } from 'react'
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { api } from '../api'
import type { FinishPromise, Task } from '../types'

export function deadlineLabel(by: string, today = new Date()) {
  const date = parseISO(by)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(by) || !isValid(date)) return { text: 'Invalid date', tone: '' }
  const days = differenceInCalendarDays(date, today)
  return days < 0 ? { text: `${-days} ${-days === 1 ? 'day' : 'days'} overdue`, tone: 'overdue' }
    : days === 0 ? { text: 'Today', tone: 'due' }
    : { text: format(date, 'EEE, MMM d'), tone: '' }
}

export function DeadlineBadge({ by, closed, onClick }: { by: string; closed: boolean; onClick: () => void }) {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setToday(new Date())
    const timer = setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const label = deadlineLabel(by, today)
  const text = closed && isValid(parseISO(by)) ? format(parseISO(by), 'EEE, MMM d') : label.text
  return closed
    ? <span className="deadline-badge" title={`Deadline: ${by}`}>{text}</span>
    : <button type="button" className={`deadline-badge ${label.tone}`} title={`Edit deadline: ${by}`} onClick={onClick}>{text}</button>
}

export function TaskFinish({ taskText, finish, selected, dateOpen, setDateOpen, status, onUpdate, onReview, settleLayout = update => update() }: {
  taskText: string; finish?: FinishPromise; selected: boolean; dateOpen: boolean; setDateOpen: (open: boolean) => void; status: Task['status']
  onUpdate: (patch: Partial<FinishPromise>) => void
  onReview: (decision: 'complete' | 'revise' | 'stop') => void
  settleLayout?: (update: () => void) => void
}) {
  const closed = status === 'done' || status === 'stopped'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [dateDraft, setDateDraft] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestionFailed, setSuggestionFailed] = useState(false)
  const editActive = useRef(false)
  const revising = useRef(false)
  const requestGeneration = useRef(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const outcomeTriggerRef = useRef<HTMLButtonElement>(null)
  const dateTriggerRef = useRef<HTMLDivElement>(null)

  // Suggestions belong to this title and never start merely because a row receives focus.
  useEffect(() => {
    requestGeneration.current += 1
    setSuggestion(''); setSuggesting(false); setSuggestionFailed(false)
    return () => { requestGeneration.current += 1 }
  }, [taskText])

  const returnToOutcome = () => requestAnimationFrame(() => outcomeTriggerRef.current?.focus())
  const startEdit = (revision = false) => {
    if (closed) return
    editActive.current = true
    revising.current = revision
    setDraft(finish?.doneWhen ?? '')
    setDateOpen(false)
    setEditing(true)
  }
  const saveOutcome = (restoreFocus = false) => {
    if (!editActive.current) return
    editActive.current = false
    const value = draft.trim() || undefined
    if (value !== (finish?.doneWhen?.trim() || undefined)) {
      if (revising.current) onReview('revise')
      onUpdate({ doneWhen: value, reviewReady: false })
    }
    revising.current = false
    settleLayout(() => setEditing(false))
    if (restoreFocus) returnToOutcome()
  }
  const cancelOutcome = () => {
    editActive.current = false
    revising.current = false
    requestGeneration.current += 1
    setSuggesting(false)
    setEditing(false)
    returnToOutcome()
  }
  const suggestOutcome = async () => {
    if (closed || draft.trim() || suggesting) return
    const generation = ++requestGeneration.current
    setSuggesting(true); setSuggestionFailed(false)
    try {
      const result = await api.llmBreakdown({ taskText, existingSubtasks: [], suggestFinish: true })
      const value = typeof result.finishSuggestion === 'string' ? result.finishSuggestion.trim().slice(0, 500) : ''
      if (!value) throw new Error('Empty suggestion')
      if (generation === requestGeneration.current) setSuggestion(value)
    } catch {
      if (generation === requestGeneration.current) setSuggestionFailed(true)
    } finally {
      if (generation === requestGeneration.current) setSuggesting(false)
    }
  }
  const useSuggestion = () => { setDraft(suggestion); textareaRef.current?.focus() }
  const openDate = () => {
    if (closed) return
    saveOutcome()
    setDateDraft(finish?.by ?? '')
    setDateOpen(true)
  }
  const closeDate = (restoreFocus = false) => {
    setDateOpen(false)
    if (restoreFocus) requestAnimationFrame(() => dateTriggerRef.current?.querySelector('button')?.focus())
  }
  const saveDate = () => {
    if (dateDraft && (!/^\d{4}-\d{2}-\d{2}$/.test(dateDraft) || !isValid(parseISO(dateDraft)))) return
    if ((dateDraft || undefined) !== finish?.by) onUpdate({ by: dateDraft || undefined })
    closeDate(true)
  }
  useEffect(() => { if (!selected || closed) setDateOpen(false) }, [selected, closed, setDateOpen])
  const changes = (finish?.deadlineChanges ?? []).filter(change => change.from !== null)

  return <div className="task-finish">
    {(finish?.doneWhen || (selected && !closed) || editing) && <div className="finish-field">
      <span className="finish-field-label">Outcome</span>
      <div className="finish-field-value">
        {editing ? <div className="outcome-editor" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) saveOutcome()
        }}>
          <textarea ref={textareaRef} autoFocus aria-label="Outcome" value={draft} maxLength={500} rows={2}
            placeholder="What would be enough?"
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'Tab' && !event.shiftKey && !draft.trim() && suggestion) { event.preventDefault(); useSuggestion() }
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveOutcome(true) }
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelOutcome() }
            }} />
          <div className="outcome-editor-tools">
            <small>Enter saves · Esc cancels</small>
            {!draft.trim() && <button type="button" onClick={() => void suggestOutcome()} aria-disabled={suggesting}>
              {suggesting ? 'Suggesting…' : suggestionFailed ? 'Retry suggestion' : 'Suggest outcome'}
            </button>}
          </div>
          {!draft.trim() && suggestion && <div className="outcome-suggestion">
            <small>AI suggestion · not saved</small>
            <p>{suggestion}</p>
            <button type="button" onClick={useSuggestion}>Use suggestion</button>
            <small>or press Tab in the outcome field</small>
          </div>}
          {suggesting && <span className="task-inline-status" role="status">Preparing a suggestion. You can keep writing.</span>}
          {suggestionFailed && <span className="task-inline-status" role="status">Suggestion unavailable. You can write your own outcome.</span>}
        </div> : closed
          ? <span className="outcome-value">{finish?.doneWhen}</span>
          : <button ref={outcomeTriggerRef} type="button" className={`outcome-value${finish?.doneWhen ? '' : ' optional'}`}
              aria-label={finish?.doneWhen ? 'Edit outcome' : 'Add outcome'} onClick={() => startEdit()}>
              {finish?.doneWhen || 'Add outcome (optional)'}
            </button>}
      </div>
    </div>}
    {(finish?.by || (selected && !closed)) && <div className="finish-field">
      <span className="finish-field-label">Due</span>
      <div className="finish-field-value" ref={dateTriggerRef}>
        {dateOpen && selected && !closed ? <div className="due-edit" role="group" aria-label="Edit due date"
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDate(true) }
          }}>
          <input autoFocus type="date" aria-label="Due date" value={dateDraft} onChange={event => setDateDraft(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveDate() } }} />
          <div className="due-edit-actions">
            <button type="button" className="primary" onClick={saveDate}>Save date</button>
            <button type="button" onClick={() => closeDate(true)}>Cancel</button>
            {dateDraft && <button type="button" onClick={() => setDateDraft('')}>Clear date</button>}
          </div>
          {changes.length > 0 && <details className="deadline-history"><summary>Deadline history</summary>
            <small>Original: {finish?.originalBy}. Changed {changes.length} {changes.length === 1 ? 'time' : 'times'}.</small>
          </details>}
        </div> : finish?.by ? <DeadlineBadge by={finish.by} closed={closed} onClick={openDate} />
          : <button type="button" className="due-empty" onClick={openDate}>Add due date</button>}
      </div>
    </div>}
    {finish?.reviewReady && !closed && !editing && (selected ? <div className="finish-review" role="group" aria-label="Review finish promise">
      <span>Outcome achieved?</span>
      <button type="button" className="primary" onClick={() => onReview('complete')}>Complete</button>
      <button type="button" onClick={() => startEdit(true)}>Revise</button>
      <button type="button" onClick={() => onReview('stop')}>Stop</button>
    </div> : <small className="review-hint">Ready to review</small>)}
  </div>
}
