import { useState, useCallback, useRef, useEffect } from 'react'
import type { AggregatedTask, ExtractedTaskDate, Task, FinishPromise } from '../types'
import { api, waitForPendingWrites } from '../api'
import { resolveTaskCarryForwardTarget } from '../taskCarryForward'

import { carriedTasks, completeTree, flattenTasks, mergeCarriedSection, moveCarriedToToday } from '../taskRollover'
import { applyPlanWithUndo, deleteWithUndo, restoreTaskChange, type TaskUndo } from '../taskHistory'
import { planningTaskKey, type PlannedBlock } from '../taskPlanning'

// A stalled archive must not leave the entire task surface waiting forever.
function readWithTimeout<T>(request: Promise<T>, milliseconds = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TASK_LOAD_TIMEOUT')), milliseconds)
    request.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
  })
}

export type ReorderPosition = 'before' | 'after'

function reorderById<T extends { id: string }>(
  items: T[],
  sourceId: string,
  targetId: string,
  position: ReorderPosition,
): T[] {
  if (sourceId === targetId) return items

  const sourceIndex = items.findIndex(item => item.id === sourceId)
  const targetIndex = items.findIndex(item => item.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0) return items

  const next = [...items]
  const [moved] = next.splice(sourceIndex, 1)
  const remainingTargetIndex = next.findIndex(item => item.id === targetId)
  next.splice(remainingTargetIndex + (position === 'after' ? 1 : 0), 0, moved)
  return next
}

let idCounter = 0
function newId() {
  return `ui_${Date.now()}_${idCounter++}`
}

let debugSeedCounter = 0

function nextDebugLabel(prefix: string) {
  debugSeedCounter += 1
  return `${prefix} #${debugSeedCounter}`
}

function buildTaskSubtask(text: string, status: Task['status'] = 'todo'): Task {
  return {
    id: newId(),
    text,
    status,
    subtasks: [],
  }
}

function buildDebugTask(
  text: string,
  status: Task['status'],
  subtasks: Array<{ text: string; status?: Task['status'] }>,
): AggregatedTask {
  return {
    id: newId(),
    text,
    status,
    todaySubtasks: subtasks.map(subtask => buildTaskSubtask(subtask.text, subtask.status)),
    otherSubtasks: [],
  }
}

function buildDebugTaskPack() {
  return [
    buildDebugTask(nextDebugLabel('Debug launch checklist'), 'todo', [
      { text: 'Arm from the center column', status: 'done' },
      { text: 'Launch a short session' },
      { text: 'Confirm archive reward appears' },
    ]),
    buildDebugTask(nextDebugLabel('Compact breakpoint sweep'), 'partial', [
      { text: 'Collapse both rails', status: 'done' },
      { text: 'Open Tracking Station from the rail' },
      { text: 'Verify narrow-window layout' },
    ]),
    buildDebugTask(nextDebugLabel('Archive retention pass'), 'question', [
      { text: 'Seed more completed missions' },
      { text: 'Switch retention cap' },
      { text: 'Check Recent vs Full archive' },
    ]),
  ]
}

