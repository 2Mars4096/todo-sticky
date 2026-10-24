import { useCallback, useEffect, useRef, useState } from 'react'
import type { GoalCategory, GoalItem, GoalsState } from '../types'

const STORAGE_KEY = 'todo-sticky-goals-v1'

const defaultState: GoalsState = {
  sidebarCollapsed: true,
  targets: [],
  recurring: [],
}

let itemCounter = 0

function newGoalId() {
  return `goal_${Date.now()}_${itemCounter++}`
}

function normalizeItem(item: unknown): GoalItem | null {
  if (!item || typeof item !== 'object') return null

  const candidate = item as Partial<GoalItem>
  if (typeof candidate.id !== 'string' || typeof candidate.text !== 'string') return null

  return {
    id: candidate.id,
    text: candidate.text,
    done: Boolean(candidate.done),
  }
}

function normalizeState(value: unknown): GoalsState {
  if (!value || typeof value !== 'object') return defaultState

  const candidate = value as Partial<GoalsState>
  const targets = Array.isArray(candidate.targets)
    ? candidate.targets.map(normalizeItem).filter((item): item is GoalItem => item !== null)
    : []
  const recurring = Array.isArray(candidate.recurring)
    ? candidate.recurring.map(normalizeItem).filter((item): item is GoalItem => item !== null)
    : []

  return {
    sidebarCollapsed: typeof candidate.sidebarCollapsed === 'boolean'
      ? candidate.sidebarCollapsed
      : defaultState.sidebarCollapsed,
    targets,
    recurring,
  }
}

interface StoredGoals {
  state: GoalsState
  unreadable: string | null
  readFailed: boolean
}

function readStoredState(): StoredGoals {
  if (typeof window === 'undefined') return { state: defaultState, unreadable: null, readFailed: false }
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: defaultState, unreadable: null, readFailed: false }
    const parsed = JSON.parse(raw)
    const normalized = normalizeState(parsed)
    const invalid = !parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || ['targets', 'recurring'].some(category => parsed[category] !== undefined
        && (!Array.isArray(parsed[category]) || parsed[category].some((item: unknown) => !normalizeItem(item))))
    return { state: normalized, unreadable: invalid ? raw : null, readFailed: false }
  } catch (error) {
    console.error('Failed to read long-term sidebar state:', error)
    return { state: defaultState, unreadable: raw, readFailed: raw === null }
  }
}

export function useGoals() {
  const [stored] = useState<StoredGoals>(() => readStoredState())
  const [state, setState] = useState<GoalsState>(stored.state)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(stored.unreadable
    ? 'Some saved goals could not be read. Their original data is being kept for recovery.' : null)
  const recoveryKey = useRef<string | null>(null)

  const save = useCallback(() => {
    if (stored.readFailed) {
      setStorageError('Saved goals could not be read. New edits are only in this window; existing saved data has not been replaced.')
      return
    }
    try {
      // A corrupt payload must never be replaced until its exact bytes have a
      // separate durable copy. A quota/write failure leaves the original intact.
      if (stored.unreadable !== null && recoveryKey.current === null) {
        const base = `${STORAGE_KEY}-recovery-${Date.now()}`
        let key = base
        for (let suffix = 1; window.localStorage.getItem(key) !== null; suffix += 1) key = `${base}-${suffix}`
        window.localStorage.setItem(key, stored.unreadable)
        recoveryKey.current = key
        setRecoveryNotice('Some saved goals could not be read. A recovery copy of the original data was saved on this device.')
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setStorageError(null)
    } catch (error) {
      console.error('Failed to persist long-term sidebar state:', error)
      setStorageError('Goals could not be saved. Your current edits stay in this window. Retry when storage is available.')
    }
  }, [state, stored])

  useEffect(() => {
    save()
  }, [save])

  const addGoal = useCallback((category: GoalCategory, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    setState(prev => ({
      ...prev,
      [category]: [
        ...prev[category],
        {
          id: newGoalId(),
          text: trimmed,
          done: false,
        },
      ],
    }))
  }, [])

  const updateGoal = useCallback((category: GoalCategory, goalId: string, text: string) => {
    const trimmed = text.trim()

    setState(prev => ({
      ...prev,
      [category]: trimmed
        ? prev[category].map(goal => (
          goal.id === goalId
            ? { ...goal, text: trimmed }
            : goal
        ))
        : prev[category].filter(goal => goal.id !== goalId),
    }))
  }, [])

  const deleteGoal = useCallback((category: GoalCategory, goalId: string) => {
    setState(prev => ({
      ...prev,
      [category]: prev[category].filter(goal => goal.id !== goalId),
    }))
  }, [])

  const toggleGoal = useCallback((category: GoalCategory, goalId: string) => {
    setState(prev => ({
      ...prev,
      [category]: prev[category].map(goal => (
        goal.id === goalId
          ? { ...goal, done: !goal.done }
          : goal
      )),
    }))
  }, [])

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }))
  }, [])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => (
      prev.sidebarCollapsed === collapsed
        ? prev
        : { ...prev, sidebarCollapsed: collapsed }
    ))
  }, [])

  return {
    storageError, recoveryNotice, retrySave: stored.readFailed ? undefined : save,
    sidebarCollapsed: state.sidebarCollapsed,
    targets: state.targets,
    recurring: state.recurring,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoal,
    toggleSidebar,
    setSidebarCollapsed,
  }
}
