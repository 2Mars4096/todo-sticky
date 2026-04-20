import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  StarFocusMissionRecord,
  StarFocusPhase,
  StarFocusSession,
  StarFocusState,
} from '../types'
import { api } from '../api'

const LEGACY_STORAGE_KEY = 'todo-sticky-star-focus-v1'
const DEFAULT_DURATION_MINUTES = 25
export const STAR_FOCUS_ARCHIVE_LIMIT_OPTIONS = [6, 12, 24] as const
export const DEFAULT_ARCHIVE_RETENTION_LIMIT = 12
export const STAR_FOCUS_DEBUG_TIME_SCALE_OPTIONS = [0.25, 0.5, 1, 2, 4, 8] as const

type StarFocusArchiveLimit = (typeof STAR_FOCUS_ARCHIVE_LIMIT_OPTIONS)[number]
type StarFocusDebugTimeScale = (typeof STAR_FOCUS_DEBUG_TIME_SCALE_OPTIONS)[number]

export const STAR_FOCUS_PHASES: { id: StarFocusPhase; label: string; cutoff: number }[] = [
  { id: 'ignition', label: 'Ignition', cutoff: 0.12 },
  { id: 'ascent', label: 'Ascent', cutoff: 0.44 },
  { id: 'heating', label: 'Heating', cutoff: 0.66 },
  { id: 'staging', label: 'Staging', cutoff: 0.82 },
  { id: 'orbit', label: 'Orbit', cutoff: 1 },
]

interface FocusTaskRef {
  id: string
  text: string
}

export interface StarFocusSnapshot {
  progress: number
  elapsedMs: number
  remainingMs: number
  phase: StarFocusPhase
  isPaused: boolean
}

interface StarFocusDebugClock {
  realNow: number
  simulatedNow: number
}

const defaultState: StarFocusState = {
  sidebarCollapsed: true,
  selectedTaskId: null,
  selectedTaskText: null,
  sessionDurationMinutes: DEFAULT_DURATION_MINUTES,
  archiveRetentionLimit: DEFAULT_ARCHIVE_RETENTION_LIMIT,
  activeSession: null,
  missionHistory: [],
  lastCompletedMissionId: null,
}

let missionCounter = 0

function newMissionId() {
  return `mission_${Date.now()}_${missionCounter++}`
}

function normalizeSession(value: unknown): StarFocusSession | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<StarFocusSession>

  if (
    typeof candidate.taskId !== 'string' ||
    typeof candidate.taskText !== 'string' ||
    typeof candidate.durationMinutes !== 'number' ||
    typeof candidate.startedAt !== 'number' ||
    typeof candidate.endsAt !== 'number' ||
    (candidate.pausedAt !== null && candidate.pausedAt !== undefined && typeof candidate.pausedAt !== 'number')
  ) {
    return null
  }

  return {
    taskId: candidate.taskId,
    taskText: candidate.taskText,
    durationMinutes: candidate.durationMinutes,
    startedAt: candidate.startedAt,
    endsAt: candidate.endsAt,
    pausedAt: typeof candidate.pausedAt === 'number' ? candidate.pausedAt : null,
  }
}

function normalizeMission(value: unknown): StarFocusMissionRecord | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<StarFocusMissionRecord>

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.taskId !== 'string' ||
    typeof candidate.taskText !== 'string' ||
    typeof candidate.durationMinutes !== 'number' ||
    typeof candidate.completedAt !== 'number' ||
    typeof candidate.vehicleCode !== 'string' ||
    typeof candidate.orbitIndex !== 'number' ||
    typeof candidate.orbitLabel !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    taskId: candidate.taskId,
    taskText: candidate.taskText,
    durationMinutes: candidate.durationMinutes,
    completedAt: candidate.completedAt,
    vehicleCode: candidate.vehicleCode,
    orbitIndex: candidate.orbitIndex,
    orbitLabel: candidate.orbitLabel,
  }
}

