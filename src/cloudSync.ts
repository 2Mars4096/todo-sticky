// Shared, deterministic three-way reconciliation. No network or UI dependencies.
export type SyncPayload = Record<string, unknown> | null
export interface CloudRecord {
  key: string
  revision: number
  deleted: boolean
  payload: SyncPayload
  updatedAt: string
  mutationId: string
}
export interface SyncBaseline { revision: number; payload: SyncPayload; deleted: boolean; payloadSchemaVersion?: number }
export interface SyncAction {
  key: string
  kind: 'push' | 'pull' | 'ack' | 'conflict'
  local: SyncPayload
  remote: CloudRecord | null
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .filter(key => (value as Record<string, unknown>)[key] !== undefined)
    .map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}'
  return JSON.stringify(value) ?? 'null'
}

function empty(key: string, payload: SyncPayload): boolean {
  if (!payload) return true
  if (key.startsWith('day:')) return Array.isArray(payload.tasks) && payload.tasks.length === 0
  if (key === 'goals') return Array.isArray(payload.targets) && Array.isArray(payload.recurring) && !payload.targets.length && !payload.recurring.length
  return false
}

export function reconcile(local: Record<string, SyncPayload>, cloud: CloudRecord[], baseline: Record<string, SyncBaseline>): SyncAction[] {
  const remote = new Map(cloud.map(record => [record.key, record]))
  const keys = new Set([...Object.keys(local), ...remote.keys(), ...Object.keys(baseline)])
  const actions: SyncAction[] = []
  for (const key of [...keys].sort()) {
    const left = local[key] ?? null
    const record = remote.get(key) ?? null
    const right = record?.deleted ? null : record?.payload ?? null
    const base = baseline[key]
    // Pruning a device's Focus display is not a request to erase cloud history.
    if (key.startsWith('focus:') && !left && base && canonical(base.payload) === canonical(right)) continue
    let kind: SyncAction['kind']
    if (canonical(left) === canonical(right) || (empty(key, left) && record?.deleted)) kind = 'ack'
    else if (!base) {
      if (empty(key, left) && record) kind = 'pull'
      else if (!record) kind = 'push'
      else kind = 'conflict'
    } else if (!record && base.revision > 0) kind = 'conflict'
    else if (canonical(left) === canonical(base.deleted ? null : base.payload)) kind = 'pull'
    else if (record?.revision === base.revision) kind = 'push'
    else kind = 'conflict'
    if (kind === 'ack' && !record) continue
    actions.push({ key, kind, local: left, remote: record })
  }
  return actions
}

export function validateRecords(value: unknown): CloudRecord[] {
  if (!Array.isArray(value)) throw new Error('The sync service returned an invalid record list.')
  const keys = new Set<string>()
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.key !== 'string'
      || !/^(day:\d{4}-\d{2}-\d{2}|goals|focus:[A-Za-z0-9_-]{1,128})$/.test(item.key)
      || keys.has(item.key) || !Number.isSafeInteger(item.revision) || item.revision < 1
      || typeof item.deleted !== 'boolean' || (item.deleted ? item.payload !== null : !validPayload(item.key, item.payload))) {
      throw new Error('The sync service returned an invalid record. No local data was changed.')
    }
    keys.add(item.key)
    return item as CloudRecord
  })
}

function validDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}
function validText(value: unknown): value is string { return typeof value === 'string' && Boolean(value.trim()) && value.length <= 5000 }

export function hasGoalPlanningMetadata(payload: SyncPayload): boolean {
  if (!payload) return false
  const tasks = (items: unknown): boolean => Array.isArray(items) && items.some(item => item && typeof item === 'object'
    && ('goalId' in item || 'goalStepId' in item || tasks(item.subtasks)))
  return tasks(payload.tasks) || ['targets', 'recurring'].some(name => Array.isArray(payload[name])
    && (payload[name] as any[]).some(item => item && typeof item === 'object' && 'plan' in item))
}

export function goalPlanningSupported(config: any): boolean {
  return config?.schemaVersion === 1 && config?.goalPlanning === true
    && Array.isArray(config.payloadSchemaVersions) && config.payloadSchemaVersions.includes(2)
}

