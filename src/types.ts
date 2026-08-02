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
export type GoalCategory = 'targets' | 'recurring'

export type Provider = 'moonshot' | 'openai' | 'anthropic' | 'gemini' | 'custom'

export interface AppSettings {
  provider: Provider
  apiBase: string
  apiKey: string
  model: string
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