export function useTasks(dateStr: string, isCurrentDay = false) {
  const [tasks, setTasks] = useState<AggregatedTask[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<'cloud-only' | 'failed' | null>(null)
  const [rolloverLoading, setRolloverLoading] = useState(false)
  const archiveRead = useRef<{ date: string; request: ReturnType<typeof api.extractTaskApi> } | null>(null)
  const [rolloverError, setRolloverError] = useState(false)
  const [saveError, setSaveError] = useState<{ date: string; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [undo, setUndo] = useState<TaskUndo | null>(null)
  const archive = useRef<ExtractedTaskDate[]>([])
  const savedArchive = useRef(new Map<string, string>())
  const carriedIds = useRef(new Set<string>())
  const loadGeneration = useRef(0)
  const loadingRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSave = useRef<Promise<void> | null>(null)
  const pendingSave = useRef<(() => Promise<void>) | null>(null)
  const filePathRef = useRef<string | null>(null)
  const dateRef = useRef(dateStr)
  // A failed save may block navigation. Keep subsequent edits bound to the data
  // actually on screen, rather than to a newer requested calendar date.
  const loadedDateRef = useRef(dateStr)
  const carryForwardTarget = resolveTaskCarryForwardTarget(dateStr)

  useEffect(() => { dateRef.current = dateStr }, [dateStr])
  useEffect(() => { filePathRef.current = filePath }, [filePath])

  const persist = useCallback((updatedTasks: AggregatedTask[]) => {
    const snapshotDate = loadedDateRef.current
    const snapshotPath = filePathRef.current
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const snapshotArchive = archive.current
    const snapshotSavedArchive = savedArchive.current
    const snapshotIds = carriedIds.current
    setSaving(true)
    let inFlight: Promise<void> | null = null
    const write = async () => {
      const flat = flattenTasks(updatedTasks.filter(task => !task.sourceDate))
      if (snapshotPath) {
        await api.saveTasks({ filePath: snapshotPath, dateStr: snapshotDate, tasks: flat })
      } else {
        const result = await api.createDateSection({ dateStr: snapshotDate, tasks: flat })
        if (loadedDateRef.current === snapshotDate) {
          filePathRef.current = result.filePath
          setFilePath(result.filePath)
        }
      }
      // Persist the destination before removing promoted rows from older dates.
      // If either write fails, the latest full snapshot remains available to Retry.
      for (const section of snapshotArchive) {
        const merged = mergeCarriedSection(section, snapshotIds, updatedTasks)
        const serialized = JSON.stringify(merged)
        if (serialized === snapshotSavedArchive.get(section.date)) continue
        await api.saveTasks({ filePath: section.filePath, dateStr: section.date, tasks: merged })
        // Keep original archive positions for deletion Undo, including completed
        // rows that are not visible in Today. Track saved content separately.
        snapshotSavedArchive.set(section.date, serialized)
      }
      if (pendingSave.current === save) {
        pendingSave.current = null
        setSaveError(null)
        setSaving(false)
      }
    }
    const save = (): Promise<void> => {
      if (inFlight) return inFlight
      const previous = activeSave.current
      inFlight = (async () => {
        // A newer snapshot contains the latest edits; a failed older write must
        // not prevent that snapshot from being attempted.
        if (previous) await previous.catch(() => {})
        try {
          await write()
        } catch (error) {
          if (pendingSave.current === save) {
            setSaveError({ date: snapshotDate, message: 'Changes are still in this window. Retry when the task folder is available.' })
            setSaving(false)
          }
          throw error
        }
      })()
      activeSave.current = inFlight
      void inFlight.then(() => {
        if (activeSave.current === inFlight) activeSave.current = null
        inFlight = null
      }, () => {
        if (activeSave.current === inFlight) activeSave.current = null
        inFlight = null
      })
      return inFlight
    }
    pendingSave.current = save
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null
      try { await save() }
      catch (error) { console.error('Failed to save tasks:', error) }
    }, 300)
  }, [])

  const flushPendingSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    while (activeSave.current || pendingSave.current) {
      if (activeSave.current) await activeSave.current
      if (pendingSave.current) await pendingSave.current()
    }
    await waitForPendingWrites()
  }, [])

  const retrySave = useCallback(async () => {
    setSaving(true)
    try { await flushPendingSave(); return true }
    catch { setSaving(false); return false }
  }, [flushPendingSave])

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current
    loadingRef.current = true
    setLoading(true)
    setLoadError(null)
    setRolloverError(false)
    setRolloverLoading(false)
    // Do not replace the editable in-memory list after an unsuccessful save.
    try { await readWithTimeout(flushPendingSave()) }
    catch {
      if (generation === loadGeneration.current) {
        loadingRef.current = false
        setLoading(false)
      }
      return
    }
    try {
      const result = await readWithTimeout(api.getTasks(dateStr))
      if (generation !== loadGeneration.current) return
      archive.current = []
      savedArchive.current = new Map()
      carriedIds.current = new Set()
      // A fresh file snapshot may include external edits or a different store.
      // Undo is scoped to the currently loaded snapshot and its local edits.
      setUndo(null)
      loadedDateRef.current = dateStr
      filePathRef.current = result.filePath || null
      setFilePath(result.filePath || null)
      setTasks(result.tasks)
      loadingRef.current = false
      setLoading(false)
    } catch (e) {
      if (generation !== loadGeneration.current) return
      console.error('Failed to load tasks:', e)
      setLoadError(String(e).includes('TASK_ARCHIVE_CLOUD_ONLY') ? 'cloud-only' : 'failed')
      loadingRef.current = false
      setLoading(false)
      return
    }

    if (!isCurrentDay || generation !== loadGeneration.current) return
    setRolloverLoading(true)
    try {
      // Reuse a still-running scan on retry instead of accumulating native workers.
      if (archiveRead.current?.date !== dateStr) {
        const request = api.extractTaskApi({ toDate: dateStr, skipUnavailable: true, canonicalDates: true })
        archiveRead.current = { date: dateStr, request }
        const clear = () => { if (archiveRead.current?.request === request) archiveRead.current = null }
        void request.then(clear, clear)
      }
      const extracted = await readWithTimeout(archiveRead.current!.request)
      if (generation !== loadGeneration.current) return
      const dates = extracted.dates.filter(section => section.date < dateStr)
      const carried = carriedTasks(dates, dateStr)
      archive.current = dates
      carriedIds.current = new Set(carried.map(task => task.id))
      savedArchive.current = new Map(dates.map(section => [section.date,
        JSON.stringify(mergeCarriedSection(section, carriedIds.current, carried))]))
      // Preserve edits made while history was loading.
      setTasks(current => [...current.filter(task => !task.sourceDate), ...carried])
      setRolloverError(Boolean(extracted.unavailableFiles?.length))
    } catch (error) {
      console.error('Failed to load carried tasks:', error)
      if (generation === loadGeneration.current) setRolloverError(true)
    } finally {
      if (generation === loadGeneration.current) setRolloverLoading(false)
    }
  }, [dateStr, isCurrentDay, flushPendingSave])

  useEffect(() => { void load(); return () => { loadGeneration.current += 1 } }, [load])
  useEffect(() => api.onFileChanged(() => { void load() }), [load])

  const addTask = useCallback((text: string) => {
    const task: AggregatedTask = {
      id: newId(),
      text,
      status: 'todo',
      todaySubtasks: [],
      otherSubtasks: [],
    }
    setTasks(prev => {
      const next = [...prev, task]
      persist(next)
      return next
    })
  }, [persist])

  const addTaskBundle = useCallback((text: string, subtaskTexts: string[]) => {
    const task: AggregatedTask = {
      id: newId(),
      text,
      status: 'todo',
      todaySubtasks: subtaskTexts.map(subtaskText => buildTaskSubtask(subtaskText)),
      otherSubtasks: [],
    }
    setTasks(prev => {
      const next = [...prev, task]
      persist(next)
      return next
    })
  }, [persist])

  const addDebugTask = useCallback(() => {
    const task = buildDebugTask(nextDebugLabel('Debug task'), 'todo', [
      { text: 'Toggle status once', status: 'done' },
      { text: 'Open Focus controls' },
    ])

    setTasks(prev => {
      const next = [...prev, task]
      persist(next)
      return next
    })
  }, [persist])

  const addDebugTaskPack = useCallback(() => {
    const debugTasks = buildDebugTaskPack()

    setTasks(prev => {
      const next = [...prev, ...debugTasks]
      persist(next)
      return next
    })
  }, [persist])

  const toggleStatus = useCallback((taskId: string, subtaskId?: string) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (subtaskId) {
          if (t.id !== taskId) return t
          const todaySubtasks = t.todaySubtasks.map(s =>
            s.id === subtaskId ? (nextStatus(s.status) === 'done' ? completeTree(s) : { ...s, status: nextStatus(s.status) }) : s
          )
          const completedSubtask = todaySubtasks.find(s => s.id === subtaskId)
          const allDone = completedSubtask?.status === 'done'
            && todaySubtasks.every(s => s.status === 'done')
          return {
            ...t,
            finish: t.finish?.doneWhen ? { ...t.finish, reviewReady: Boolean(allDone) } : t.finish,
            status: allDone ? (t.finish?.doneWhen ? 'partial' : 'done') : (t.status === 'done' && completedSubtask && completedSubtask.status !== 'done' ? 'partial' : t.status),
            todaySubtasks,
          }
        }
        if (t.id === taskId) {
          if (t.finish?.doneWhen && t.status !== 'done' && t.status !== 'stopped') {
            return { ...t, finish: { ...t.finish, reviewReady: true } }
          }
          const status = nextStatus(t.status)
          return { ...t, status, todaySubtasks: status === 'done' ? t.todaySubtasks.map(completeTree) : t.todaySubtasks }
        }
        return t
      })
      persist(next)
      return next
    })
  }, [persist])

  const updateFinish = useCallback((taskId: string, patch: Partial<FinishPromise>) => {
    setTasks(prev => {
      const next = prev.map(task => {
        if (task.id !== taskId) return task
        const finish = { ...task.finish, ...patch }
        if ('by' in patch && patch.by !== task.finish?.by) {
          finish.originalBy = task.finish?.originalBy || task.finish?.by || patch.by
          finish.deadlineChanges = [...(task.finish?.deadlineChanges ?? []),
            { from: task.finish?.by ?? null, to: patch.by || null, at: new Date().toISOString() }]
        }
        return { ...task, finish }
      })
      persist(next)
      return next
    })
  }, [persist])

  const reviewTask = useCallback((taskId: string, decision: 'complete' | 'revise' | 'stop') => {
    setTasks(prev => {
      const next = prev.map(task => task.id !== taskId ? task : {
        ...task,
        status: (decision === 'complete' ? 'done' : decision === 'stop' ? 'stopped' : 'partial') as Task['status'],
        finish: { ...task.finish, reviewReady: false },
        todaySubtasks: decision === 'complete' ? task.todaySubtasks.map(completeTree) : task.todaySubtasks,
      })
      persist(next)
      return next
    })
  }, [persist])

  const deleteTask = useCallback((taskId: string, subtaskId?: string) => {
    setTasks(prev => {
      const change = deleteWithUndo(prev, loadedDateRef.current, taskId, subtaskId)
      if (!change) return prev
      setUndo(change.undo)
      persist(change.tasks)
      return change.tasks
    })
  }, [persist])

  const undoLastAction = useCallback(() => {
    if (loadingRef.current || !undo || undo.date !== loadedDateRef.current) return
    setTasks(prev => {
      if (loadingRef.current || undo.date !== loadedDateRef.current) return prev
      const restored = restoreTaskChange(prev, undo)
      persist(restored)
      return restored
    })
    setUndo(null)
  }, [undo, persist])

  const carryForward = useCallback(async (taskId: string, subtaskId?: string) => {
    const target = resolveTaskCarryForwardTarget(dateStr)

    // Compute payload from current state BEFORE mutating
    const currentTasks = tasks
    let taskText = ''
    let subtaskTexts: string[] = []
    let parentTaskText: string | undefined

    if (subtaskId) {
      const parent = currentTasks.find(t => t.id === taskId)
      const sub = parent?.todaySubtasks.find(s => s.id === subtaskId)
      if (parent && sub) {
        taskText = sub.text
        parentTaskText = parent.text
      }
    } else {
      const found = currentTasks.find(t => t.id === taskId)
      if (found) {
        taskText = found.text
        subtaskTexts = found.todaySubtasks.map(s => s.text)
      }
    }

    if (!taskText) return

    await flushPendingSave()

    setUndo(null)

    // Remove from UI immediately
    if (subtaskId) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, todaySubtasks: t.todaySubtasks.filter(s => s.id !== subtaskId) } : t
      ))
    } else {
      setTasks(prev => prev.filter(t => t.id !== taskId))
    }

    try {
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; pendingSave.current = null }

      // Append to the resolved current or future section.
      await api.pushTask({
        fromDate: dateStr,
        toDate: target.dateStr,
        taskText,
        subtaskTexts,
        parentTaskText,
        taskSnapshot: subtaskId
          ? currentTasks.find(t => t.id === taskId)?.todaySubtasks.find(s => s.id === subtaskId)
          : flattenTasks(currentTasks.filter(t => t.id === taskId))[0],
        parentSnapshot: subtaskId ? flattenTasks(currentTasks.filter(t => t.id === taskId))[0] : undefined,
      })

      const remaining = subtaskId
        ? currentTasks.map(task => task.id === taskId ? { ...task, todaySubtasks: task.todaySubtasks.filter(sub => sub.id !== subtaskId) } : task)
        : currentTasks.filter(task => task.id !== taskId)
      persist(remaining)
      await flushPendingSave()
      return target
    } catch (e) {
      console.error('Failed to carry task forward:', e)
      setTasks(currentTasks)
      await load()
      throw e
    }
  }, [dateStr, tasks, load, persist, flushPendingSave])

  const addSubtask = useCallback((taskId: string, text: string) => {
    const sub: Task = { id: newId(), text, status: 'todo', subtasks: [] }
    setTasks(prev => {
      const next = prev.map(t =>
        t.id === taskId ? { ...t, finish: t.finish ? { ...t.finish, reviewReady: false } : undefined, status: t.status === 'done' || t.status === 'stopped' ? 'partial' : t.status, todaySubtasks: [...t.todaySubtasks, sub] } : t
      )
      persist(next)
      return next
    })
  }, [persist])

  const moveToToday = useCallback((taskId: string, targetId?: string, position: ReorderPosition = 'after') => {
    if (!isCurrentDay || loadingRef.current || loadedDateRef.current !== dateStr) return
    setTasks(prev => {
      if (loadingRef.current || loadedDateRef.current !== dateStr) return prev
      const next = moveCarriedToToday(prev, taskId, newId, targetId, position)
      if (next === prev) return prev
      setUndo(null)
      persist(next)
      return next
    })
  }, [dateStr, isCurrentDay, persist])

  const reorderTasks = useCallback((sourceId: string, targetId: string, position: ReorderPosition) => {
    setTasks(prev => {
      const next = reorderById(prev, sourceId, targetId, position)
      if (next === prev) return prev
      persist(next)
      return next
    })
  }, [persist])

  const reorderSubtasks = useCallback((
    taskId: string,
    sourceId: string,
    targetId: string,
    position: ReorderPosition,
  ) => {
    setTasks(prev => {
      let changed = false
      const next = prev.map(task => {
        if (task.id !== taskId) return task
        const todaySubtasks = reorderById(task.todaySubtasks, sourceId, targetId, position)
        if (todaySubtasks === task.todaySubtasks) return task
        changed = true
        return { ...task, todaySubtasks }
      })
      if (!changed) return prev
      persist(next)
      return next
    })
  }, [persist])

  const updateTaskText = useCallback((taskId: string, text: string, subtaskId?: string) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (subtaskId && t.id === taskId) {
          return {
            ...t,
            todaySubtasks: t.todaySubtasks.map(s => s.id === subtaskId ? { ...s, text } : s),
          }
        }
        if (t.id === taskId && !subtaskId) return { ...t, text }
        return t
      })
      persist(next)
      return next
    })
  }, [persist])

  const addAISubtasks = useCallback((taskId: string, subtasks: { text: string }[], expectedDate: string, expectedTaskKey: string) => {
    if (loadingRef.current) return
    setTasks(prev => {
      if (loadingRef.current || expectedDate !== loadedDateRef.current) return prev
      const target = prev.find(task => task.id === taskId)
      if (!target || target.status === 'done' || target.status === 'stopped'
        || planningTaskKey([target]) !== expectedTaskKey || !subtasks.length) return prev
      const next = prev.map(t => {
        if (t.id !== taskId) return t
        const newSubs: Task[] = subtasks.map(s => ({
          id: newId(),
          text: s.text,
          status: 'todo' as const,
          subtasks: [],
        }))
        return { ...t, finish: t.finish ? { ...t.finish, reviewReady: false } : undefined, todaySubtasks: [...t.todaySubtasks, ...newSubs] }
      })
      persist(next)
      return next
    })
  }, [persist])

  const applySchedule = useCallback((schedule: PlannedBlock[], expectedDate: string, expectedTaskKey: string) => {
    if (loadingRef.current) return
    const batchId = newId()
    setTasks(prev => {
      if (loadingRef.current || expectedDate !== loadedDateRef.current || planningTaskKey(prev) !== expectedTaskKey) return prev
      const change = applyPlanWithUndo(prev, expectedDate, schedule, batchId)
      if (!change) return prev
      setUndo(change.undo)
      persist(change.tasks)
      return change.tasks
    })
  }, [persist])

  const clearAllTasks = useCallback(() => {
    setTasks(prev => {
      if (!prev.length) return prev
      const next: AggregatedTask[] = []
      persist(next)
      return next
    })
  }, [persist])

  return {
    flushPendingSave,
    saveError, saving, retrySave, undo, undoLastAction, dismissUndo: () => setUndo(null),
    tasks, loading, loadError, rolloverLoading, rolloverError, load, dataDate: loadedDateRef.current,
    updateFinish, reviewTask, addTask, addTaskBundle, toggleStatus, deleteTask, carryForward, carryForwardTarget,
    addSubtask, moveToToday, reorderTasks, reorderSubtasks, updateTaskText, addAISubtasks, applySchedule,
    addDebugTask, addDebugTaskPack, clearAllTasks,
  }
}

function nextStatus(s: Task['status']): Task['status'] {
  const cycle: Task['status'][] = ['todo', 'done', 'partial', 'todo']
  const idx = cycle.indexOf(s)
  return cycle[(idx + 1) % (cycle.length - 1)] || 'todo'
}
