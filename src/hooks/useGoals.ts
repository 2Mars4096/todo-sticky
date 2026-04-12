import { useCallback, useEffect, useState } from 'react'
import type { GoalCategory, GoalItem, GoalsState } from '../types'

const STORAGE_KEY = 'todo-sticky-goals-v1'

const defaultState: GoalsState = {
  sidebarCollapsed: false,
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
    sidebarCollapsed: Boolean(candidate.sidebarCollapsed),
    targets,
    recurring,
  }
}

function readStoredState(): GoalsState {
  if (typeof window === 'undefined') return defaultState

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    return normalizeState(JSON.parse(raw))
  } catch (error) {
    console.error('Failed to read long-term sidebar state:', error)
    return defaultState
  }
}

export function useGoals() {
  const [state, setState] = useState<GoalsState>(() => readStoredState())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to persist long-term sidebar state:', error)
    }
  }, [state])

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

  return {
    sidebarCollapsed: state.sidebarCollapsed,
    targets: state.targets,
    recurring: state.recurring,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoal,
    toggleSidebar,
  }
}
