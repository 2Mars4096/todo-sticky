export interface Task {
  id: string
  text: string
  status: 'todo' | 'done' | 'partial' | 'question'
  subtasks: Task[]
}

export interface DatedTask extends Task {
  sourceDate: string
}

export interface AggregatedTask {
  id: string
  text: string
  status: 'todo' | 'done' | 'partial' | 'question'
  todaySubtasks: Task[]
  otherSubtasks: DatedTask[]
}

export type ViewMode = 'all' | 'today'

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'custom'

export interface AppSettings {
  provider: Provider
  apiBase: string
  apiKey: string
  model: string
  kbPath: string
  machines: { name: string; type: string; specs?: string; capabilities?: string[] }[]
}
