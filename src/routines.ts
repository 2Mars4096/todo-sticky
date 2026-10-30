import { planTextHash } from './taskPlanning'
import { addDays, format, isValid, parseISO } from 'date-fns'

export type Cadence = 'daily' | 'weekdays' | 'weekly' | 'manual'
export interface RoutineSchedule { cadence: Cadence; anchor: string; handledThrough?: string; paused: boolean }
export type RoutineSchedules = Record<string, RoutineSchedule>
export function dateKeyValid(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))
}
export function readRoutineSchedules(raw: string | null): RoutineSchedules {
  if (!raw) return Object.create(null)
  const value = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Routine schedules need recovery. Existing schedules have been kept.')
  for (const entry of Object.values(value) as RoutineSchedule[]) {
    if (!entry || !['daily', 'weekdays', 'weekly', 'manual'].includes(entry.cadence) || !dateKeyValid(entry.anchor)
      || typeof entry.paused !== 'boolean' || (entry.handledThrough !== undefined && !dateKeyValid(entry.handledThrough))) {
      throw new Error('Routine schedules need recovery. Existing schedules have been kept.')
    }
  }
  return Object.assign(Object.create(null), value)
}
export function nextOccurrence(schedule: RoutineSchedule, today: string): string | null {
  if (schedule.paused || schedule.cadence === 'manual') return null
  let candidate = parseISO(today > schedule.anchor ? today : schedule.anchor)
  if (schedule.handledThrough && format(candidate, 'yyyy-MM-dd') <= schedule.handledThrough) candidate = addDays(parseISO(schedule.handledThrough), 1)
  const weekday = parseISO(schedule.anchor).getDay()
  for (let index = 0; index < 7; index++, candidate = addDays(candidate, 1)) {
    if (schedule.cadence === 'daily' || (schedule.cadence === 'weekdays' && candidate.getDay() !== 0 && candidate.getDay() !== 6)
      || (schedule.cadence === 'weekly' && candidate.getDay() === weekday)) return format(candidate, 'yyyy-MM-dd')
  }
  return null
}
export function routineTaskId(id: string, date: string) {
  // Goal IDs are normally short. Encode each code point without introducing Markdown delimiters.
  const encoded = Array.from(id).map(char => char.codePointAt(0)!.toString(16)).join('-')
  return `routine_${encoded.length <= 120 ? encoded : `${planTextHash(id)}_${planTextHash(Array.from(id).reverse().join(''))}_${id.length}`}_${date}`
}
