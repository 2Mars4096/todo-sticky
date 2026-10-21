import { useEffect, useRef, useState } from 'react'
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
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

export function TaskFinish({ finish, selected, dateOpen, setDateOpen, status, onUpdate, onReview }: {
  finish?: FinishPromise; selected: boolean; dateOpen: boolean; setDateOpen: (open: boolean) => void; status: Task['status']
  onUpdate: (patch: Partial<FinishPromise>) => void
  onReview: (decision: 'complete' | 'revise' | 'stop') => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [dateDraft, setDateDraft] = useState(finish?.by ?? '')
  const cancel = useRef(false)
  const closed = status === 'done' || status === 'stopped'
  const startEdit = () => { cancel.current = false; setDraft(finish?.doneWhen ?? ''); setEditing(true) }
  const save = () => {
    if (!cancel.current) onUpdate({ doneWhen: draft.trim() || undefined, reviewReady: false })
    setEditing(false)
  }
  useEffect(() => { if (dateOpen) setDateDraft(finish?.by ?? '') }, [dateOpen, finish?.by])
  useEffect(() => { if (!selected) setDateOpen(false) }, [selected])
  const changes = (finish?.deadlineChanges ?? []).filter(change => change.from !== null)
  const revise = () => { onReview('revise'); startEdit(); setDateOpen(false) }
  const reviewVisible = selected && finish?.reviewReady && !closed
  return <div className="task-finish" onClick={event => event.stopPropagation()}>
    {editing ? <label className="finish-editor">Done when…
      <input autoFocus aria-label="Done when" value={draft} maxLength={500}
        onChange={event => setDraft(event.target.value)} onBlur={save}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
          if (event.key === 'Escape') { event.stopPropagation(); cancel.current = true; setEditing(false) }
        }} />
    </label> : finish?.doneWhen ? <button className="finish-sentence" onClick={startEdit} title="Edit finish criterion">Done when {finish.doneWhen}</button> : null}
    {selected && !closed && <div className="finish-tools">
      {!finish?.doneWhen && !editing && <button onClick={startEdit}>+ Define done</button>}
      {!finish?.by && <button onClick={() => setDateOpen(!dateOpen)}>+ Set deadline</button>}
      {finish?.reviewReady && !reviewVisible && <button onClick={() => onUpdate({ reviewReady: true })}>Ready to review</button>}
    </div>}
    {dateOpen && selected && <div className="deadline-editor">
      <label>By <input type="date" aria-label="Finish deadline" value={dateDraft} onChange={event => setDateDraft(event.target.value)} /></label>
      <button disabled={!dateDraft || !/^\d{4}-\d{2}-\d{2}$/.test(dateDraft) || !isValid(parseISO(dateDraft))} onClick={() => { onUpdate({ by: dateDraft }); setDateOpen(false) }}>Save date</button>
      {finish?.by && <button onClick={() => { onUpdate({ by: undefined }); setDateOpen(false) }}>Remove deadline</button>}
      {!closed && <><button onClick={revise}>Reduce scope</button><button onClick={() => { onReview('stop'); setDateOpen(false) }}>Stop task</button></>}
      <button onClick={() => setDateOpen(false)}>Cancel</button>
      {changes.length > 0 && <small>Original: {finish?.originalBy}. Rescheduled {changes.length} {changes.length === 1 ? 'time' : 'times'}.</small>}
    </div>}
    {finish?.reviewReady && !closed && (reviewVisible ? <div className="finish-review" role="group" aria-label="Review finish promise">
      <span>Does this meet your “Done when”?</span>
      <button onClick={() => onReview('complete')}>Complete</button><button onClick={revise}>Revise</button><button onClick={() => onReview('stop')}>Stop</button>
    </div> : <small className="review-hint">Ready to review</small>)}
  </div>
}
