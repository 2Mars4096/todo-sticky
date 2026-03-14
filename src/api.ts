import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { AggregatedTask, Task, AppSettings } from './types'

export const api = {
  getTasks: (dateStr: string) =>
    invoke<{ tasks: AggregatedTask[]; filePath?: string; weekStart?: string }>('get_tasks', { dateStr }),

  saveTasks: (data: { filePath: string; dateStr: string; tasks: Task[] }) =>
    invoke<{ ok: boolean }>('save_tasks', data),

  createDateSection: (data: { dateStr: string; tasks: Task[] }) =>
    invoke<{ filePath: string; weekStart: string }>('create_date_section', data),

  appendTasksToDate: (data: { dateStr: string; tasks: Task[] }) =>
    invoke<{ filePath: string; weekStart: string }>('append_tasks_to_date', data),

  pushTask: (data: { fromDate: string; toDate: string; taskText: string; subtaskTexts: string[] }) =>
    invoke<{ ok: boolean; filePath: string }>('push_task', data),

  listWeeklyFiles: () =>
    invoke<string[]>('list_weekly_files'),

  llmBreakdown: (data: { taskText: string; existingSubtasks: string[] }) =>
    invoke<{ subtasks: { text: string; estimatedMinutes?: number; machineTask?: boolean }[] }>('llm_breakdown', data),

  llmSchedule: (data: { tasks: any[]; machines: any[] }) =>
    invoke<{ plan: string; schedule: any[] }>('llm_schedule', data),

  getSettings: () =>
    invoke<AppSettings>('get_settings'),

  saveSettings: (settings: AppSettings) =>
    invoke<{ ok: boolean }>('save_settings', { settings }),

  testConnection: (settings: { provider: string; apiBase: string; apiKey: string; model: string }) =>
    invoke<{ ok: boolean; message: string }>('test_connection', { settings }),

  checkFirstRun: () =>
    invoke<boolean>('check_first_run'),

  selectFolder: () =>
    invoke<string | null>('select_folder'),

  onFileChanged: (cb: () => void): (() => void) => {
    let unlisten: UnlistenFn | null = null
    listen('file-changed', () => cb()).then(fn_ => { unlisten = fn_ })
    return () => { unlisten?.() }
  },
}
