import { invoke } from '@tauri-apps/api/core'

export type DianeStatus = 'queued' | 'running' | 'attention' | 'ready' | 'stopped' | 'failed'
export interface DianeResult {
  request_id: string
  task_key: string
  session_id: string
  workflow_id: string
  project_name: string
  run_id?: string
  status: DianeStatus
  summary: string
  artifacts: Record<string, unknown>[]
  updated_at: string
  stopping: boolean
}
export interface DianeDispatch {
  request_id: string
  task_key: string
  text: string
  parent: string
  steps: string[]
  project_id: string
}
export interface DianeReceipt {
  request: DianeDispatch
  result?: DianeResult
  error?: string
  checkedAt?: string
}
export interface DianeProjects {
  version: number
  projects: { id: string; name: string; root: string }[]
  active_project_id: string | null
}
export const dianeRequest = <T,>(action: string, requestId?: string, body?: unknown) =>
  invoke<T>('diane_request', { action, requestId, body })
export const statusLabels: Record<DianeStatus, string> = {
  queued: 'Queued', running: 'Running', attention: 'Needs attention', ready: 'Result ready', stopped: 'Stopped', failed: 'Failed',
}
