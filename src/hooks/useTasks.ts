import { useState, useCallback, useRef, useEffect } from 'react'
import type { AggregatedTask, Task } from '../types'

const api = () => window.electronAPI

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

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useTasks(dateStr: string) {
  const [tasks, setTasks] = useState<AggregatedTask[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filePathRef = useRef<string | null>(null)
  const dateRef = useRef(dateStr)

  useEffect(() => { dateRef.current = dateStr }, [dateStr])
  useEffect(() => { filePathRef.current = filePath }, [filePath])

  const load = useCallback(async () => {
    if (!api()) return
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    setLoading(true)
    try {
      const result = await api()!.getTasks(dateStr)
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
    if (!api()?.onFileChanged) return
    return api()!.onFileChanged(() => { load() })
  }, [load])

  const persist = useCallback((updatedTasks: AggregatedTask[]) => {
    const snapshotDate = dateRef.current
    const snapshotPath = filePathRef.current
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const flat = flattenToday(updatedTasks)
      try {
        if (snapshotPath) {
          await api()!.saveTasks({ filePath: snapshotPath, dateStr: snapshotDate, tasks: flat })
        } else {
          const result = await api()!.createDateSection({ dateStr: snapshotDate, tasks: flat })
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

  const pushToTomorrow = useCallback(async (taskId: string, subtaskId?: string) => {
    if (!api()) return

    const tomorrow = new Date(dateStr + 'T12:00:00')
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = localDateStr(tomorrow)

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

      // Append to tomorrow's section
      await api()!.pushTask({ fromDate: dateStr, toDate: tomorrowStr, taskText, subtaskTexts })

      // Save today's section (task removed) — re-read state via getter
      setTasks(prev => {
        const flat = flattenToday(prev)
        const fp = filePathRef.current
        if (fp) {
          api()!.saveTasks({ filePath: fp, dateStr, tasks: flat })
        }
        return prev
      })
    } catch (e) {
      console.error('Failed to push to tomorrow:', e)
    }
  }, [dateStr, tasks])

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

  return {
    tasks, loading, load,
    addTask, toggleStatus, deleteTask, pushToTomorrow,
    addSubtask, updateTaskText, addAISubtasks, applySchedule,
  }
}

function nextStatus(s: Task['status']): Task['status'] {
  const cycle: Task['status'][] = ['todo', 'done', 'partial', 'todo']
  const idx = cycle.indexOf(s)
  return cycle[(idx + 1) % (cycle.length - 1)] || 'todo'
}
