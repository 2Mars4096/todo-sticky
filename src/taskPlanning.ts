import type { AggregatedTask, AppSettings } from './types'

export interface PlanningContext {
  date: string
  start: string
  end: string
  machines: AppSettings['machines']
  tasks: AggregatedTask[]
  unavailable?: UnavailableTime[]
  estimates?: Record<string, number>
}

export interface PlannedBlock {
  taskId: string
  parentTask: string
  time: string
  endTime: string
  action: string
  assignedTo: string
}

export interface DayPlan {
  plan: string
  schedule: PlannedBlock[]
}

export function minutesOfDay(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export function planningTaskKey(tasks: AggregatedTask[]): string {
  return JSON.stringify(tasks)
}

/** Provider output is a proposal, never a trusted task mutation. */
export function validateDayPlan(raw: unknown, context: PlanningContext): DayPlan {
  if (!raw || typeof raw !== 'object') throw new Error('The provider returned an unreadable plan. Try again.')
  const result = raw as Record<string, unknown>
  if (!Array.isArray(result.schedule) || result.schedule.length === 0 || result.schedule.length > 100) {
    throw new Error('The provider did not return a usable set of time blocks. Try a smaller task list or a longer time window.')
  }
  const availableStart = minutesOfDay(context.start)
  const availableEnd = minutesOfDay(context.end)
  if (availableStart === null || availableEnd === null || availableEnd <= availableStart) {
    throw new Error('Choose an end time later than the start time.')
  }
  if (!validUnavailable(context.unavailable ?? [])) throw new Error('Check your unavailable times.')
  const eligible = context.tasks.filter(task => task.status !== 'done' && task.status !== 'stopped')
  const assignees = new Set(['human', ...context.machines.map(machine => machine.name)])
  const schedule = result.schedule.map((value): PlannedBlock => {
    if (!value || typeof value !== 'object') throw new Error('A proposed block is incomplete. Generate another plan.')
    const entry = value as Record<string, unknown>
    const matchingText = typeof entry.parentTask === 'string'
      ? eligible.filter(task => task.text === entry.parentTask)
      : []
    const task = typeof entry.taskId === 'string'
      ? eligible.find(candidate => candidate.id === entry.taskId)
      : matchingText.length === 1 ? matchingText[0] : undefined
    if (!task) throw new Error('The plan refers to an unknown or ambiguous task. Generate another plan.')
    const time = typeof entry.time === 'string' ? entry.time : ''
    const endTime = typeof entry.endTime === 'string' ? entry.endTime : ''
    const start = minutesOfDay(time)
    const end = minutesOfDay(endTime)
    if (start === null || end === null || start < availableStart || end > availableEnd || end <= start) {
      throw new Error('The proposed times fall outside your available time. Generate another plan.')
    }
    if ((context.unavailable ?? []).some(period => start < minutesOfDay(period.end)! && end > minutesOfDay(period.start)!)) {
      throw new Error('The proposal uses unavailable time. Generate another plan.')
    }
    const action = typeof entry.action === 'string' ? entry.action.trim() : ''
    if (!action || action.length > 1000) throw new Error('A proposed block needs a short, concrete action. Generate another plan.')
    const assignedTo = typeof entry.assignedTo === 'string' ? entry.assignedTo : 'human'
    if (!assignees.has(assignedTo)) throw new Error('The plan uses a machine you did not select. Generate another plan.')
    return { taskId: task.id, parentTask: task.text, time, endTime, action, assignedTo }
  }).sort((a, b) => a.time.localeCompare(b.time) || a.endTime.localeCompare(b.endTime))

  const busyUntil = new Map<string, number>()
  for (const block of schedule) {
    const start = minutesOfDay(block.time)!
    if (start < (busyUntil.get(block.assignedTo) ?? 0)) {
      throw new Error('The plan contains overlapping blocks for the same person or machine. Generate another plan.')
    }
    busyUntil.set(block.assignedTo, minutesOfDay(block.endTime)!)
  }
  for (const [id, minutes] of Object.entries(context.estimates ?? {})) {
    const total = schedule.filter(block => block.taskId === id).reduce((sum, block) => sum + minutesOfDay(block.endTime)! - minutesOfDay(block.time)!, 0)
    if (!Number.isFinite(minutes) || minutes <= 0 || total > minutes) throw new Error('The proposal exceeds a task’s time budget. Adjust its estimate or generate another plan.')
  }
  return { plan: typeof result.plan === 'string' ? result.plan.slice(0, 1200) : '', schedule }
}

export function planStepPrefix(date: string): string {
  return `plan_${date}_`
}

export interface UnavailableTime { start: string; end: string }
export function validUnavailable(periods: UnavailableTime[]) {
  return periods.every(period => {
    const start = minutesOfDay(period.start), end = minutesOfDay(period.end)
    return start !== null && end !== null && end > start
  })
}
// Stored in generated IDs, so edited blocks remain recognizable across Markdown and sync.
export function planTextHash(text: string): string {
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619)
  return (hash >>> 0).toString(36)
}
export function isReplaceablePlanStep(step: { id: string; text: string; status: string; subtasks?: unknown[]; finish?: unknown }, date: string) {
  const hash = step.id.match(/_h([a-z0-9]+)$/)?.[1]
  return step.id.startsWith(planStepPrefix(date)) && step.status === 'todo' && !step.finish && !step.subtasks?.length && Boolean(hash) && hash === planTextHash(step.text)
}
