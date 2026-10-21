import { useEffect, useRef, useState } from 'react'
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { api } from '../api'
import type { FinishPromise, Task } from '../types'

export function deadlineLabel(by: string, today = new Date()) {
  const date = parseISO(by)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(by) || !isValid(date)) return { text: 'Invalid date', tone: '' }
  const days = differenceInCalendarDays(date, today)
  return days < 0 ? { text: `${-days}d overdue`, tone: 'overdue' }
    : days === 0 ? { text: 'Due today', tone: 'due' }
    : { text: `By ${format(date, days < 7 ? 'EEE' : 'MMM d')}`, tone: '' }
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
  return <button type="button" className={`deadline-badge ${closed ? '' : label.tone}`} title={`Deadline: ${by}`} onClick={onClick}>{closed ? `By ${by}` : label.text}</button>
}

export function TaskFinish({ taskText, finish, selected, dateOpen, setDateOpen, status, onUpdate, onReview }: {
  taskText: string; finish?: FinishPromise; selected: boolean; dateOpen: boolean; setDateOpen: (open: boolean) => void; status: Task['status']
  onUpdate: (patch: Partial<FinishPromise>) => void
  onReview: (decision: 'complete' | 'revise' | 'stop') => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestionFailed, setSuggestionFailed] = useState(false)
  const cached = useRef<{ text: string; request: Promise<string> } | null>(null)
  useEffect(() => {
    if (!editing) return
    let active = true
    if (cached.current?.text !== taskText) {
      setSuggestion('')
      const request = api.llmBreakdown({ taskText, existingSubtasks: [], suggestFinish: true })
        .then(result => {
          if (typeof result.finishSuggestion !== 'string' || !result.finishSuggestion.trim()) throw new Error('Empty suggestion')
          return result.finishSuggestion.trim().slice(0, 500)
        })
      cached.current = { text: taskText, request }
    }
    setSuggesting(true)
    setSuggestionFailed(false)
    const pending = cached.current
    pending.request.then(value => { if (active) setSuggestion(value) }, () => {
      if (cached.current === pending) cached.current = null
      if (active) setSuggestionFailed(true)
    }).finally(() => { if (active) setSuggesting(false) })
    return () => { active = false }
  }, [editing, taskText])
  const cancel = useRef(false)
  const closed = status === 'done' || status === 'stopped'
  const startEdit = () => { cancel.current = false; setDraft(finish?.doneWhen ?? ''); setDateOpen(false); setEditing(true) }
  const save = () => {
    if (!cancel.current) onUpdate({ doneWhen: draft.trim() || undefined, reviewReady: false })
    setEditing(false)
  }
  useEffect(() => { if (dateOpen) setEditing(false) }, [dateOpen])
  useEffect(() => { if (!selected) setDateOpen(false) }, [selected])
  const changes = (finish?.deadlineChanges ?? []).filter(change => change.from !== null)
  const revise = () => { onReview('revise'); startEdit(); setDateOpen(false) }
  const reviewVisible = selected && finish?.reviewReady && !closed
  return <div className="task-finish" onClick={event => event.stopPropagation()}>
    {editing ? <label className="finish-editor">What would be enough?
      <textarea autoFocus aria-label="What would be enough?" value={draft} maxLength={500} rows={3}
        placeholder={suggestion || (suggesting ? 'Thinking of a small finish…' : 'Describe one result you could show or check.')}
        title={!draft && suggestion ? 'Press Tab to accept this suggestion, or type your own words.' : undefined}
        onChange={event => setDraft(event.target.value)} onBlur={save}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Tab' && !event.shiftKey && !draft.trim() && suggestion) { event.preventDefault(); setDraft(suggestion); return }
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
          if (event.key === 'Escape') { event.stopPropagation(); cancel.current = true; setEditing(false) }
        }} />
      {!draft && suggestion && <small className="suggestion-hint">Tab to accept · or type your own</small>}
      {suggestionFailed && !draft && <small className="suggestion-hint">Suggestion unavailable. You can still write your own.</small>}
    </label> : finish?.doneWhen ? <button className="finish-sentence" onClick={startEdit} title="Edit finish criterion">Enough: {finish.doneWhen}</button> : null}
    {selected && !closed && !editing && !dateOpen && <div className="finish-tools">
      {!finish?.doneWhen && !editing && <button onClick={startEdit}>+ What would be enough?</button>}
      {!finish?.by && <button onClick={() => setDateOpen(!dateOpen)}>+ Set deadline</button>}
    </div>}
    {dateOpen && selected && <div className="deadline-editor">
      <label>By <input type="date" aria-label="Finish deadline" value={finish?.by ?? ''} onChange={event => {
        const value = event.target.value
        if (!value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)))) onUpdate({ by: value || undefined })
      }} onKeyDown={event => { if (event.key === 'Escape' || event.key === 'Enter') setDateOpen(false) }} /></label>
      {finish?.by && <button onClick={() => { onUpdate({ by: undefined }); setDateOpen(false) }}>Remove date</button>}
      {!closed && finish?.by && deadlineLabel(finish.by).tone === 'overdue' && <><button onClick={revise}>Reduce scope</button><button onClick={() => { onReview('stop'); setDateOpen(false) }}>Stop task</button></>}
      {changes.length > 0 && <small>Original: {finish?.originalBy}. Rescheduled {changes.length} {changes.length === 1 ? 'time' : 'times'}.</small>}
    </div>}
    {finish?.reviewReady && !closed && (reviewVisible ? <div className="finish-review" role="group" aria-label="Review finish promise">
      <span>Is this enough to call it finished?</span>
      <button onClick={() => onReview('complete')}>Complete</button><button onClick={revise}>Revise</button><button onClick={() => onReview('stop')}>Stop</button>
    </div> : <small className="review-hint">Ready to review</small>)}
  </div>
}
