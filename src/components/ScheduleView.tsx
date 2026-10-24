import { useEffect, useId, useRef, useState } from 'react'
import { format } from 'date-fns'
import { api } from '../api'
import { aiErrorMessage } from '../aiErrors'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { minutesOfDay, planningTaskKey, validateDayPlan, type DayPlan, type PlannedBlock, type PlanningContext } from '../taskPlanning'
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
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<{ result: DayPlan; context: PlanningContext; taskKey: string } | null>(null)
  const generationRef = useRef(0)
  useEffect(() => () => { generationRef.current += 1 }, [])

  const eligible = tasks.filter(task => task.status !== 'done' && task.status !== 'stopped')
  const taskKey = planningTaskKey(tasks)
  const selected = machines.filter(machine => selectedMachines.includes(machine.name))
  const contextChanged = proposal && (proposal.taskKey !== taskKey || proposal.context.date !== date
    || proposal.context.start !== start || proposal.context.end !== end
    || JSON.stringify(proposal.context.machines) !== JSON.stringify(selected))
  const startMinute = minutesOfDay(start)
  const endMinute = minutesOfDay(end)
  const validTimes = startMinute !== null && endMinute !== null && endMinute > startMinute
  const scheduledIds = new Set(proposal?.result.schedule.map(block => block.taskId))
  const deferred = eligible.filter(task => !scheduledIds.has(task.id))

  const generate = async () => {
    if (tasksLoading || !validTimes || !eligible.length) return
    const generation = ++generationRef.current
    const context: PlanningContext = { date, start, end, tasks, machines: selected }
    setLoading(true)
    setError(null)
    setProposal(null)
    try {
      const result = await api.llmSchedule({
        tasks: eligible, machines: selected, dateStr: date, availableStart: start, availableEnd: end,
      })
      if (generation !== generationRef.current) return
      setProposal({ result: validateDayPlan(result, context), context, taskKey })
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
              {!validTimes && <p className="day-plan-error">Choose an end time later than the start time.</p>}
            </fieldset>
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
            ) : <p className="day-plan-hint">Planning for you. No machines configured.</p>}
            <button type="submit" className="day-plan-generate" disabled={loading || tasksLoading || !validTimes || !eligible.length}>
              {loading ? 'Generating proposal…' : proposal ? 'Generate another proposal' : 'Generate proposal'}
            </button>
          </form>

          {loading && <p role="status">Building a proposed plan. Your tasks stay editable after you close this view.</p>}
          {tasksLoading && <p role="status">Refreshing tasks. Wait before applying this proposal.</p>}
          {error && <p className="day-plan-error" role="alert">{error}</p>}
          {proposal && (
            <section aria-label="Proposed plan" className="day-plan-proposal">
              <h3>{proposal.result.schedule.length} proposed {proposal.result.schedule.length === 1 ? 'block' : 'blocks'}</h3>
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
              <p className="day-plan-hint">Apply adds these blocks to your tasks and replaces unfinished blocks from this date’s previous plan. You can undo the change.</p>
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