/** Upgrade a v1 projection of the SAME revision without treating hidden fields as user deletions. */
export function migrateGoalMetadata(local: SyncPayload, remote: CloudRecord, baseline?: SyncBaseline): { local: SyncPayload; baseline?: SyncBaseline } {
  if (!baseline || baseline.payloadSchemaVersion === 2 || baseline.deleted || remote.deleted
    || baseline.revision !== remote.revision || !baseline.payload || !remote.payload) return { local, baseline }
  const restore = (value: SyncPayload): SyncPayload => {
    if (!value) return value
    const result = JSON.parse(JSON.stringify(value))
    if (remote.key.startsWith('day:')) {
      const index = (items: any): Map<string, any> => {
        const found = new Map<string, any>()
        const visit = (tasks: any) => { if (Array.isArray(tasks)) for (const task of tasks) { found.set(task.id, task); visit(task.subtasks) } }
        visit(items); return found
      }
      const known = index(baseline.payload!.tasks), source = index(remote.payload!.tasks)
      for (const task of index(result.tasks).values()) {
        const old = known.get(task.id), other = source.get(task.id)
        if (!old || !other) continue
        if (!('goalId' in old) && !('goalId' in task) && 'goalId' in other) task.goalId = other.goalId
        if (!('goalStepId' in old) && !('goalStepId' in task) && 'goalStepId' in other && task.goalId === other.goalId) task.goalStepId = other.goalStepId
      }
    } else if (remote.key === 'goals') {
      for (const name of ['targets', 'recurring']) {
        const known = new Map<string, any>((baseline.payload![name] as any[]).map(goal => [goal.id, goal]))
        const source = new Map<string, any>((remote.payload![name] as any[]).map(goal => [goal.id, goal]))
        for (const goal of result[name]) {
          const old = known.get(goal.id), other = source.get(goal.id)
          if (old && other && !('plan' in old) && !('plan' in goal) && 'plan' in other) goal.plan = JSON.parse(JSON.stringify(other.plan))
        }
      }
    }
    return result
  }
  return { local: restore(local), baseline: { ...baseline, payload: restore(baseline.payload), payloadSchemaVersion: 2 } }
}

function validPayload(key: string, payload: any): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  if (key.startsWith('day:')) {
    if (payload.date !== key.slice(4) || !validDate(payload.date)) return false
    const ids = new Set<string>()
    let count = 0
    const tasks = (items: any, depth: number): boolean => Array.isArray(items) && depth <= 12 && items.every(item => {
      if (!item || !validId(item.id) || ids.has(item.id) || (typeof item.text !== 'string' || item.text.length > 5000)
        || !['todo', 'done', 'partial', 'question', 'stopped'].includes(item.status) || ++count > 2000) return false
      ids.add(item.id)
      if (item.goalId !== undefined && !validId(item.goalId)) return false
      if (item.goalStepId !== undefined && (!validId(item.goalStepId) || !validId(item.goalId))) return false
      const finish = item.finish
      if (finish != null) {
        if (typeof finish !== 'object' || Array.isArray(finish)) return false
        if (finish.doneWhen !== undefined && (typeof finish.doneWhen !== 'string' || finish.doneWhen.length > 5000)) return false
        for (const name of ['by', 'originalBy']) if (finish[name] !== undefined && finish[name] !== '' && !validDate(finish[name])) return false
        if (finish.reviewReady !== undefined && typeof finish.reviewReady !== 'boolean') return false
        if (finish.deadlineChanges !== undefined && (!Array.isArray(finish.deadlineChanges) || !finish.deadlineChanges.every((change: any) => change && (change.from === null || validDate(change.from)) && (change.to === null || validDate(change.to)) && typeof change.at === 'string'))) return false
      }
      return tasks(item.subtasks, depth + 1)
    })
    return tasks(payload.tasks, 0)
  }
  if (key === 'goals') return ['targets', 'recurring'].every(name => {
    const ids = new Set<string>()
    return Array.isArray(payload[name]) && payload[name].length <= 2000 && payload[name].every((item: any) => {
      if (!item || !validId(item.id) || ids.has(item.id) || !validText(item.text) || typeof item.done !== 'boolean') return false
      if (item.plan !== undefined) {
        const steps = new Set<string>()
        if (!Array.isArray(item.plan) || item.plan.length > 200 || !item.plan.every((step: any) => {
          if (!step || typeof step !== 'object' || Object.keys(step).some(key => !['id', 'text'].includes(key))
            || !validId(step.id) || steps.has(step.id) || !validText(step.text)) return false
          steps.add(step.id); return true
        })) return false
      }
      ids.add(item.id); return true
    })
  })
  return payload.id === key.slice(6) && validId(payload.id)
    && ['taskId', 'taskText', 'vehicleCode', 'orbitLabel'].every(name => validText(payload[name]))
    && ['durationMinutes', 'completedAt', 'orbitIndex'].every(name => typeof payload[name] === 'number' && Number.isFinite(payload[name]) && payload[name] >= 0 && payload[name] <= 10 ** 15)
}

export function syncServerUrl(value: string): string {
  const url = new URL(value.trim())
  if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) throw new Error('Enter the service origin, such as https://sticky-sync.example.com.')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('The sync service must use HTTPS.')
  return url.origin
}