function isArchiveRetentionLimit(value: number): value is StarFocusArchiveLimit {
  return STAR_FOCUS_ARCHIVE_LIMIT_OPTIONS.includes(value as StarFocusArchiveLimit)
}

function normalizeArchiveRetentionLimit(value: unknown): StarFocusArchiveLimit {
  return typeof value === 'number' && isArchiveRetentionLimit(value)
    ? value
    : DEFAULT_ARCHIVE_RETENTION_LIMIT
}

function trimMissionHistory(history: StarFocusMissionRecord[], limit: number) {
  return history.slice(0, limit)
}

function syncLastCompletedMissionId(lastCompletedMissionId: string | null, history: StarFocusMissionRecord[]) {
  if (!lastCompletedMissionId) return null
  return history.some(mission => mission.id === lastCompletedMissionId)
    ? lastCompletedMissionId
    : null
}

function applyArchiveRetentionLimit(state: StarFocusState, archiveRetentionLimit: StarFocusArchiveLimit): StarFocusState {
  const missionHistory = trimMissionHistory(state.missionHistory, archiveRetentionLimit)

  return {
    ...state,
    archiveRetentionLimit,
    missionHistory,
    lastCompletedMissionId: syncLastCompletedMissionId(state.lastCompletedMissionId, missionHistory),
  }
}

function normalizeState(value: unknown): StarFocusState {
  if (!value || typeof value !== 'object') return defaultState

  const candidate = value as Partial<StarFocusState>
  const archiveRetentionLimit = normalizeArchiveRetentionLimit(candidate.archiveRetentionLimit)
  const missionHistory = Array.isArray(candidate.missionHistory)
    ? trimMissionHistory(
      candidate.missionHistory
        .map(normalizeMission)
        .filter((mission): mission is StarFocusMissionRecord => mission !== null),
      archiveRetentionLimit,
    )
    : []

  return {
    sidebarCollapsed: typeof candidate.sidebarCollapsed === 'boolean'
      ? candidate.sidebarCollapsed
      : defaultState.sidebarCollapsed,
    selectedTaskId: typeof candidate.selectedTaskId === 'string' ? candidate.selectedTaskId : null,
    selectedTaskText: typeof candidate.selectedTaskText === 'string' ? candidate.selectedTaskText : null,
    sessionDurationMinutes: typeof candidate.sessionDurationMinutes === 'number'
      ? candidate.sessionDurationMinutes
      : DEFAULT_DURATION_MINUTES,
    archiveRetentionLimit,
    activeSession: normalizeSession(candidate.activeSession),
    missionHistory,
    lastCompletedMissionId: syncLastCompletedMissionId(
      typeof candidate.lastCompletedMissionId === 'string' ? candidate.lastCompletedMissionId : null,
      missionHistory,
    ),
  }
}

function readLegacyState(): StarFocusState {
  if (typeof window === 'undefined') return defaultState

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return defaultState
    return normalizeState(JSON.parse(raw))
  } catch (error) {
    console.error('Failed to read legacy Star Focus state:', error)
    return defaultState
  }
}

function hasLegacyState() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(LEGACY_STORAGE_KEY) !== null
}

function clearLegacyState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

function phaseForProgress(progress: number): StarFocusPhase {
  return STAR_FOCUS_PHASES.find(phase => progress <= phase.cutoff)?.id ?? 'orbit'
}

function orbitLabelForIndex(index: number) {
  const labels = ['LEO', 'MEO', 'HEO']
  return labels[index % labels.length] || 'LEO'
}

function nextMissionOrbitIndex(history: StarFocusMissionRecord[]) {
  return history.reduce((maxOrbitIndex, mission) => (
    mission.orbitIndex > maxOrbitIndex ? mission.orbitIndex : maxOrbitIndex
  ), -1) + 1
}

