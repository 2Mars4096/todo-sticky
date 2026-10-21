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
  return <button type="button" className={`deadline-badge ${closed ? '' : label.tone}`} title={`Deadline: ${by}`} onClick={onClick}>{closed ? format(parseISO(by), 'EEE, MMM d') : label.text}</button>
}

export function TaskFinish({ taskText, finish, selected, dateOpen, setDateOpen, status, onUpdate, onReview }: {
  taskText: string; finish?: FinishPromise; selected: boolean; dateOpen: boolean; setDateOpen: (open: boolean) => void; status: Task['status']
  onUpdate: (patch: Partial<FinishPromise>) => void
  onReview: (decision: 'complete' | 'revise' | 'stop') => void
}) {
  const closed = status === 'done' || status === 'stopped'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestionFailed, setSuggestionFailed] = useState(false)
  const cached = useRef<{ text: string; request: Promise<string> } | null>(null)
  useEffect(() => {
    if (!selected || closed) return
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
  }, [selected, taskText, closed])
  const cancel = useRef(false)
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
    {(selected || finish?.doneWhen) && <div className="finish-field">
      <span className="finish-field-label">Outcome</span>
      <div className="finish-field-value">
        {editing ? <>
          <textarea autoFocus aria-label="Outcome" value={draft} maxLength={500} rows={3}
            placeholder={suggestion || (suggesting ? 'Suggesting an outcome…' : 'Describe a result you can show or check')}
            onChange={event => setDraft(event.target.value)} onBlur={save}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'Tab' && !event.shiftKey && !draft.trim() && suggestion) { event.preventDefault(); setDraft(suggestion); return }
              if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
              if (event.key === 'Escape') { event.stopPropagation(); cancel.current = true; setEditing(false) }
            }} />
          {!draft && suggestion && <small className="suggestion-hint">Tab to accept</small>}
        </> : <button className={`outcome-value${finish?.doneWhen ? '' : ' suggested'}`} aria-label="Edit outcome" onClick={startEdit}
          onKeyDown={event => {
            if (event.key === 'Tab' && !event.shiftKey && !finish?.doneWhen && suggestion) {
              event.preventDefault(); onUpdate({ doneWhen: suggestion, reviewReady: false })
            }
          }}>
          {finish?.doneWhen || suggestion || (suggesting ? 'Suggesting an outcome…' : 'Describe a result you can show or check')}
        </button>}
        {selected && suggestionFailed && !finish?.doneWhen && <small className="suggestion-hint">Suggestion unavailable. Write your own outcome.</small>}
      </div>
    </div>}
    {(selected || finish?.by) && <div className="finish-field">
      <span className="finish-field-label">Due</span>
      <div className="finish-field-value">
        {dateOpen && selected ? <div className="due-edit">
          <input autoFocus type="date" aria-label="Due date" value={finish?.by ?? ''} onChange={event => {
            const value = event.target.value
            if (!value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)))) onUpdate({ by: value || undefined })
          }} onKeyDown={event => { if (event.key === 'Escape' || event.key === 'Enter') setDateOpen(false) }} />
          {finish?.by && <button onClick={() => { onUpdate({ by: undefined }); setDateOpen(false) }}>Remove date</button>}
          {!closed && finish?.by && deadlineLabel(finish.by).tone === 'overdue' && <><button onClick={revise}>Revise outcome</button><button onClick={() => { onReview('stop'); setDateOpen(false) }}>Stop task</button></>}
          {changes.length > 0 && <small>Original: {finish?.originalBy}. Rescheduled {changes.length} {changes.length === 1 ? 'time' : 'times'}.</small>}
        </div> : finish?.by ? <DeadlineBadge by={finish.by} closed={closed} onClick={() => setDateOpen(true)} />
          : <button className="due-empty" onClick={() => setDateOpen(true)}>No date</button>}
      </div>
    </div>}
    {finish?.reviewReady && !closed && (reviewVisible ? <div className="finish-review" role="group" aria-label="Review finish promise">
      <span>Outcome achieved?</span>
      <button onClick={() => onReview('complete')}>Complete</button><button onClick={revise}>Revise</button><button onClick={() => onReview('stop')}>Stop</button>
    </div> : <small className="review-hint">Ready to review</small>)}
  </div>
}
