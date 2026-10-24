import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  AggregatedTask,
  Task,
  AppSettings,
  AlbumRecommendationResult,
  StarFocusState,
  ExtractedTaskDate,
  TaskMutationResult,
} from './types'

const pendingWrites = new Set<Promise<unknown>>()

function persist<T>(request: Promise<T>): Promise<T> {
  pendingWrites.add(request)
  void request.then(
    () => pendingWrites.delete(request),
    () => pendingWrites.delete(request),
  )
  return request
}

export async function waitForPendingWrites(): Promise<void> {
  while (pendingWrites.size) await Promise.all([...pendingWrites])
}

export const api = {
  extractTaskApi: (request: { date?: string; fromDate?: string; toDate?: string; all?: boolean; skipUnavailable?: boolean; canonicalDates?: boolean }) =>
    invoke<{ dates: ExtractedTaskDate[]; unavailableFiles?: string[] }>('task_api_extract', { request }),

  createTaskApi: (request: {
    date: string
    text: string
    status?: Task['status']
    subtasks?: { text: string; status?: Task['status'] }[]
    parentId?: string
    expectedRevision?: string
  }) => invoke<TaskMutationResult>('task_api_create', { request }),

  updateTaskApi: (request: {
    date: string
    id: string
    text?: string
    status?: Task['status']
    expectedRevision?: string
  }) => invoke<TaskMutationResult>('task_api_update', { request }),

  deleteTaskApi: (request: {
    date: string
    id: string
    expectedRevision?: string
  }) => invoke<TaskMutationResult>('task_api_delete', { request }),

  getTasks: (dateStr: string) =>
    invoke<{ tasks: AggregatedTask[]; filePath?: string; weekStart?: string }>('get_tasks', { dateStr }),

  saveTasks: (data: { filePath: string; dateStr: string; tasks: Task[] }) =>
    persist(invoke<{ ok: boolean }>('save_tasks', data)),

  createDateSection: (data: { dateStr: string; tasks: Task[] }) =>
    persist(invoke<{ filePath: string; weekStart: string }>('create_date_section', data)),

  appendTasksToDate: (data: { dateStr: string; tasks: Task[] }) =>
    persist(invoke<{ filePath: string; weekStart: string }>('append_tasks_to_date', data)),

  pushTask: (data: {
    fromDate: string
    toDate: string
    taskText: string
    subtaskTexts: string[]
    parentTaskText?: string
    taskSnapshot?: Task
    parentSnapshot?: Task
  }) =>
    persist(invoke<{ ok: boolean; filePath: string }>('push_task', data)),

  listWeeklyFiles: () =>
    invoke<string[]>('list_weekly_files'),

  llmBreakdown: (data: { taskText: string; existingSubtasks: string[]; suggestFinish?: boolean }) =>
    invoke<{ finishSuggestion?: string; subtasks: { text: string; estimatedMinutes?: number; machineTask?: boolean }[] }>('llm_breakdown', data),

  llmSchedule: (data: { tasks: AggregatedTask[]; machines: AppSettings['machines']; dateStr: string; availableStart: string; availableEnd: string }) =>
    invoke<unknown>('llm_schedule', data),

  llmRecommendAlbums: (data: { tasks: any[] }) =>
    invoke<AlbumRecommendationResult>('llm_recommend_albums', data),

  getSettings: () =>
    invoke<AppSettings>('get_settings'),

  saveSettings: (settings: AppSettings) =>
    persist(invoke<{ ok: boolean }>('save_settings', { settings })),

  getStarFocusState: () =>
    invoke<StarFocusState | null>('get_star_focus_state'),

  saveStarFocusState: (state: StarFocusState) =>
    persist(invoke<{ ok: boolean }>('save_star_focus_state', { state })),

  testConnection: (settings: { provider: string; apiBase: string; apiKey: string; model: string; preferDianeCredentials?: boolean }) =>
    invoke<{ ok: boolean; message: string }>('test_connection', { settings }),

  dianeCredentialStatus: (provider: string, endpoint: string) =>
    invoke<boolean>('diane_credential_status', { provider, endpoint }),

  checkFirstRun: () =>
    invoke<boolean>('check_first_run'),

  selectFolder: () =>
    invoke<string | null>('select_folder'),

  onFileChanged: (cb: () => void): (() => void) => {
    let disposed = false
    let unlisten: UnlistenFn | null = null
    void listen('file-changed', () => { if (!disposed) cb() }).then(fn_ => {
      if (disposed) fn_()
      else unlisten = fn_
    }).catch(error => {
      if (!disposed) console.error('Could not watch task file changes:', error)
    })
    return () => { disposed = true; unlisten?.(); unlisten = null }
  },
}
