import type { AggregatedTask, ExtractedTaskDate, Task } from './types'

export function completeTree(task: Task): Task {
  return { ...task, status: 'done', subtasks: task.subtasks.map(completeTree) }
}

export function flattenTasks(tasks: AggregatedTask[]): Task[] {
  return tasks.map(task => ({
    id: task.originalId ?? task.id, text: task.text, status: task.status, subtasks: task.todaySubtasks,
  }))
}

export function carriedTasks(dates: ExtractedTaskDate[], today: string): AggregatedTask[] {
  return dates.filter(section => section.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap(section => section.tasks.filter(task => task.status !== 'done').map(task => ({
      id: `${section.date}:${task.id}`, originalId: task.id,
      text: task.text, status: task.status, sourceDate: section.date,
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
