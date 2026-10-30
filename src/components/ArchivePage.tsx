import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format, isValid, parseISO, startOfWeek } from 'date-fns'
import { readTaskArchive } from '../taskArchiveReader'
import { archiveRows, archiveSummary, searchArchive, type ArchiveRow } from '../taskArchive'
import type { StarFocusMissionRecord } from '../types'
import '../styles/workflow.css'

interface Props {
  initialQuery?: string
  folder: string
  mode: 'search' | 'progress'
  date: string
  flush: () => Promise<void>
  missions: StarFocusMissionRecord[]
  onBack: () => void
  onOpen: (row: ArchiveRow) => Promise<void>
}
export function ArchivePage({ initialQuery = '', folder, mode, date, flush, missions, onBack, onOpen }: Props) {
  const [rows, setRows] = useState<ArchiveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState('all')
  const [limit, setLimit] = useState(40)
  const [period, setPeriod] = useState<'day' | 'week'>('day')
  const [selected, setSelected] = useState(date)
  const [opening, setOpening] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const flushRef = useRef(flush); flushRef.current = flush
  useEffect(() => { if (mode === 'search') searchInput.current?.focus(); else heading.current?.focus() }, [mode])
  useEffect(() => {
    let disposed = false
    setLoading(true); setError('')
    const read = async () => {
      await flushRef.current()
      return readTaskArchive(folder)
    }
    read()
      .then(data => { if (!disposed) { setRows(archiveRows(data.dates)); setUnavailable(data.unavailableFiles?.length ?? 0) } })
      .catch(cause => { if (!disposed) setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { if (!disposed) setLoading(false) })
    return () => { disposed = true }
  }, [attempt, folder])
  useEffect(() => setLimit(40), [query, status, selected, period])
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(selected) && isValid(parseISO(selected))
  const base = new Date(`${validDate ? selected : date}T12:00:00`)
  const from = format(period === 'week' ? startOfWeek(base, { weekStartsOn: 1 }) : base, 'yyyy-MM-dd')
  const until = period === 'week' ? format(addDays(new Date(`${from}T12:00:00`), 6), 'yyyy-MM-dd') : from
  const summary = useMemo(() => archiveSummary(rows, from, until), [rows, from, until])
  const results = mode === 'search' ? searchArchive(rows, query, status) : searchArchive(summary.roots, '', status)
  const sessions = missions.filter(mission => {
    const key = format(new Date(mission.completedAt), 'yyyy-MM-dd')
    return key >= from && key <= until
  })
  const open = async (row: ArchiveRow) => {
    setOpening(true); setError('')
    try { await onOpen(row) } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setOpening(false) }
  }
  return <section className="archive-page" aria-label={mode === 'search' ? 'Search history' : 'Progress'} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onBack() }
  }}>
    <header className="archive-heading"><button onClick={onBack}>‹ Tasks</button>
      <h2 ref={heading} tabIndex={-1}>{mode === 'search' ? 'Search' : 'Progress'}</h2>
      <button disabled={loading} onClick={() => setAttempt(value => value + 1)} aria-label="Refresh history" title="Refresh history">↻</button>
    </header>
    <div className="archive-controls">
      {mode === 'search' ? <input ref={searchInput} type="search" aria-label="Search tasks and steps" placeholder="Search tasks and steps" value={query} onChange={event => setQuery(event.target.value)} />
        : <div className="progress-period"><input type="date" aria-label="Progress date" value={selected} onChange={event => setSelected(event.target.value)} />
          <select aria-label="Progress period" value={period} onChange={event => setPeriod(event.target.value as 'day' | 'week')}><option value="day">Day</option><option value="week">Week</option></select></div>}
      <select aria-label="Task status filter" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="all">All states</option><option value="open">Unfinished</option><option value="done">Completed</option><option value="stopped">Stopped</option>
      </select>
    </div>
    <div className="archive-scroll">
      {mode === 'progress' && !validDate && <p role="status">Choose a date to view progress.</p>}
      {loading && <p role="status">Loading history…</p>}
      {error && <p role="alert" className="workflow-error">{error} <button disabled={loading} onClick={() => setAttempt(value => value + 1)}>Retry</button></p>}
      {unavailable > 0 && <p role="status">Partial history: {unavailable} {unavailable === 1 ? 'file is' : 'files are'} unavailable.</p>}
      {!loading && !error && validDate && mode === 'progress' && <section className="progress-summary" aria-label="Progress summary">
        <p className="archive-meta">{from === until ? from : `${from} to ${until}`} · by task list date</p>
        <p><strong>{summary.done} completed</strong> · {summary.open} unfinished · {summary.stopped} stopped</p>
        <progress aria-label="Completed parent tasks" value={summary.done} max={summary.roots.length || 1} />
        <p>{summary.stepsDone}/{summary.stepsTotal} steps completed</p>
        <p>{sessions.length} focus sessions · {sessions.reduce((total, session) => total + session.durationMinutes, 0)} planned minutes</p>
        <details><summary>About these totals</summary><p>Tasks are grouped by their list date, not the time they were completed. Steps are counted separately. Focus totals include only retained sessions and their planned duration.</p></details>
      </section>}
      {!loading && !error && (mode === 'search' || validDate) && <>
        <p className="archive-meta" role="status">{results.length ? `${results.length} ${mode === 'search' ? 'matches' : 'tasks'}` : mode === 'search' ? 'No matching tasks.' : 'No tasks on these dates.'}</p>
        <ul className="archive-results">{results.slice(0, limit).map(row => <li key={`${row.date}:${row.task.id}`}>
          <button disabled={opening} onClick={() => void open(row)}>
            <span className="archive-result-title">{row.task.text || 'Untitled task'}</span>
            {row.parents.length > 0 && <span className="archive-meta">{row.parents.join(' › ')}</span>}
            <span className="archive-meta">{row.date} · {{ done: 'Completed', todo: 'To do', partial: 'In progress', question: 'Needs a decision', stopped: 'Stopped' }[row.task.status]}{row.task.finish?.by ? ` · Due ${row.task.finish.by}` : ''}</span>
          </button>
        </li>)}</ul>
        {results.length > limit && <button onClick={() => setLimit(value => value + 40)}>Show more ({results.length - limit})</button>}
      </>}
    </div>
  </section>
}
