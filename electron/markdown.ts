export interface Task {
  id: string
  text: string
  status: 'todo' | 'done' | 'partial' | 'question'
  subtasks: Task[]
}

export interface AggregatedTask {
  id: string
  text: string
  status: 'todo' | 'done' | 'partial' | 'question'
  todaySubtasks: Task[]
  otherSubtasks: DatedTask[]
}

export interface DatedTask extends Task {
  sourceDate: string
}

export interface DateSection {
  date: string
  tasks: Task[]
  rawStart: number
  rawEnd: number
}

export interface ParsedFile {
  raw: string
  dateSections: DateSection[]
}

const STATUS_MAP: Record<string, Task['status']> = {
  ' ': 'todo',
  'x': 'done',
  'X': 'done',
  '~': 'partial',
  '?': 'question',
}

const STATUS_TO_CHAR: Record<Task['status'], string> = {
  todo: ' ',
  done: 'x',
  partial: '~',
  question: '?',
}

const DATE_HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/
const CHECKBOX_RE = /^(\s*)- \[(.)\]\s+(.*)$/
const BARE_ITEM_RE = /^(\s*)- (.*)$/

let idCounter = 0
function nextId(): string {
  return `task_${Date.now()}_${idCounter++}`
}

function parseTaskLines(lines: string[]): Task[] {
  const root: Task[] = []
  const stack: { indent: number; task: Task; children: Task[] }[] = []

  for (const line of lines) {
    const cbMatch = line.match(CHECKBOX_RE)
    const bareMatch = !cbMatch ? line.match(BARE_ITEM_RE) : null

    if (!cbMatch && !bareMatch) continue

    const indent = cbMatch ? cbMatch[1].length : bareMatch![1].length
    const status: Task['status'] = cbMatch ? (STATUS_MAP[cbMatch[2]] || 'todo') : 'todo'
    const text = cbMatch ? cbMatch[3].trim() : bareMatch![2].trim()

    const task: Task = { id: nextId(), text, status, subtasks: [] }

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(task)
    } else {
      stack[stack.length - 1].task.subtasks.push(task)
    }

    stack.push({ indent, task, children: task.subtasks })
  }

  return root
}

export function parseWeeklyFile(content: string): ParsedFile {
  const lines = content.split('\n')
  const dateSections: DateSection[] = []

  let i = 0
  while (i < lines.length) {
    const match = lines[i].match(DATE_HEADING_RE)
    if (match) {
      const date = match[1]
      const rawStart = i
      i++
      const taskLines: string[] = []
      while (i < lines.length) {
        if (lines[i].match(/^##\s/)) break
        taskLines.push(lines[i])
        i++
      }
      const rawEnd = i
      const tasks = parseTaskLines(taskLines)
      dateSections.push({ date, tasks, rawStart, rawEnd })
    } else {
      i++
    }
  }

  return { raw: content, dateSections }
}

export function serializeTasks(tasks: Task[], indent: number = 0): string {
  const pad = '  '.repeat(indent)
  let result = ''
  for (const task of tasks) {
    const statusChar = STATUS_TO_CHAR[task.status] || ' '
    result += `${pad}- [${statusChar}] ${task.text}\n`
    if (task.subtasks.length > 0) {
      result += serializeTasks(task.subtasks, indent + 1)
    }
  }
  return result
}

export function serializeDateSection(date: string, tasks: Task[]): string {
  let section = `## ${date}\n`
  section += serializeTasks(tasks)
  return section
}

function normalizeTaskText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function getTasksForDate(parsed: ParsedFile, targetDate: string): AggregatedTask[] {
  const todaySection = parsed.dateSections.find(s => s.date === targetDate)
  const mainTaskIndex = new Map<string, { dates: Map<string, Task[]>; status: Task['status'] }>()

  for (const section of parsed.dateSections) {
    for (const task of section.tasks) {
      const key = normalizeTaskText(task.text)
      if (!mainTaskIndex.has(key)) {
        mainTaskIndex.set(key, { dates: new Map(), status: task.status })
      }
      const entry = mainTaskIndex.get(key)!
      if (section.date === targetDate) {
        entry.status = task.status
      }
      entry.dates.set(section.date, task.subtasks)
    }
  }

  const result: AggregatedTask[] = []

  if (todaySection) {
    for (const task of todaySection.tasks) {
      const key = normalizeTaskText(task.text)
      const entry = mainTaskIndex.get(key)
      const otherSubtasks: DatedTask[] = []

      if (entry) {
        for (const [date, subs] of entry.dates) {
          if (date === targetDate) continue
          for (const sub of subs) {
            otherSubtasks.push({ ...sub, sourceDate: date })
          }
        }
      }

      result.push({
        id: task.id,
        text: task.text,
        status: task.status,
        todaySubtasks: task.subtasks,
        otherSubtasks,
      })
    }
  }

  return result
}
