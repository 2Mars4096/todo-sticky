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

export interface ElectronAPI {
  getTasks: (dateStr: string) => Promise<{
    tasks: AggregatedTask[]
    filePath?: string
    weekStart?: string
  }>
  saveTasks: (data: { filePath: string; dateStr: string; tasks: Task[] }) => Promise<{ ok: boolean }>
  createDateSection: (data: { dateStr: string; tasks: Task[] }) => Promise<{ filePath: string; weekStart: string }>
  appendTasksToDate: (data: { dateStr: string; tasks: Task[] }) => Promise<{ filePath: string; weekStart: string }>
  pushTask: (data: { fromDate: string; toDate: string; taskText: string; subtaskTexts: string[] }) => Promise<{ ok: boolean; filePath: string }>
  listWeeklyFiles: () => Promise<string[]>
  llmBreakdown: (data: { taskText: string; existingSubtasks: string[] }) => Promise<{
    subtasks: { text: string; estimatedMinutes?: number; machineTask?: boolean }[]
  }>
  llmSchedule: (data: { tasks: any[]; machines: any[] }) => Promise<{ plan: string; schedule: any[] }>
  getEnv: () => Promise<{ apiBase: string; model: string; hasKey: boolean; machines?: any[] }>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<{ ok: boolean }>
  testConnection: (settings: { provider: string; apiBase: string; apiKey: string; model: string }) => Promise<{ ok: boolean; message: string }>
  checkFirstRun: () => Promise<boolean>
  selectFolder: () => Promise<string | null>
  onFileChanged: (cb: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
