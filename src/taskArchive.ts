import type { ExtractedTaskDate, Task } from './types'

export interface ArchiveRow { date: string; rootId: string; task: Task; parents: string[] }
export function archiveRows(dates: ExtractedTaskDate[]): ArchiveRow[] {
  const rows: ArchiveRow[] = []
  const seenDates = new Set<string>()
  for (const section of [...dates].sort((a, b) => b.date.localeCompare(a.date))) {
    if (seenDates.has(section.date)) continue
    seenDates.add(section.date)
    const visit = (task: Task, rootId: string, parents: string[]) => {
      rows.push({ date: section.date, rootId, task, parents })
      task.subtasks.forEach(child => visit(child, rootId, [...parents, task.text]))
    }
    section.tasks.forEach(task => visit(task, task.id, []))
  }
  return rows
}
export function searchArchive(rows: ArchiveRow[], query: string, status = 'all') {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return rows.filter(row => (status === 'all' || (status === 'open'
    ? !['done', 'stopped'].includes(row.task.status) : row.task.status === status))
    && words.every(word => [row.task.text, row.task.finish?.doneWhen, ...row.parents].join(' ').toLocaleLowerCase().includes(word)))
}
export function archiveSummary(rows: ArchiveRow[], from: string, until: string) {
  const range = rows.filter(row => row.date >= from && row.date <= until)
  const roots = range.filter(row => !row.parents.length)
  return {
    roots,
    done: roots.filter(row => row.task.status === 'done').length,
    stopped: roots.filter(row => row.task.status === 'stopped').length,
    open: roots.filter(row => !['done', 'stopped'].includes(row.task.status)).length,
    stepsDone: range.filter(row => row.parents.length && row.task.status === 'done').length,
    stepsTotal: range.filter(row => row.parents.length).length,
  }
}
