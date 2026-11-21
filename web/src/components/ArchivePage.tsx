import { ui } from '../interfaceLocale'
import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format, isValid, parseISO, startOfWeek } from 'date-fns'
import { readTaskArchive } from '../taskArchiveReader'
import { archiveRows, archiveSummary, searchArchive, type ArchiveRow } from '../taskArchive'
import { projectProgress } from '../projectPlanning'
import type { GoalItem, StarFocusMissionRecord } from '../types'
import '../styles/workflow.css'

const noGoals: GoalItem[]=[]
interface Props {
  goals?: GoalItem[]
  initialQuery?: string
  folder: string
  mode: 'search' | 'progress'
  date: string
  flush: () => Promise<void>
  missions: StarFocusMissionRecord[]
  onBack: () => void
  onOpen: (row: ArchiveRow) => Promise<void>
}
export function ArchivePage({ goals=noGoals, initialQuery = '', folder, mode, date, flush, missions, onBack, onOpen }: Props) {
  const [rows, setRows] = useState<ArchiveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState(initialQuery)
  const [project,setProject]=useState('')
  const [status, setStatus] = useState('all')
  const [limit, setLimit] = useState(40)
  const [period, setPeriod] = useState<'day' | 'week'>('day')
  const [selected, setSelected] = useState(date)
  const [opening, setOpening] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const hasFilters = Boolean((mode === 'search' && query.trim()) || project || status !== 'all')
  function resetFilters() {
    setQuery('')
    setProject('')
    setStatus('all')
    searchInput.current?.focus({preventScroll:true})
  }
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
      .then(data => { if (!disposed) { setRows(archiveRows(data.dates,goals)); setUnavailable(data.unavailableFiles?.length ?? 0) } })
      .catch(cause => { if (!disposed) setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { if (!disposed) setLoading(false) })
    return () => { disposed = true }
  }, [attempt, folder, goals])
  useEffect(() => setLimit(40), [query, status, selected, period, project])
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(selected) && isValid(parseISO(selected))
  const base = new Date(`${validDate ? selected : date}T12:00:00`)
  const from = format(period === 'week' ? startOfWeek(base, { weekStartsOn: 1 }) : base, 'yyyy-MM-dd')
  const until = period === 'week' ? format(addDays(new Date(`${from}T12:00:00`), 6), 'yyyy-MM-dd') : from
  const summary = useMemo(() => archiveSummary(rows, from, until,project||undefined), [rows, from, until,project])
  const results = mode === 'search' ? searchArchive(project?rows.filter(row=>row.goalId===project):rows, query, status) : searchArchive(summary.roots, '', status)
  const sessions = missions.filter(mission => {
    const key = format(new Date(mission.completedAt), 'yyyy-MM-dd')
    return key >= from && key <= until
  })
  const open = async (row: ArchiveRow) => {
    setOpening(true); setError('')
    try { await onOpen(row) } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setOpening(false) }
  }
  return <section className="archive-page" aria-label={mode === 'search' ? ui("Search history") : ui("Progress")} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onBack() }
  }}>
    <header className="archive-heading"><button onClick={onBack}>{ui("‹ Tasks")}</button>
      <h2 ref={heading} tabIndex={-1}>{mode === 'search' ? ui("Search") : ui("Progress")}</h2>
      <button disabled={loading} onClick={() => setAttempt(value => value + 1)} aria-label={ui("Refresh history")} title={ui("Refresh history")}>↻</button>
    </header>
    <div className="archive-controls">
      {mode === 'search' ? <input ref={searchInput} type="search" aria-label={ui("Search tasks and steps")} placeholder={ui("Search tasks and steps")} value={query} onChange={event => setQuery(event.target.value)} />
        : <div className="progress-period"><input ref={searchInput} type="date" aria-label={ui("Progress date")} value={selected} onChange={event => setSelected(event.target.value)} />
          <select aria-label={ui("Progress period")} value={period} onChange={event => setPeriod(event.target.value as 'day' | 'week')}><option value="day">{ui("Day")}</option><option value="week">{ui("Week")}</option></select></div>}
      {goals.length>0&&<select className="archive-project-filter" aria-label={ui("Project filter")} value={project} onChange={event=>setProject(event.target.value)}><option value="">{ui("All projects")}</option>{goals.map(goal=><option key={goal.id} value={goal.id}>{goal.text.split('\n')[0]}</option>)}</select>}
      <select aria-label={ui("Task status filter")} value={status} onChange={event => setStatus(event.target.value)}>
        <option value="all">{ui("All states")}</option><option value="open">{ui("Unfinished")}</option><option value="done">{ui("Completed")}</option><option value="stopped">{ui("Stopped")}</option>
      </select>
    </div>
    <div className="archive-scroll">
      {mode === 'progress' && !validDate && <p role="status">{ui("Choose a date to view progress.")}</p>}
      {loading && <p role="status">{ui("Loading history…")}</p>}
      {error && <p role="alert" className="workflow-error">{error} <button disabled={loading} onClick={() => setAttempt(value => value + 1)}>{ui("Retry")}</button></p>}
      {unavailable > 0 && <p role="status">{ui("Partial history: {0} {1} unavailable.", [unavailable, unavailable === 1 ? ui("file is") : ui("files are")])}</p>}
      {!loading && !error && validDate && mode === 'progress' && <section className="progress-summary" aria-label={ui("Progress summary")}>
        <p className="archive-meta">{ui("{0} · by task list date", [from === until ? from : ui("{0} to {1}", [from, until])])}</p>
        <p><strong>{ui("{0} completed", [summary.done])}</strong> · {summary.open}{" " + ui("unfinished ·") + " "}{summary.stopped}{" " + ui("stopped")}</p>
        <progress aria-label={ui("Completed parent tasks")} value={summary.done} max={summary.roots.length || 1} />
        {project&&goals.find(goal=>goal.id===project)?.plan?.length ? <p>{ui("Project plan (all dates): {0}/{1} steps completed", [projectProgress(goals.find(goal=>goal.id===project)!,rows).completed, goals.find(goal=>goal.id===project)!.plan!.length])}</p>:null}
        <p>{ui("{0}/{1} steps completed", [summary.stepsDone, summary.stepsTotal])}</p>
        {!project && <p>{ui("{0} focus sessions · {1} planned minutes", [sessions.length, sessions.reduce((total, session) => total + session.durationMinutes, 0)])}</p>}
        <details><summary>{ui("About these totals")}</summary><p>{ui("Tasks are grouped by their list date, not the time they were completed. Steps are counted separately. Focus totals include only retained sessions and their planned duration.")}</p></details>
      </section>}
      {!loading && !error && (mode === 'search' || validDate) && <>
        {results.length ? <p className="archive-meta" role="status">{
          mode === 'search'
            ? (results.length === 1 ? ui("{0} match", [1]) : ui("{0} matches", [results.length]))
            : (results.length === 1 ? ui("{0} task", [1]) : ui("{0} tasks", [results.length]))
        }</p> : <div className="archive-empty">
          <p className="archive-meta" role="status">{mode === 'search' || hasFilters ? ui("No matching tasks.") : ui("No tasks on these dates.")}</p>
          {hasFilters && <button type="button" onClick={resetFilters}>{ui("Reset filters")}</button>}
        </div>}
        <ul className="archive-results">{results.slice(0, limit).map(row => <li key={`${row.date}:${row.task.id}`}>
          <button disabled={opening} onClick={() => void open(row)}>
            <span className="archive-result-title">{row.task.text || ui("Untitled task")}</span>
            {row.parents.length > 0 && <span className="archive-meta">{row.parents.join(' › ')}</span>}
            <span className="archive-meta">{row.date} · {{ done: ui("Completed"), todo: ui("To do"), partial: ui("In progress"), question: ui("Needs a decision"), stopped: ui("Stopped") }[row.task.status]}{row.task.finish?.by ? ' · ' + ui("Due {0}", [row.task.finish.by]) : ''}</span>
          </button>
        </li>)}</ul>
        {results.length > limit && <button onClick={() => setLimit(value => value + 40)}>{ui("Show more ({0})", [results.length - limit])}</button>}
      </>}
    </div>
  </section>
}
