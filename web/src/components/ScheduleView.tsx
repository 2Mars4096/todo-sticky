import { useEffect, useId, useRef, useState } from 'react'
import { format } from 'date-fns'
import { api } from '../api'
import { aiErrorMessage } from '../aiErrors'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { minutesOfDay, validUnavailable, type UnavailableTime, planningTaskKey, validateDayPlan, type DayPlan, type PlannedBlock, type PlanningContext } from '../taskPlanning'
import type { AggregatedTask, AppSettings } from '../types'
import '../styles/day-planning.css'

interface Props {
  date: string
  tasks: AggregatedTask[]
  tasksLoading: boolean
  machines: AppSettings['machines']
  onApply: (schedule: PlannedBlock[], date: string, taskKey: string) => void
  onClose: () => void
}

export function ScheduleView({ date, tasks, tasksLoading, machines, onApply, onClose }: Props) {
  const dialogRef = useDialogFocus(onClose)
  const titleId = useId()
  const [preferences] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem('todo-sticky-planning-preferences-v1') || '{}')
      return { start: minutesOfDay(value.start) !== null ? value.start as string : '09:00', end: minutesOfDay(value.end) !== null ? value.end as string : '17:00', machines: Array.isArray(value.machines) ? value.machines.filter((name: unknown) => typeof name === 'string') as string[] : [] }
    } catch { return { start: '09:00', end: '17:00', machines: [] } }
  })
  const [start, setStart] = useState(preferences.start)
  const [end, setEnd] = useState(preferences.end)
  const [selectedMachines, setSelectedMachines] = useState<string[]>(preferences.machines)
  const [unavailable, setUnavailable] = useState<UnavailableTime[]>([])
  const [estimates, setEstimates] = useState<Record<string, number>>({})
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false)
  const proposalHeading = useRef<HTMLHeadingElement>(null)
  const [preferenceError, setPreferenceError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<{ result: DayPlan; context: PlanningContext; taskKey: string } | null>(null)
  const generationRef = useRef(0)
  useEffect(() => () => { generationRef.current += 1 }, [])

  const eligible = tasks.filter(task => task.status !== 'done' && task.status !== 'stopped')
  const taskKey = planningTaskKey(tasks)
  const selected = machines.filter(machine => selectedMachines.includes(machine.name))
  const constraintsKey = JSON.stringify({ unavailable, estimates })
  const contextChanged = proposal && (proposal.taskKey !== taskKey || proposal.context.date !== date
    || proposal.context.start !== start || proposal.context.end !== end
    || JSON.stringify({ unavailable: proposal.context.unavailable, estimates: proposal.context.estimates }) !== constraintsKey
    || JSON.stringify(proposal.context.machines) !== JSON.stringify(selected))
  const startMinute = minutesOfDay(start)
  const endMinute = minutesOfDay(end)
  const validTimes = startMinute !== null && endMinute !== null && endMinute > startMinute && validUnavailable(unavailable)
  const scheduledIds = new Set(proposal?.result.schedule.map(block => block.taskId))
  const deferred = eligible.filter(task => !scheduledIds.has(task.id))

  useEffect(() => {
    if (!proposal) return
    proposalHeading.current?.scrollIntoView({ block: 'start' })
    proposalHeading.current?.focus({ preventScroll: true })
  }, [proposal])

  const generate = async () => {
    if (tasksLoading || !validTimes || !eligible.length) return
    const generation = ++generationRef.current
    const context: PlanningContext = { date, start, end, tasks, machines: selected, unavailable, estimates }
    try { localStorage.setItem('todo-sticky-planning-preferences-v1', JSON.stringify({ start, end, machines: selectedMachines })); setPreferenceError('') }
    catch { setPreferenceError('These preferences could not be remembered on this device.') }
    setLoading(true)
    setError(null)
    setProposal(null)
    try {
      const result = await api.llmSchedule({
        tasks: eligible.map((task, order) => ({ ...task, planning: { preferenceOrder: order + 1, maximumMinutes: estimates[task.id] ?? null, unavailable } })), machines: selected, dateStr: date, availableStart: start, availableEnd: end,
      })
      if (generation !== generationRef.current) return
      const validated = validateDayPlan(result, context)
      setAdjustmentsOpen(false)
      setProposal({ result: validated, context, taskKey })
    } catch (cause) {
      if (generation !== generationRef.current) return
      setError(aiErrorMessage(cause, 'Could not generate a plan. Try again; your tasks have not changed.'))
    } finally {
      if (generation === generationRef.current) setLoading(false)
    }
  }

  return (
    <div className="settings-overlay day-plan-overlay" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="day-plan-panel" onClick={event => event.stopPropagation()}>
        <header className="day-plan-header">
          <div><h2 id={titleId}>Plan day</h2><p>{format(new Date(`${date}T12:00:00`), 'EEE, MMM d, yyyy')}</p></div>
          <button onClick={onClose} aria-label="Close day plan">✕</button>
        </header>
        <div className="day-plan-body">
          <form className="day-plan-options" onSubmit={event => { event.preventDefault(); void generate() }}>
            <fieldset disabled={loading}>
              <legend>Your available time</legend>
              <div className="day-plan-times">
                <label>From<input type="time" value={start} onChange={event => setStart(event.target.value)} required /></label>
                <label>Until<input type="time" value={end} onChange={event => setEnd(event.target.value)} required /></label>
              </div>
              {!validTimes && <p className="day-plan-error">Each end time must be later than its start time.</p>}
            </fieldset>
            <details className="planning-adjustments" open={adjustmentsOpen} onToggle={event => setAdjustmentsOpen(event.currentTarget.open)}>
              <summary>Adjust task time & breaks</summary>
              <fieldset disabled={loading}>
                <legend>Time budget per task</legend>
                <p className="day-plan-hint">Auto lets AI estimate. List order guides priority.</p>
                {eligible.map(task => <label className="planning-estimate" key={task.id}>
                  <span>{task.text}</span><select aria-label={`Time budget for ${task.text}`} value={estimates[task.id] ?? ''} onChange={event => setEstimates(current => {
                    const next = { ...current }; if (event.target.value) next[task.id] = Number(event.target.value); else delete next[task.id]; return next
                  })}><option value="">Auto</option>{[15, 30, 45, 60, 90, 120, 180, 240].map(minutes => <option key={minutes} value={minutes}>{minutes} min</option>)}</select>
                </label>)}
              </fieldset>
              <fieldset disabled={loading}>
                <legend>Unavailable time</legend>
                {unavailable.map((period, index) => <div className="planning-break" key={index}>
                  <input type="time" aria-label={`Break ${index + 1} start`} value={period.start} onChange={event => setUnavailable(current => current.map((entry, i) => i === index ? { ...entry, start: event.target.value } : entry))} />
                  <span>to</span><input type="time" aria-label={`Break ${index + 1} end`} value={period.end} onChange={event => setUnavailable(current => current.map((entry, i) => i === index ? { ...entry, end: event.target.value } : entry))} />
                  <button type="button" aria-label={`Remove break ${index + 1}`} onClick={() => setUnavailable(current => current.filter((_, i) => i !== index))}>×</button>
                </div>)}
                <button type="button" disabled={unavailable.length >= 6} onClick={() => setUnavailable(current => [...current, { start: '12:00', end: '13:00' }])}>Add break</button>
              </fieldset>
            </details>
            {preferenceError && <p role="status" className="day-plan-hint">{preferenceError}</p>}
            {machines.length ? (
              <fieldset disabled={loading} className="day-plan-machines">
                <legend>Available machines <span>(optional)</span></legend>
                {machines.map(machine => (
                  <label key={machine.name}>
                    <input type="checkbox" checked={selectedMachines.includes(machine.name)} onChange={event => setSelectedMachines(current => event.target.checked
                      ? [...current, machine.name] : current.filter(name => name !== machine.name))} />
                    <span>{machine.name}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <button type="submit" className="day-plan-generate" disabled={loading || tasksLoading || !validTimes || !eligible.length}>
              {loading ? 'Generating proposal…' : proposal ? 'Generate another proposal' : 'Generate proposal'}
            </button>
          </form>

          {loading && <p role="status">Building a proposed plan. Your tasks stay editable after you close this view.</p>}
          {tasksLoading && <p role="status">Refreshing tasks. Wait before applying this proposal.</p>}
          {error && <p className="day-plan-error" role="alert">{error}</p>}
          {proposal && (
            <section aria-label="Proposed plan" className="day-plan-proposal">
              <h3 ref={proposalHeading} tabIndex={-1}>{proposal.result.schedule.length} proposed {proposal.result.schedule.length === 1 ? 'block' : 'blocks'}</h3>
              {proposal.result.plan && <p>{proposal.result.plan}</p>}
              <ol className="day-plan-timeline">
                {proposal.result.schedule.map((block, index) => (
                  <li key={`${block.taskId}:${block.time}:${index}`}>
                    <span className="day-plan-time">{block.time}–{block.endTime}</span>
                    <div><strong>{block.parentTask}</strong><p>{block.action}</p>
                      {block.assignedTo !== 'human' && <span className="day-plan-assignee">{block.assignedTo}</span>}
                    </div>
                  </li>
                ))}
              </ol>
              {deferred.length > 0 && <details><summary>{deferred.length} {deferred.length === 1 ? 'task' : 'tasks'} left unscheduled</summary>
                <ul>{deferred.map(task => <li key={task.id}>{task.text}</li>)}</ul>
              </details>}
              <p className="day-plan-hint">Apply adds these blocks to your tasks and replaces untouched suggestions from this date’s previous plan. Edited, started and older untracked steps stay. You can undo the change.</p>
              {contextChanged && <p className="day-plan-error" role="status">Tasks or planning details changed. Generate a fresh proposal before applying.</p>}
            </section>
          )}
        </div>
        <footer className="day-plan-actions">
          <button onClick={onClose}>{proposal ? 'Discard' : 'Cancel'}</button>
          <button className="primary" disabled={!proposal || Boolean(contextChanged) || loading || tasksLoading}
            onClick={() => { if (proposal && !contextChanged && !tasksLoading) onApply(proposal.result.schedule, proposal.context.date, proposal.taskKey) }}>
            Apply plan
          </button>
        </footer>
      </div>
    </div>
  )
}
