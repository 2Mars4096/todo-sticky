import { useCallback, useEffect, useRef, useState } from 'react'
import type { GoalItem } from '../types'
import { nextOccurrence, readRoutineSchedules, routineTaskId, type Cadence, type RoutineSchedules } from '../routines'

export function useRoutines(folder: string, today: string, ready: boolean, goals: GoalItem[], ensure: (id: string, text: string, date: string) => Promise<boolean>) {
  const key = `todo-sticky-routines-v1:${folder}`
  const [state, setState] = useState<{ key: string; schedules: RoutineSchedules; error: string; readable: boolean }>({ key: '', schedules: Object.create(null), error: '', readable: false })
  const stateRef = useRef(state); stateRef.current = state
  const running = useRef(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    try { setState({ key, schedules: readRoutineSchedules(localStorage.getItem(key)), error: '', readable: true }) }
    catch (cause) { setState({ key, schedules: Object.create(null), error: String(cause), readable: false }) }
  }, [key, retry])
  const persist = useCallback((schedules: RoutineSchedules) => {
    const current = stateRef.current
    if (current.key !== key || !current.readable) return false
    try {
      localStorage.setItem(key, JSON.stringify(schedules))
      const next = { key, schedules: Object.assign(Object.create(null), schedules), error: '', readable: true }; stateRef.current = next; setState(next)
      return true
    } catch {
      setState(current => ({ ...current, error: 'Routine schedule was not saved. Try the change again when storage is available.' }))
      return false
    }
  }, [key])
  const configure = useCallback((id: string, cadence: Cadence | 'manual') => {
    const next: RoutineSchedules = Object.assign(Object.create(null), stateRef.current.schedules)
    next[id] = { cadence, anchor: today, paused: false, handledThrough: next[id]?.handledThrough && next[id].handledThrough! > today ? today : next[id]?.handledThrough }
    persist(next)
  }, [today, persist])
  const pause = useCallback((id: string) => {
    const current = stateRef.current.schedules[id]
    if (current) persist({ ...stateRef.current.schedules, [id]: { ...current, paused: !current.paused } })
  }, [persist])
  const skip = useCallback((id: string) => {
    const current = stateRef.current.schedules[id]
    const next = current && nextOccurrence(current, today)
    if (next) persist({ ...stateRef.current.schedules, [id]: { ...current, handledThrough: next } })
  }, [today, persist])
  useEffect(() => {
    if (!folder || !ready || state.key !== key || !state.readable || state.error || running.current) return
    const due = goals.find(goal => state.schedules[goal.id] && nextOccurrence(state.schedules[goal.id], today) === today)
    if (!due) return
    running.current = true
    const schedule = state.schedules[due.id]
    void ensure(routineTaskId(due.id, today), due.text, today).then(saved => {
      // Date/folder navigation and edits to this schedule invalidate this completion.
      if (saved && stateRef.current.key === key && stateRef.current.schedules[due.id] === schedule) {
        persist({ ...stateRef.current.schedules, [due.id]: { ...schedule, handledThrough: today } })
      }
    }).catch(() => { /* The ordinary task save surface owns recovery. */ }).finally(() => {
      running.current = false
      // Re-evaluate additional due routines after this one has settled.
      setState(current => ({ ...current }))
    })
  }, [folder, ready, state, key, goals, today, ensure, persist])
  return { schedules: state.key === key ? state.schedules : Object.create(null), error: state.error, configure, pause, skip,
    retry: () => setRetry(value => value + 1), available: state.key === key && state.readable }
}
