import type { AggregatedTask, Task } from './types'
import type { PlannedBlock } from './taskPlanning'
import { planStepPrefix, planTextHash, isReplaceablePlanStep } from './taskPlanning'

interface PositionedTask {
  task: AggregatedTask
  index: number
  previousId?: string
  nextId?: string
}

export type TaskUndo = {
  kind: 'delete'
  date: string
  label: string
  root: PositionedTask
  step?: { task: Task; index: number; previousId?: string; nextId?: string }
} | {
  kind: 'plan'
  date: string
  label: string
  before: AggregatedTask[]
  after: AggregatedTask[]
}

function insertAtOriginalPosition<T extends { id: string }>(
  items: T[], item: T, index: number, previousId?: string, nextId?: string,
): T[] {
  if (items.some(candidate => candidate.id === item.id)) return items
  const nextIndex = items.findIndex(candidate => candidate.id === nextId)
  const previousIndex = items.findIndex(candidate => candidate.id === previousId)
  const insertAt = nextIndex >= 0 ? nextIndex : previousIndex >= 0 ? previousIndex + 1 : Math.min(index, items.length)
  return [...items.slice(0, insertAt), item, ...items.slice(insertAt)]
}

export function deleteWithUndo(tasks: AggregatedTask[], date: string, taskId: string, subtaskId?: string) {
  const index = tasks.findIndex(task => task.id === taskId)
  if (index < 0) return null
  const task = tasks[index]
  const root = { task, index, previousId: tasks[index - 1]?.id, nextId: tasks[index + 1]?.id }
  if (subtaskId) {
    const stepIndex = task.todaySubtasks.findIndex(step => step.id === subtaskId)
    if (stepIndex < 0) return null
    const step = task.todaySubtasks[stepIndex]
    const undo: TaskUndo = {
      kind: 'delete', date, label: 'Step deleted', root,
      step: { task: step, index: stepIndex, previousId: task.todaySubtasks[stepIndex - 1]?.id, nextId: task.todaySubtasks[stepIndex + 1]?.id },
    }
    return { undo, tasks: tasks.map(candidate => candidate.id === taskId
      ? { ...candidate, todaySubtasks: candidate.todaySubtasks.filter(child => child.id !== subtaskId) }
      : candidate) }
  }
  const undo: TaskUndo = { kind: 'delete', date, label: 'Task deleted', root }
  return { undo, tasks: tasks.filter(candidate => candidate.id !== taskId) }
}

export function applyPlanWithUndo(tasks: AggregatedTask[], date: string, schedule: PlannedBlock[], batchId: string) {
  let sequence = 0
  const next = tasks.map(task => {
    if (task.status === 'done' || task.status === 'stopped') return task
    const retained = task.todaySubtasks.filter(step => !isReplaceablePlanStep(step, date))
    const blocks = schedule.filter(block => block.taskId === task.id)
    const planned: Task[] = []
    for (const block of blocks) {
      const who = block.assignedTo !== 'human' ? ` [${block.assignedTo}]` : ''
      const text = `⏰ ${block.time}–${block.endTime}${who} ${block.action}`
      // Keep historical/user-authored equivalents rather than append the same block twice.
      if (retained.some(step => step.text === text)) continue
      planned.push({ id: `${planStepPrefix(date)}${batchId}_${sequence++}_h${planTextHash(text)}`, text, status: 'todo', subtasks: [] })
    }
    if (!planned.length && retained.length === task.todaySubtasks.length) return task
    return {
      ...task,
      finish: planned.length && task.finish ? { ...task.finish, reviewReady: false } : task.finish,
      todaySubtasks: [...retained, ...planned],
    }
  })
  const changedIds = new Set(tasks.filter((task, index) => task !== next[index]).map(task => task.id))
  if (!changedIds.size) return null
  const undo: TaskUndo = {
    kind: 'plan', date, label: 'Plan applied',
    before: tasks.filter(task => changedIds.has(task.id)),
    after: next.filter(task => changedIds.has(task.id)),
  }
  return { tasks: next, undo }
}

/** Reverse only the recorded operation; later edits and new tasks remain intact. */
export function restoreTaskChange(tasks: AggregatedTask[], undo: TaskUndo): AggregatedTask[] {
  if (undo.kind === 'delete') {
    const { root, step } = undo
    if (!step || !tasks.some(task => task.id === root.task.id)) {
      return insertAtOriginalPosition(tasks, root.task, root.index, root.previousId, root.nextId)
    }
    return tasks.map(task => {
      if (task.id !== root.task.id) return task
      const steps = insertAtOriginalPosition(task.todaySubtasks, step.task, step.index, step.previousId, step.nextId)
      if (steps === task.todaySubtasks) return task
      const reopens = (task.status === 'done' || task.status === 'stopped')
        && step.task.status !== 'done' && step.task.status !== 'stopped'
      return {
        ...task,
        status: reopens ? 'partial' : task.status,
        finish: reopens && task.finish ? { ...task.finish, reviewReady: false } : task.finish,
        todaySubtasks: steps,
      }
    })
  }
  return tasks.map(task => {
    const before = undo.before.find(candidate => candidate.id === task.id)
    const after = undo.after.find(candidate => candidate.id === task.id)
    if (!before || !after) return task
    const beforeIds = new Set(before.todaySubtasks.map(step => step.id))
    const afterIds = new Set(after.todaySubtasks.map(step => step.id))
    const added = new Map(after.todaySubtasks.filter(step => !beforeIds.has(step.id)).map(step => [step.id, step]))
    // A completed or subsequently edited block has become the user's work; retain it.
    let steps = task.todaySubtasks.filter(step => !added.has(step.id) || JSON.stringify(step) !== JSON.stringify(added.get(step.id)))
    before.todaySubtasks.forEach((step, index) => {
      const closedAfterPlanning = task.status === 'done' || task.status === 'stopped'
      const unfinished = step.status !== 'done' && step.status !== 'stopped'
      if (!afterIds.has(step.id) && !(closedAfterPlanning && unfinished)) {
        steps = insertAtOriginalPosition(steps, step, index, before.todaySubtasks[index - 1]?.id, before.todaySubtasks[index + 1]?.id)
      }
    })
    const untouchedSteps = JSON.stringify(task.todaySubtasks) === JSON.stringify(after.todaySubtasks)
    const unchangedOpenStatus = task.status === after.status && task.status !== 'done' && task.status !== 'stopped'
    return {
      ...task,
      finish: unchangedOpenStatus && untouchedSteps && JSON.stringify(task.finish) === JSON.stringify(after.finish) ? before.finish : task.finish,
      todaySubtasks: steps,
    }
  })
}
