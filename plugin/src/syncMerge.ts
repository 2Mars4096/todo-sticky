// JSON-only, deterministic merge policy mirrored in mobile/services/sync_merge.dart.
export type MergeChoices = Record<string, 'local' | 'cloud'>
export interface MergeIssue { path: string; label: string; local: unknown; cloud: unknown }
export interface MergeResult { payload: Record<string, unknown> | null; issues: MergeIssue[] }
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .filter(key => (value as Record<string, unknown>)[key] !== undefined)
    .map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}'
  return JSON.stringify(value) ?? 'null'
}
const missing = Symbol('absent')
const fields: Record<string, string> = { text: 'Text', status: 'Status', done: 'Completed', doneWhen: 'Outcome', by: 'Due date', originalBy: 'Original due date', deadlineChanges: 'Deadline history', goalId: 'Project', goalStepId: 'Project step' }
const collections = new Set(['tasks', 'subtasks', 'targets', 'recurring', 'plan'])
const object = (v: any): v is Record<string, any> => v !== missing && v !== null && typeof v === 'object' && !Array.isArray(v)
const same = (a: any, b: any) => a === missing || b === missing ? a === b : canonical(a) === canonical(b)
const copy = (v: any): any => v === missing ? missing : JSON.parse(JSON.stringify(v))
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const child = (path: string, key: string) => path + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1')

