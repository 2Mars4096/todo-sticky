import { canonical, type SyncAction, type SyncPayload, type CloudRecord } from './cloudSync'
export interface SyncRecoveryEntry { key: string; local: SyncPayload; remote: CloudRecord | null; at: string }
export function conflictFingerprint(value: Pick<SyncAction, 'key' | 'local' | 'remote'>): string {
  return canonical({ key: value.key, local: value.local, remote: value.remote && { revision: value.remote.revision, deleted: value.remote.deleted, payload: value.remote.payload } })
}
export function preserveConflict(copies: SyncRecoveryEntry[], action: SyncAction, at = new Date().toISOString()): boolean {
  const fingerprint = conflictFingerprint(action)
  if (copies.some(copy => conflictFingerprint(copy) === fingerprint)) return false
  copies.push(JSON.parse(JSON.stringify({ key: action.key, local: action.local, remote: action.remote, at })))
  return true
}
export function reviewedConflictMatches(actions: SyncAction[], key: string, fingerprint: string): boolean {
  const current = actions.find(action => action.key === key)
  return Boolean(current?.kind === 'conflict' && conflictFingerprint(current) === fingerprint)
}
export interface ConflictRow { id: string; text: string; status: string; depth: number; group: string; path: string; details: string[]; fingerprint: string }
const object = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {}
const list = (v: unknown): Record<string, any>[] => Array.isArray(v) ? v.map(object) : []
export function conflictRows(key: string, payload: SyncPayload): ConflictRow[] {
  if (!payload) return []
  const rows: ConflictRow[] = []
  const add = (item: Record<string, any>, depth: number, group: string, path: string, details: string[] = []) => {
    const { subtasks: _, ...fields } = item
    rows.push({ id: String(item.id ?? path), text: String(item.text ?? item.taskText ?? ''), status: String(item.status ?? (item.done ? 'done' : 'todo')), depth, group, path, details, fingerprint: canonical(fields) })
  }
  if (key.startsWith('day:')) {
    const tasks = (items: unknown, depth = 0, path = '') => list(items).forEach((item, index) => {
      const finish = object(item.finish), details: string[] = []
      if (finish.doneWhen) details.push(`Outcome: ${finish.doneWhen}`)
      if (finish.by) details.push(`Due: ${finish.by}`)
      if (finish.originalBy && finish.originalBy !== finish.by) details.push(`Original due: ${finish.originalBy}`)
      if (finish.reviewReady) details.push('Ready for review')
      for (const change of list(finish.deadlineChanges)) details.push(`${change.from ?? 'No date'} → ${change.to ?? 'No date'} · ${change.at ?? ''}`)
      const position = `${path}/${index}`
      add(item, depth, '', position, details)
      tasks(item.subtasks, depth + 1, position)
    })
    tasks(payload.tasks)
  } else if (key === 'goals') {
    for (const [field, title] of [['targets', 'Goals'], ['recurring', 'Routines']]) list(payload[field]).forEach((item, index) => {
      const path = `${field}/${index}`
      add(item, 0, title, path)
      list(item.plan).forEach((step, stepIndex) => add(step, 1, title, `${path}/plan/${stepIndex}`))
    })
  } else {
    const p = object(payload), date = new Date(Number(p.completedAt))
    add(p, 0, '', 'focus', [`${p.durationMinutes} min planned`, `Route: ${p.orbitLabel}`, `Vehicle: ${p.vehicleCode}`, Number.isNaN(date.getTime()) ? '' : date.toLocaleString()].filter(Boolean))
  }
  return rows
}
export function rowDifference(row: ConflictRow, other: ConflictRow[]): string {
  const match = other.find(value => value.id === row.id)
  return !match ? 'Only here' : row.fingerprint !== match.fingerprint ? 'Changed' : row.path !== match.path ? 'Moved' : ''
}
export function visibleConflictRows(rows: ConflictRow[], other: ConflictRow[], differencesOnly: boolean): ConflictRow[] {
  if (!differencesOnly) return rows
  const changed = rows.filter(row => rowDifference(row, other))
  return rows.filter(row => changed.some(value => value.id === row.id || value.path.startsWith(row.path + '/')))
}
