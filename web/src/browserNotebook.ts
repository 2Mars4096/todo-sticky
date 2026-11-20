// The browser stores each dated task tree under its own IndexedDB key. A single
// read/write transaction checks the last observed tree before replacing it.
import { format, startOfWeek } from 'date-fns'
import { canonical, validateRecords } from './cloudSync'
import type { AppSettings, Task } from './types'

const folder = 'Browser notebook'
const defaults: AppSettings = {
  kbPath: folder, machines: [], provider: 'diane', providerChosen: true,
  providerProfiles: {}, apiBase: 'https://dear-diane-202610-api.web.app', apiKey: '', model: '',
}
let database: Promise<IDBDatabase> | undefined
function openNotebook() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('dockit-notebook-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('days')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = undefined; reject(request.error) }
  })
  return database
}

function validateDay(date: string, tasks: unknown) {
  validateRecords([{key: 'day:' + date, revision: 1, deleted: false, updatedAt: '', mutationId: 'browser', payload: {date, tasks}}])
}

function section(date: string, tasks: Task[]) {
  validateDay(date, tasks)
  return { date, tasks, filePath: date, weekStart: format(startOfWeek(new Date(date + 'T12:00:00'), {weekStartsOn: 1}), 'yyyy-MM-dd'), revision: canonical(tasks) }
}

async function readDays(filter: {date?: string; fromDate?: string; toDate?: string; canonicalDates?: boolean}) {
  const db = await openNotebook()
  return new Promise<ReturnType<typeof section>[]>((resolve, reject) => {
    const store = db.transaction('days').objectStore('days')
    const range = filter.date ? IDBKeyRange.only(filter.date) : filter.fromDate && filter.toDate
      ? IDBKeyRange.bound(filter.fromDate, filter.toDate) : filter.fromDate
      ? IDBKeyRange.lowerBound(filter.fromDate) : filter.toDate ? IDBKeyRange.upperBound(filter.toDate) : undefined
    const cursor = store.openCursor(range)
    const days: ReturnType<typeof section>[] = []
    cursor.onerror = () => reject(cursor.error)
    cursor.onsuccess = () => {
      const item = cursor.result
      try {
        if (item) { days.push(section(String(item.key), item.value)); item.continue(); return }
        if (filter.date && !filter.canonicalDates && !days.length) days.push(section(filter.date, []))
        resolve(days)
      } catch (error) { reject(error) }
    }
  })
}

async function writeDay(date: string, update: (tasks: Task[]) => Task[]) {
  const db = await openNotebook()
  return new Promise<{ok: true; filePath: string; weekStart: string; revision: string}>((resolve, reject) => {
    const tx = db.transaction('days', 'readwrite')
    const store = tx.objectStore('days')
    const read = store.get(date)
    let next: ReturnType<typeof section>
    tx.oncomplete = () => {
      resolve({ok: true, filePath: date, weekStart: next.weekStart, revision: next.revision})
    }
    tx.onabort = () => reject(tx.error || new Error('The notebook could not be saved.'))
    read.onsuccess = () => {
      try {
        const previous = read.result === undefined ? [] : read.result
        validateDay(date, previous)
        const tasks = update(previous)
        next = section(date, tasks)
        store.put(tasks, date)
      } catch (error) { reject(error); tx.abort() }
    }
  })
}

const changed = () => new Error('This day changed in another view. Copy your edits before reloading the saved day.')
function mergeCopy(tasks: Task[], copy: Task) {
  const existing = tasks.find(task => task.id === copy.id)
  if (!existing) return [...tasks, copy]
  if (canonical(existing) !== canonical(copy)) throw changed()
  return tasks
}

export async function browserCommand(command: string, args: Record<string, any> = {}): Promise<unknown> {
  switch (command) {
    case 'get_tasks': {
      const [day] = await readDays({ date: args.dateStr })
      return {...day, tasks: day.tasks.map(({subtasks, ...task}) => ({...task, todaySubtasks: subtasks, otherSubtasks: []}))}
    }
    case 'task_api_extract': return {dates: await readDays(args.request)}
    case 'save_tasks':
    case 'create_date_section':
      return writeDay(args.dateStr, tasks => {
        if ((args.expectedRevision ?? (command === 'create_date_section' ? '[]' : undefined)) !== canonical(tasks)) throw changed()
        return args.tasks
      })
    case 'append_tasks_to_date': return writeDay(args.dateStr, tasks => [...tasks, ...args.tasks])
    case 'cloud_apply_day': return writeDay(args.date, tasks => {
      if (args.expectedKbPath !== folder || canonical(args.expectedTasks) !== canonical(tasks)) throw changed()
      return args.tasks
    })
    case 'push_task': return writeDay(args.toDate, tasks => {
      const snapshot: Task = args.taskSnapshot
      const parent: Task | undefined = args.parentSnapshot
      if (!parent) return mergeCopy(tasks, snapshot)
      const existing = tasks.find(task => task.id === parent.id)
      if (!existing) return [...tasks, {...parent, subtasks: [snapshot]}]
      if (existing.text !== parent.text || existing.goalId !== parent.goalId || existing.goalStepId !== parent.goalStepId) throw changed()
      return tasks.map(task => task === existing ? {...task, subtasks: mergeCopy(task.subtasks, snapshot)} : task)
    })
    case 'list_weekly_files': return (await readDays({})).map(day => day.filePath)
    case 'cloud_task_folder': return folder
    case 'get_settings': return {...defaults, ...JSON.parse(localStorage.getItem('dockit-settings') || '{}'), kbPath: folder}
    case 'save_settings': localStorage.setItem('dockit-settings', JSON.stringify({...args.settings, kbPath: folder})); return {ok: true}
    case 'get_star_focus_state': return JSON.parse(localStorage.getItem('dockit-focus') || 'null')
    case 'save_star_focus_state': localStorage.setItem('dockit-focus', JSON.stringify(args.state)); return {ok: true}
    case 'check_first_run': return !localStorage.getItem('dockit-settings')
    case 'diane_credential_status': return false
    default: throw new Error('This action requires the Dockit desktop app.')
  }
}