/** `hasAncestor=false` means unknown history, never evidence of deletion. */
export function mergeSyncPayload(key: string, ancestor: unknown, local: unknown, cloud: unknown, hasAncestor: boolean, choices: MergeChoices = {}, atomicTasks = false): MergeResult {
  const logical = (value: unknown) => value !== null ? value : key === 'goals' ? { targets: [], recurring: [] } : key.startsWith('day:') ? { date: key.slice(4), tasks: [] } : null
  ancestor = logical(ancestor); local = logical(local); cloud = logical(cloud)
  const issues: MergeIssue[] = []
  const conflict = (path: string, label: string, left: any, right: any, displayLeft = left, displayRight = right) => {
    issues.push({ path, label, local: displayLeft === missing ? null : copy(displayLeft), cloud: displayRight === missing ? null : copy(displayRight) })
    return copy(choices[path] === 'cloud' ? right : left)
  }
  const visit = (base: any, left: any, right: any, path: string, label: string, field: string): any => {
    if (same(left, right)) return copy(left)
    if (same(left, base)) return copy(right)
    if (same(right, base)) return copy(left)
    if (key.startsWith('focus:')) return conflict(path, 'Focus session', left, right)
    if (left === missing || right === missing || left === null || right === null) return conflict(path, label, left, right)
    if (atomicTasks && /^\/tasks\/[^/]+$/.test(path)) return conflict(path, label, left, right)
    if (Array.isArray(left) && Array.isArray(right) && collections.has(field) && (base === missing || Array.isArray(base))) {
      const lists: any[][] = [base === missing ? [] : base, left, right]
      if (lists.some(list => list.some(item => !object(item) || typeof item.id !== 'string') || new Set(list.map(item => item.id)).size !== list.length)) return conflict(path, label, left, right)
      const maps = lists.map(list => new Map<string, any>(list.map(item => [item.id, item])))
      const ids = [...new Set(lists.flatMap(list => list.map(item => item.id)))].sort(compare)
      const merged = new Map<string, any>()
      for (const id of ids) {
        const values = maps.map(map => map.has(id) ? map.get(id) : missing)
        const item = values.find(value => value !== missing)
        const name = String(item?.text || item?.taskText || label)
        const value = visit(values[0], values[1], values[2], child(path, id), name, 'item')
        if (value !== missing) merged.set(id, value)
      }
      // Respect one-sided reordering. Independent insertions in the same gap
      // are ordered by stable ID, so swapping local/cloud converges identically.
      const sequences = lists.map(list => list.map(item => item.id).filter(id => merged.has(id)))
      const oldIds = new Set(sequences[0])
      const original = sequences[0], l = sequences[1].filter(id => oldIds.has(id)), r = sequences[2].filter(id => oldIds.has(id))
      const sameOrder = (a: string[], b: string[]) => same(a.filter(id => b.includes(id)), b.filter(id => a.includes(id)))
      const leftMoved = !sameOrder(original, l), rightMoved = !sameOrder(original, r)
      const incompatible = leftMoved && rightMoved && !sameOrder(l, r)
      const skeleton = leftMoved ? l : rightMoved ? r : original
      const edges = new Map(ids.filter(id => merged.has(id)).map(id => [id, new Set<string>()]))
      const edge = (a: string, b: string) => { if (a !== b) edges.get(a)?.add(b) }
      for (let i = 1; i < skeleton.length; i++) edge(skeleton[i - 1], skeleton[i])
      for (const seq of sequences.slice(1)) for (let i = 1; i < seq.length; i++) if (!oldIds.has(seq[i - 1]) || !oldIds.has(seq[i])) edge(seq[i - 1], seq[i])
      const degree = new Map([...edges.keys()].map(id => [id, 0]))
      for (const after of edges.values()) for (const id of after) degree.set(id, degree.get(id)! + 1)
      const ready = [...degree.keys()].filter(id => degree.get(id) === 0).sort(compare), order: string[] = []
      while (ready.length) {
        const id = ready.shift()!; order.push(id)
        for (const next of edges.get(id)!) { degree.set(next, degree.get(next)! - 1); if (degree.get(next) === 0) { ready.push(next); ready.sort(compare) } }
      }
      if (incompatible || order.length !== merged.size) {
        const fallback = (preferred: string[], other: string[]) => {
          const result = [...preferred]
          for (const id of other) if (!result.includes(id)) {
            const position = other.indexOf(id), next = other.slice(position + 1).find(candidate => result.includes(candidate))
            if (next) result.splice(result.indexOf(next), 0, id); else result.push(id)
          }
          return result
        }
        const lo = fallback(sequences[1], sequences[2]), ro = fallback(sequences[2], sequences[1])
        const display = (seq: string[]) => seq.map(id => merged.get(id)?.text || id)
        const chosen = conflict(child(path, '$order'), label + ' · Order', lo, ro, display(lo), display(ro))
        return chosen.map((id: string) => merged.get(id))
      }
      return order.map(id => merged.get(id))
    }
    if (object(left) && object(right) && (base === missing || object(base))) {
      const result: Record<string, any> = Object.create(null)
      const names = new Set([...Object.keys(base === missing ? {} : base), ...Object.keys(left), ...Object.keys(right)])
      const taskLink = Array.isArray(left.subtasks) && Array.isArray(right.subtasks)
      if (taskLink) { names.delete('goalId'); names.delete('goalStepId') }
      for (const name of [...names].sort(compare)) {
        const at = (v: any) => v !== missing && Object.prototype.hasOwnProperty.call(v, name) ? v[name] : missing
        const value = visit(at(base), at(left), at(right), child(path, name), fields[name] ? label + ' · ' + fields[name] : label, name)
        if (value !== missing) result[name] = value
      }
      if (taskLink) {
        const link = (value: any) => value === missing ? missing : Object.fromEntries(['goalId', 'goalStepId'].filter(name => Object.prototype.hasOwnProperty.call(value, name)).map(name => [name, value[name]]))
        const b = link(base), l = link(left), r = link(right)
        const value = same(l, r) ? l : same(l, b) ? r : same(r, b) ? l : b === missing && (!Object.keys(l).length || !Object.keys(r).length) ? Object.keys(l).length ? l : r : conflict(child(path, '$project'), label + ' · Project', l, r)
        Object.assign(result, value)
      }
      // New unfinished steps reopen a completed parent, matching task insertion.
      if (key.startsWith('day:') && result.status === 'done' && Array.isArray(result.subtasks) && result.subtasks.some((task: any) => task.status !== 'done')) {
        result.status = 'todo'
        if (result.finish?.reviewReady) result.finish = { ...result.finish, reviewReady: false }
      }
      return result
    }
    return conflict(path, label, left, right)
  }
  const payload = visit(hasAncestor ? ancestor : missing, local, cloud, '', key === 'goals' ? 'Goals and routines' : key.startsWith('day:') ? key.slice(4) : 'Focus session', 'record')
  return { payload: payload === missing ? null : payload, issues }
}

export function mergeValueText(value: unknown): string {
  if (value === null || value === undefined) return 'Deleted'
  if (typeof value === 'boolean') return value ? 'Complete' : 'Open'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(mergeValueText).join('\n') || 'Empty'
  const item = value as Record<string, unknown>
  if (item.goalId) return `Project: ${item.goalId}${item.goalStepId ? '\nProject step: ' + item.goalStepId : ''}`
  if (typeof item.text === 'string') return [item.text, ...(Array.isArray(item.subtasks) ? item.subtasks.map(mergeValueText) : [])].join('\n')
  return Object.entries(item).filter(([key]) => !['id', 'goalId', 'goalStepId'].includes(key)).map(([key, val]) => fields[key] ? fields[key] + ': ' + mergeValueText(val) : mergeValueText(val)).join('\n')
}
