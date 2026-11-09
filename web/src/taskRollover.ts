import type { AggregatedTask, ExtractedTaskDate, Task } from './types'

export function completeTree(task: Task): Task {
  if (task.status === 'stopped') return task
  return { ...task, status: 'done', subtasks: task.subtasks.map(completeTree) }
}

export function flattenTasks(tasks: AggregatedTask[]): Task[] {
  return tasks.map(task => ({
    finish: task.finish, id: task.originalId ?? task.id, text: task.text, status: task.status, subtasks: task.todaySubtasks,
    ...(task.goalId ? { goalId: task.goalId } : {}),
    ...(task.goalStepId ? { goalStepId: task.goalStepId } : {}),
  }))
}

export function carriedTasks(dates: ExtractedTaskDate[], today: string): AggregatedTask[] {
  return dates.filter(section => section.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap(section => section.tasks.filter(task => task.status !== 'done' && task.status !== 'stopped').map(task => ({
      id: `${section.date}:${task.id}`, originalId: task.id,
      finish: task.finish, text: task.text, status: task.status, sourceDate: section.date,
      ...(task.goalId ? { goalId: task.goalId } : {}),
      ...(task.goalStepId ? { goalStepId: task.goalStepId } : {}),
      todaySubtasks: task.subtasks, otherSubtasks: [],
    })))
}

// Preserve archived completed tasks, replacing/removing only the rows loaded into Today.
export function mergeCarriedSection(section: ExtractedTaskDate, visibleIds: Set<string>, tasks: AggregatedTask[]): Task[] {
  const edits = flattenTasks(tasks.filter(task => task.sourceDate === section.date))
  let index = 0
  return section.tasks.flatMap(task => visibleIds.has(`${section.date}:${task.id}`)
    ? (index < edits.length ? [edits[index++]] : []) : [task])
}

// Promote the complete editable tree, preserving metadata and avoiding IDs that
// already exist in Today (older files can legitimately reuse IDs across dates).
export function moveCarriedToToday(
  tasks: AggregatedTask[], sourceId: string, newId: () => string,
  targetId?: string, position: 'before' | 'after' = 'after',
): AggregatedTask[] {
  const source = tasks.find(task => task.id === sourceId)
  if (!source?.sourceDate) return tasks
  const today = tasks.filter(task => !task.sourceDate)
  if (targetId && !today.some(task => task.id === targetId)) return tasks
  const ids = new Set<string>()
  const collect = (task: Task) => { ids.add(task.id); task.subtasks.forEach(collect) }
  flattenTasks(today).forEach(collect)
  const unique = (task: Task): Task => {
    let id = task.id
    while (ids.has(id)) id = newId()
    ids.add(id)
    return { ...task, id, subtasks: task.subtasks.map(unique) }
  }
  const moved = unique(flattenTasks([source])[0])
  const promoted: AggregatedTask = {
    id: moved.id, text: moved.text, status: moved.status, finish: moved.finish,
    ...(moved.goalId ? { goalId: moved.goalId } : {}),
    ...(moved.goalStepId ? { goalStepId: moved.goalStepId } : {}),
    todaySubtasks: moved.subtasks, otherSubtasks: source.otherSubtasks,
  }
  const index = targetId ? today.findIndex(task => task.id === targetId) + (position === 'after' ? 1 : 0) : today.length
  today.splice(index, 0, promoted)
  return [...today, ...tasks.filter(task => task.sourceDate && task.id !== sourceId)]
}
