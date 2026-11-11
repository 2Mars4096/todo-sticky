import { dianeRequest, type DianeProjects } from './diane'
import { canonical } from './syncMerge'

type RecordValue = Record<string, any>
export interface SetupSuggestion { project_id: string | null; context: string; reason: string }
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('')

export async function executionContract(record: RecordValue) {
  const fields = Object.fromEntries(['schema_version', 'title', 'text', 'status', 'tags', 'relationships', 'attachments', 'extensions'].map(key => [key, structuredClone(record[key] ?? null)]))
  for (const key of ['date', 'order', 'planned_minutes']) if (fields.extensions) delete fields.extensions[key]
  for (const link of fields.relationships ?? []) if (link.target) delete link.target.unresolved
  return hash(canonical(fields))
}

export async function suggestDianeSetup(input: { id: string; date: string; text: string; parent: string; steps: string[]; projects: DianeProjects['projects'] }): Promise<SetupSuggestion> {
  const { scope } = await dianeRequest<{ scope: string }>('connection')
  if (!scope) throw Error('Sign into Diane before requesting setup suggestions.')
  let cursor: string | undefined, found: RecordValue | undefined
  const cursors = new Set<string>()
  for (let page = 0; page < 20; page++) {
    const result = await dianeRequest<{ items: RecordValue[]; next_cursor?: string }>('preparation-records', undefined, { scope, cursor })
    if (!Array.isArray(result.items)) throw Error('Diane returned incompatible task records.')
    for (const record of result.items) {
      if (record.deleted || record.deleted_at || record.record_type !== 'task') continue
      const source = record.extensions?.source
      let id = source?.app === 'todo-sticky' ? source.id : record.record_id
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(id ?? '')) id = 'diane_' + (await hash('task:' + record.record_id)).slice(0, 40)
      const date = record.extensions?.date || record.created_at?.slice(0, 10)
      if (id === input.id && date === input.date) {
        if (found) throw Error('More than one synced task matches. Resolve sync before preparing.')
        found = record
      }
    }
    cursor = result.next_cursor
    if (!cursor) break
    if (page === 19 || cursors.has(cursor)) throw Error('The task archive is too large to prepare safely. Use manual setup.')
    cursors.add(cursor)
  }
  if (!found || (found.text || found.title) !== input.text) throw Error('Sync this task with the same Diane account first, or set up the session manually.')
  const candidates = input.projects.filter(p => p.root).map(p => ({ project_id: p.id, name: p.name, root: p.root }))
  if (!candidates.length || candidates.length > 100) throw Error('Choose a local Diane workspace first.')
  const payload = { action: 'prepare', sources: [{ record_id: found.record_id, revision: found.revision }], workspace_candidates: candidates,
    preparation_context: JSON.stringify({ parent: input.parent, steps: input.steps }), preparation_contract: await executionContract(found) }
  if (payload.preparation_context.length > 16000) throw Error('Shorten the task context before requesting suggestions.')
  const key = 'sticky-todo-setup-v1:' + await hash(canonical([scope, payload]))
  let result: any
  const saved = localStorage.getItem(key)
  if (saved) {
    const receipt = await dianeRequest<any>('preparation-status', saved, { scope })
    if (receipt.status !== 'completed') throw Error(receipt.detail || 'Preparation is pending or uncertain. Check again later; no duplicate request was sent.')
    result = receipt.result
  } else {
    const request_id = crypto.randomUUID()
    localStorage.setItem(key, request_id) // Preserve identity before a potentially billable request.
    result = await dianeRequest<any>('prepare', undefined, { scope, payload: { ...payload, request_id } })
  }
  const current = await dianeRequest<{ scope: string }>('connection')
  if (current.scope !== scope) throw Error('The Diane account changed. Reopen setup.')
  const suggestion = result?.suggestion
  if (!suggestion || typeof suggestion.context !== 'string' || suggestion.context.length > 4000 || typeof suggestion.reason !== 'string'
    || (suggestion.project_id !== null && !candidates.some(p => p.project_id === suggestion.project_id))) throw Error('Diane returned incompatible setup suggestions.')
  return suggestion
}
