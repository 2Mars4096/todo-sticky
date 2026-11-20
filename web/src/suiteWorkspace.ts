import type { Task } from './types'

export const workspacePath = '/api/connected-apps/workspaces'
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/
export interface Membership { id: string; name: string; role: 'viewer' | 'editor' }
export async function editorWorkspaces(get: (path: string) => Promise<any>) {
  const found = new Map<string, Membership>()
  const cursors = new Set<string>()
  let cursor = ''
  do {
    const page = await get(workspacePath + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''))
    if (!Array.isArray(page?.workspaces)) throw Error('Could not read workspace memberships.')
    for (const row of page.workspaces) {
      if (row?.role === 'editor' && typeof row.id === 'string' && idPattern.test(row.id) && typeof row.name === 'string') found.set(row.id, row)
    }
    cursor = page.nextCursor ?? ''
    if (typeof cursor !== 'string' || (cursor && (!idPattern.test(cursor) || cursors.has(cursor)))) throw Error('Could not finish loading workspaces.')
    cursors.add(cursor)
  } while (cursor)
  return [...found.values()]
}

const selectionKey = (uid: string) => 'dockit-workspace-v1:dear-diane-202610:' + uid
export function selectedWorkspace(uid: string) {
  const id = localStorage.getItem(selectionKey(uid))
  if (id && !idPattern.test(id)) throw Error('Choose a valid pipedreams workspace in Account.')
  return id || ''
}
export function chooseWorkspace(uid: string, id: string) {
  if (id && !idPattern.test(id)) throw Error('Invalid workspace.')
  if (id) localStorage.setItem(selectionKey(uid), id)
  else localStorage.removeItem(selectionKey(uid))
}

export async function taskAssignment(uid: string, workspace: string, date: string, task: Task, assigneeUid: string) {
  if (!idPattern.test(workspace)) throw Error('Choose a workspace.')
  const lines: string[] = [task.text.trim()]
  const steps = (items: Task[], indent: string) => {
    for (const item of items) { lines.push(indent + '- ' + item.text); steps(item.subtasks, indent + '  ') }
  }
  steps(task.subtasks, '')
  const instructions = lines.join('\n')
  if (!lines[0] || [...instructions].length > 12000 || [...assigneeUid].length > 128) throw Error('Use a task with at most 12,000 characters including its steps and a valid member UID.')
  const identity = JSON.stringify(['dockit-v1', uid, workspace, date, task.id, assigneeUid])
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity)))
  bytes[6] = (bytes[6] & 15) | 128
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes.slice(0,16), n => n.toString(16).padStart(2,'0')).join('')
  const id = [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-')
  return {id, path: '/shiprite/workspaces/' + workspace + '/assignments/' + id,
    body: {title: [...lines[0]].slice(0, 200).join(''), instructions, assigneeUid: assigneeUid || null}}
}