function buildMissionRecord(
  session: StarFocusSession,
  history: StarFocusMissionRecord[],
  completedAt: number,
): StarFocusMissionRecord {
  const orbitIndex = nextMissionOrbitIndex(history)
  const missionNumber = orbitIndex + 1

  return {
    id: newMissionId(),
    taskId: session.taskId,
    taskText: session.taskText,
    durationMinutes: session.durationMinutes,
    completedAt,
    vehicleCode: `SF-${String(missionNumber).padStart(2, '0')}`,
    orbitIndex,
    orbitLabel: orbitLabelForIndex(orbitIndex),
  }
}

function completeState(state: StarFocusState, completedAt: number): StarFocusState {
  if (!state.activeSession) return state

  const mission = buildMissionRecord(state.activeSession, state.missionHistory, completedAt)

  return applyArchiveRetentionLimit({
    ...state,
    activeSession: null,
    selectedTaskId: state.activeSession.taskId,
    selectedTaskText: state.activeSession.taskText,
    missionHistory: [mission, ...state.missionHistory],
    lastCompletedMissionId: mission.id,
  }, state.archiveRetentionLimit)
}

function getSessionSnapshot(session: StarFocusSession, now: number): StarFocusSnapshot {
  const totalMs = Math.max(session.endsAt - session.startedAt, 1)
  const effectiveNow = session.pausedAt ?? now
  const elapsedMs = Math.max(0, Math.min(effectiveNow - session.startedAt, totalMs))
  const progress = elapsedMs / totalMs
  const remainingMs = Math.max(0, session.endsAt - effectiveNow)

  return {
    progress,
    elapsedMs,
    remainingMs,
    phase: phaseForProgress(progress),
    isPaused: session.pausedAt !== null,
  }
}

function isDebugTimeScale(value: number): value is StarFocusDebugTimeScale {
  return STAR_FOCUS_DEBUG_TIME_SCALE_OPTIONS.includes(value as StarFocusDebugTimeScale)
}

function normalizeDebugTimeScale(value: number): StarFocusDebugTimeScale {
  return isDebugTimeScale(value) ? value : 1
}

function getSimulatedMissionNow(clock: StarFocusDebugClock, realNow: number, timeScale: number) {
  return clock.simulatedNow + Math.max(0, realNow - clock.realNow) * timeScale
}

