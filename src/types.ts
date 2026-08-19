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

export interface ExtractedTaskDate {
  date: string
  tasks: Task[]
  filePath: string
  weekStart: string
  revision: string
}

export interface TaskMutationResult {
  ok: boolean
  date: string
  task: Task
  filePath: string
  weekStart: string
  revision: string
}

export type ViewMode = 'all' | 'today'
export type GoalCategory = 'targets' | 'recurring'

export type Provider = 'codex' | 'moonshot' | 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'custom'

export interface ProviderProfile {
  apiBase: string
  apiKey: string
  model: string
}

export interface AppSettings {
  provider: Provider
  apiBase: string
  apiKey: string
  model: string
  providerProfiles: Partial<Record<Provider, ProviderProfile>>
  kbPath: string
  machines: { name: string; type: string; specs?: string; capabilities?: string[] }[]
}

export interface GoalItem {
  id: string
  text: string
  done: boolean
}

export interface GoalsState {
  sidebarCollapsed: boolean
  targets: GoalItem[]
  recurring: GoalItem[]
}

export type StarFocusPhase = 'ignition' | 'ascent' | 'heating' | 'staging' | 'orbit'

export interface StarFocusSession {
  taskId: string
  taskText: string
  durationMinutes: number
  startedAt: number
  endsAt: number
  pausedAt: number | null
}

export interface StarFocusMissionRecord {
  id: string
  taskId: string
  taskText: string
  durationMinutes: number
  completedAt: number
  vehicleCode: string
  orbitIndex: number
  orbitLabel: string
}

export interface StarFocusState {
  sidebarCollapsed: boolean
  selectedTaskId: string | null
  selectedTaskText: string | null
  sessionDurationMinutes: number
  archiveRetentionLimit: number
  activeSession: StarFocusSession | null
  missionHistory: StarFocusMissionRecord[]
  lastCompletedMissionId: string | null
}
