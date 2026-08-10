import { useState, useCallback, useRef, useEffect } from 'react'
import type { AggregatedTask, Task } from '../types'
import { api } from '../api'
import { resolveTaskCarryForwardTarget } from '../taskCarryForward'

function flattenToday(aggregated: AggregatedTask[]): Task[] {
  return aggregated.map(a => ({
    id: a.id,
    text: a.text,
    status: a.status,
    subtasks: a.todaySubtasks,
  }))
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

export function useTasks(dateStr: string) {
  const [tasks, setTasks] = useState<AggregatedTask[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filePathRef = useRef<string | null>(null)
  const dateRef = useRef(dateStr)
  const carryForwardTarget = resolveTaskCarryForwardTarget(dateStr)

  useEffect(() => { dateRef.current = dateStr }, [dateStr])
  useEffect(() => { filePathRef.current = filePath }, [filePath])

  const load = useCallback(async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    setLoading(true)
    try {
      const result = await api.getTasks(dateStr)
      setTasks(result.tasks)
      setFilePath(result.filePath || null)
    } catch (e) {
      console.error('Failed to load tasks:', e)
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    return api.onFileChanged(() => { load() })
  }, [load])

  const persist = useCallback((updatedTasks: AggregatedTask[]) => {
    const snapshotDate = dateRef.current
    const snapshotPath = filePathRef.current
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const flat = flattenToday(updatedTasks)
      try {
        if (snapshotPath) {
          await api.saveTasks({ filePath: snapshotPath, dateStr: snapshotDate, tasks: flat })
        } else {
          const result = await api.createDateSection({ dateStr: snapshotDate, tasks: flat })
          if (dateRef.current === snapshotDate) setFilePath(result.filePath)
        }
      } catch (e) {
        console.error('Failed to save tasks:', e)
      }
    }, 300)
  }, [])

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
          return {
            ...t,
            todaySubtasks: t.todaySubtasks.map(s =>
              s.id === subtaskId ? { ...s, status: nextStatus(s.status) } : s
            ),
          }
        }
        if (t.id === taskId) return { ...t, status: nextStatus(t.status) }
        return t
      })
      persist(next)
      return next
    })
  }, [persist])

  const deleteTask = useCallback((taskId: string, subtaskId?: string) => {
    setTasks(prev => {
      let next: AggregatedTask[]
      if (subtaskId) {
        next = prev.map(t =>
          t.id === taskId
            ? { ...t, todaySubtasks: t.todaySubtasks.filter(s => s.id !== subtaskId) }
            : t
        )
      } else {
        next = prev.filter(t => t.id !== taskId)
      }
      persist(next)
      return next
    })
  }, [persist])

  const carryForward = useCallback(async (taskId: string, subtaskId?: string) => {
    const target = resolveTaskCarryForwardTarget(dateStr)

    // Compute payload from current state BEFORE mutating
    const currentTasks = tasks
    let taskText = ''
    let subtaskTexts: string[] = []

    if (subtaskId) {
      const parent = currentTasks.find(t => t.id === taskId)
      const sub = parent?.todaySubtasks.find(s => s.id === subtaskId)
      if (sub) taskText = sub.text
    } else {
      const found = currentTasks.find(t => t.id === taskId)
      if (found) {
        taskText = found.text
        subtaskTexts = found.todaySubtasks.map(s => s.text)
      }
    }

    if (!taskText) return

    // Remove from UI immediately
    if (subtaskId) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, todaySubtasks: t.todaySubtasks.filter(s => s.id !== subtaskId) } : t
      ))
    } else {
      setTasks(prev => prev.filter(t => t.id !== taskId))
    }

    try {
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }

      // Append to the resolved current or future section.
      await api.pushTask({ fromDate: dateStr, toDate: target.dateStr, taskText, subtaskTexts })

      // Save the source date section after removing the carried task.
      setTasks(prev => {
        const flat = flattenToday(prev)
        const fp = filePathRef.current
        if (fp) {
          api.saveTasks({ filePath: fp, dateStr, tasks: flat })
        }
        return prev
      })
      return target
    } catch (e) {
      console.error('Failed to carry task forward:', e)
      setTasks(currentTasks)
      await load()
      throw e
    }
  }, [dateStr, tasks, load])

  const addSubtask = useCallback((taskId: string, text: string) => {
    const sub: Task = { id: newId(), text, status: 'todo', subtasks: [] }
    setTasks(prev => {
      const next = prev.map(t =>
        t.id === taskId ? { ...t, todaySubtasks: [...t.todaySubtasks, sub] } : t
      )
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

  const addAISubtasks = useCallback((taskId: string, subtasks: { text: string }[]) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== taskId) return t
        const newSubs: Task[] = subtasks.map(s => ({
          id: newId(),
          text: s.text,
          status: 'todo' as const,
          subtasks: [],
        }))
        return { ...t, todaySubtasks: [...t.todaySubtasks, ...newSubs] }
      })
      persist(next)
      return next
    })
  }, [persist])

  const applySchedule = useCallback((schedule: { time: string; endTime?: string; parentTask: string; action: string; assignedTo?: string }[]) => {
    setTasks(prev => {
      const tasksByText = new Map<string, number>()
      prev.forEach((t, i) => tasksByText.set(t.text.toLowerCase().trim(), i))

      const next = prev.map(t => ({ ...t, todaySubtasks: [...t.todaySubtasks] }))

      for (const entry of schedule) {
        const key = entry.parentTask.toLowerCase().trim()
        let idx = tasksByText.get(key)

        // Fuzzy fallback: find best substring match
        if (idx === undefined) {
          for (const [text, i] of tasksByText) {
            if (text.includes(key) || key.includes(text)) { idx = i; break }
          }
        }
        if (idx === undefined) continue

        const timeTag = entry.endTime ? `${entry.time}–${entry.endTime}` : entry.time
        const who = entry.assignedTo && entry.assignedTo.toLowerCase() !== 'human'
          ? ` [${entry.assignedTo}]` : ''
        const label = `⏰ ${timeTag}${who} ${entry.action}`

        const alreadyExists = next[idx].todaySubtasks.some(s => s.text === label)
        if (!alreadyExists) {
          next[idx].todaySubtasks.push({
            id: newId(),
            text: label,
            status: 'todo',
            subtasks: [],
          })
        }
      }

      persist(next)
      return next
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
    tasks, loading, load,
    addTask, toggleStatus, deleteTask, carryForward, carryForwardTarget,
    addSubtask, updateTaskText, addAISubtasks, applySchedule,
    addDebugTask, addDebugTaskPack, clearAllTasks,
  }
}

function nextStatus(s: Task['status']): Task['status'] {
  const cycle: Task['status'][] = ['todo', 'done', 'partial', 'todo']
  const idx = cycle.indexOf(s)
  return cycle[(idx + 1) % (cycle.length - 1)] || 'todo'
}