export function useStarFocus(tasks: FocusTaskRef[]) {
  const [state, setState] = useState<StarFocusState>(defaultState)
  const [now, setNow] = useState(() => Date.now())
  const [restoredSession, setRestoredSession] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [debugTimeScale, setDebugTimeScaleState] = useState<StarFocusDebugTimeScale>(1)
  const migratingLegacyRef = useRef(false)
  const debugClockRef = useRef<StarFocusDebugClock>({
    realNow: Date.now(),
    simulatedNow: Date.now(),
  })

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      try {
        const nativeState = await api.getStarFocusState()
        if (cancelled) return

        if (nativeState) {
          const normalized = normalizeState(nativeState)
          setState(normalized)
          setRestoredSession(Boolean(normalized.activeSession))
          if (normalized.activeSession) {
            const currentNow = Date.now()
            debugClockRef.current = {
              realNow: currentNow,
              simulatedNow: normalized.activeSession.pausedAt ?? currentNow,
            }
          }
          clearLegacyState()
          setHydrated(true)
          return
        }
      } catch (error) {
        console.error('Failed to load native Star Focus state:', error)
      }

      const hasLegacy = hasLegacyState()
      const legacyState = hasLegacy ? readLegacyState() : defaultState
      if (cancelled) return

      setState(legacyState)
      setRestoredSession(Boolean(legacyState.activeSession))
      if (legacyState.activeSession) {
        const currentNow = Date.now()
        debugClockRef.current = {
          realNow: currentNow,
          simulatedNow: legacyState.activeSession.pausedAt ?? currentNow,
        }
      }
      migratingLegacyRef.current = hasLegacy
      setHydrated(true)
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    try {
      void api.saveStarFocusState(state)
        .then(() => {
          if (migratingLegacyRef.current) {
            clearLegacyState()
            migratingLegacyRef.current = false
          }
        })
        .catch(error => {
          console.error('Failed to persist Star Focus state:', error)
        })
    } catch (error) {
      console.error('Failed to persist Star Focus state:', error)
    }
  }, [state, hydrated])

  useEffect(() => {
    if (!state.activeSession || state.activeSession.pausedAt !== null) return undefined

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, debugTimeScale === 1 ? 1000 : 250)

    return () => window.clearInterval(intervalId)
  }, [state.activeSession, debugTimeScale])

  useEffect(() => {
    if (!state.activeSession) return
    if (state.activeSession.pausedAt !== null) return
    const missionNow = getSimulatedMissionNow(debugClockRef.current, now, debugTimeScale)
    if (state.activeSession.endsAt > missionNow) return

    setState(prev => {
      if (!prev.activeSession) return prev
      const currentMissionNow = getSimulatedMissionNow(debugClockRef.current, now, debugTimeScale)
      if (prev.activeSession.endsAt > currentMissionNow) return prev
      return completeState(prev, now)
    })
    setRestoredSession(false)
    debugClockRef.current = { realNow: now, simulatedNow: now }
  }, [state.activeSession, now, debugTimeScale])

  useEffect(() => {
    setState(prev => {
      if (!prev.selectedTaskId) return prev

      const selectedTask = tasks.find(task => task.id === prev.selectedTaskId)
      if (!selectedTask) {
        if (prev.activeSession?.taskId === prev.selectedTaskId) return prev
        return { ...prev, selectedTaskId: null, selectedTaskText: null }
      }

      if (prev.selectedTaskText === selectedTask.text) return prev
      return { ...prev, selectedTaskText: selectedTask.text }
    })
  }, [tasks])

  const selectTask = useCallback((taskId: string, taskText: string) => {
    setState(prev => {
      if (prev.activeSession) return prev
      return {
        ...prev,
        selectedTaskId: taskId,
        selectedTaskText: taskText,
        lastCompletedMissionId: null,
      }
    })
  }, [])

  const clearSelectedTask = useCallback(() => {
    setState(prev => {
      if (prev.activeSession) return prev
      return {
        ...prev,
        selectedTaskId: null,
        selectedTaskText: null,
        lastCompletedMissionId: null,
      }
    })
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

  const setSessionDuration = useCallback((minutes: number) => {
    setState(prev => ({ ...prev, sessionDurationMinutes: minutes }))
  }, [])

  const setArchiveRetentionLimit = useCallback((limit: number) => {
    const archiveRetentionLimit = normalizeArchiveRetentionLimit(limit)

    setState(prev => (
      prev.archiveRetentionLimit === archiveRetentionLimit
        ? prev
        : applyArchiveRetentionLimit(prev, archiveRetentionLimit)
    ))
  }, [])

  const setDebugTimeScale = useCallback((value: number) => {
    const nextTimeScale = normalizeDebugTimeScale(value)
    const changedAt = Date.now()

    if (state.activeSession && state.activeSession.pausedAt === null) {
      debugClockRef.current = {
        realNow: changedAt,
        simulatedNow: getSimulatedMissionNow(debugClockRef.current, changedAt, debugTimeScale),
      }
    } else {
      debugClockRef.current = {
        realNow: changedAt,
        simulatedNow: debugClockRef.current.simulatedNow,
      }
    }

    setDebugTimeScaleState(nextTimeScale)
    setNow(changedAt)
  }, [state.activeSession, debugTimeScale])

  const launchSession = useCallback(() => {
    setState(prev => {
      if (!prev.selectedTaskId || !prev.selectedTaskText || prev.activeSession) return prev

      const startedAt = Date.now()
      const endsAt = startedAt + prev.sessionDurationMinutes * 60_000
      debugClockRef.current = { realNow: startedAt, simulatedNow: startedAt }

      return {
        ...prev,
        activeSession: {
          taskId: prev.selectedTaskId,
          taskText: prev.selectedTaskText,
          durationMinutes: prev.sessionDurationMinutes,
          startedAt,
          endsAt,
          pausedAt: null,
        },
        lastCompletedMissionId: null,
      }
    })

    setRestoredSession(false)
    setNow(Date.now())
  }, [])

  const pauseSession = useCallback(() => {
    const pausedRealNow = Date.now()
    const pausedAt = getSimulatedMissionNow(debugClockRef.current, pausedRealNow, debugTimeScale)
    debugClockRef.current = {
      realNow: pausedRealNow,
      simulatedNow: pausedAt,
    }

    setState(prev => {
      if (!prev.activeSession || prev.activeSession.pausedAt !== null) return prev

      return {
        ...prev,
        activeSession: {
          ...prev.activeSession,
          pausedAt,
        },
      }
    })

    setNow(pausedRealNow)
  }, [debugTimeScale])

  const resumeSession = useCallback(() => {
    const resumedAt = Date.now()
    debugClockRef.current = {
      realNow: resumedAt,
      simulatedNow: debugClockRef.current.simulatedNow,
    }

    setState(prev => {
      if (!prev.activeSession || prev.activeSession.pausedAt === null) return prev

      return {
        ...prev,
        activeSession: {
          ...prev.activeSession,
          pausedAt: null,
        },
      }
    })

    setRestoredSession(false)
    setNow(resumedAt)
  }, [])

  const cancelSession = useCallback(() => {
    debugClockRef.current = { realNow: Date.now(), simulatedNow: Date.now() }
    setState(prev => {
      if (!prev.activeSession) return prev

      return {
        ...prev,
        selectedTaskId: prev.activeSession.taskId,
        selectedTaskText: prev.activeSession.taskText,
        activeSession: null,
        lastCompletedMissionId: null,
      }
    })

    setRestoredSession(false)
    setNow(Date.now())
  }, [])

  const completeSession = useCallback(() => {
    const completedAt = Date.now()
    debugClockRef.current = { realNow: completedAt, simulatedNow: completedAt }
    setState(prev => completeState(prev, completedAt))
    setRestoredSession(false)
    setNow(completedAt)
  }, [])

  const dismissCompletion = useCallback(() => {
    setState(prev => ({ ...prev, lastCompletedMissionId: null }))
  }, [])

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      missionHistory: [],
      lastCompletedMissionId: null,
    }))
  }, [])

  const resetOrbitMap = useCallback(() => {
    debugClockRef.current = { realNow: Date.now(), simulatedNow: Date.now() }
    setState(prev => {
      if (prev.activeSession) return prev

      return {
        ...defaultState,
        sidebarCollapsed: prev.sidebarCollapsed,
        sessionDurationMinutes: prev.sessionDurationMinutes,
        archiveRetentionLimit: prev.archiveRetentionLimit,
      }
    })
    setRestoredSession(false)
    setNow(Date.now())
  }, [])

  const latestCompletedMission = state.lastCompletedMissionId
    ? state.missionHistory.find(mission => mission.id === state.lastCompletedMissionId) ?? null
    : null

  return {
    sidebarCollapsed: state.sidebarCollapsed,
    selectedTaskId: state.selectedTaskId,
    selectedTaskText: state.selectedTaskText,
    sessionDurationMinutes: state.sessionDurationMinutes,
    archiveRetentionLimit: state.archiveRetentionLimit,
    debugTimeScale,
    activeSession: state.activeSession,
    activeSnapshot: state.activeSession
      ? getSessionSnapshot(
        state.activeSession,
        state.activeSession.pausedAt !== null
          ? debugClockRef.current.simulatedNow
          : getSimulatedMissionNow(debugClockRef.current, now, debugTimeScale),
      )
      : null,
    missionHistory: state.missionHistory,
    latestCompletedMission,
    restoredSession,
    hydrated,
    selectTask,
    clearSelectedTask,
    toggleSidebar,
    setSidebarCollapsed,
    setSessionDuration,
    setArchiveRetentionLimit,
    setDebugTimeScale,
    launchSession,
    pauseSession,
    resumeSession,
    cancelSession,
    completeSession,
    dismissCompletion,
    clearHistory,
    resetOrbitMap,
  }
}
