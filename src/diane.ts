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
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function validResult(value: unknown): value is DianeResult {
  return record(value)
    && ['request_id', 'task_key', 'session_id', 'workflow_id', 'project_name', 'summary', 'updated_at'].every(key => typeof value[key] === 'string')
    && typeof value.status === 'string' && Object.prototype.hasOwnProperty.call(statusLabels, value.status)
    && Array.isArray(value.artifacts) && value.artifacts.every(record)
    && (value.stopping === undefined || typeof value.stopping === 'boolean')
}

export function readDianeReceipts(raw: string | null): Record<string, DianeReceipt> {
  const parsed: unknown = JSON.parse(raw || '{}')
  if (!record(parsed) || Object.values(parsed).some(value => {
    if (!record(value) || !record(value.request)) return true
    const request = value.request
    return !['request_id', 'task_key', 'text', 'parent', 'project_id'].every(key => typeof request[key] === 'string')
      || !request.request_id || !request.task_key
      || !Array.isArray(request.steps) || !request.steps.every(step => typeof step === 'string')
      || (value.result !== undefined && !validResult(value.result))
      || (value.error !== undefined && typeof value.error !== 'string')
      || (value.checkedAt !== undefined && typeof value.checkedAt !== 'string')
  })) throw Error('Invalid saved Diane links')
  return parsed as unknown as Record<string, DianeReceipt>
}

export async function dianeRequest<T>(action: string, requestId?: string, body?: unknown): Promise<T> {
  const value: unknown = await invoke('diane_request', { action, requestId, body })
  if (action === 'projects') {
    if (!record(value) || value.version !== 1 || !Array.isArray(value.projects)
      || !value.projects.every(project => record(project) && ['id', 'name', 'root'].every(key => typeof project[key] === 'string'))
      || (value.active_project_id !== null && typeof value.active_project_id !== 'string')) {
      throw Error('Diane returned incompatible project data. Todo remains available.')
    }
  } else if (['dispatch', 'status', 'stop'].includes(action) && !validResult(value)) {
    throw Error('Diane returned incompatible status data. Todo remains available.')
  }
  return value as T
}
export const statusLabels: Record<DianeStatus, string> = {
  queued: 'Queued', running: 'Running', attention: 'Needs attention', ready: 'Result ready', stopped: 'Stopped', failed: 'Failed',
}
