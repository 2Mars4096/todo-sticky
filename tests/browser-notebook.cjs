const assert = require('node:assert/strict')
const load = require('./helpers/load-typescript.cjs')

// Exercise the browser command boundary with a single-key asynchronous store.
const rows = new Map()
const db = {
  transaction() {
    const tx = {
      abort() { queueMicrotask(() => tx.onabort()) },
      objectStore() {
        return {
          get(key) {
            const request = { result: rows.get(key) }
            queueMicrotask(() => request.onsuccess())
            return request
          },
          put(tasks, key) {
            rows.set(key, structuredClone(tasks))
            queueMicrotask(() => tx.oncomplete())
          },
        }
      },
    }
    return tx
  },
}
const indexedDB = { open() {
  const request = { result: db }
  queueMicrotask(() => request.onsuccess())
  return request
} }
const { browserCommand } = load('src/browserNotebook.ts', {}, { indexedDB })
const date = '2026-11-20'
const task = text => ({ id: 'proposal', text, status: 'todo', subtasks: [] })
async function run() {
  const initial = [task('Review proposal')]
  const first = await browserCommand('create_date_section', { dateStr: date, tasks: initial })
  const incoming = [task('Updated in sync')]
  await browserCommand('cloud_apply_day', { date, expectedKbPath: 'Browser notebook', expectedTasks: initial, tasks: incoming })
  await assert.rejects(browserCommand('save_tasks', { dateStr: date, tasks: [], expectedRevision: first.revision }), /day changed/)
  await assert.rejects(browserCommand('create_date_section', { dateStr: date, tasks: [] }), /day changed/)
  await assert.rejects(browserCommand('push_task', {
    toDate: date, parentSnapshot: task('Different proposal'), taskSnapshot: { ...task('Move step'), id: 'step' },
  }), /day changed/)
  assert.deepEqual(rows.get(date), incoming)
  rows.set(date, null)
  await assert.rejects(browserCommand('create_date_section', { dateStr: date, tasks: [] }), /invalid record/)
  assert.equal(rows.get(date), null)
  const { taskAssignment, editorWorkspaces } = load('src/suiteWorkspace.ts', {}, { crypto, TextEncoder })
  const members = await editorWorkspaces(async path => path.endsWith('?cursor=next')
    ? { workspaces: [{ id: 'workspace', role: 'editor', name: 'Team' }] }
    : { workspaces: [{ id: 'other', role: 'viewer', name: 'Read only' }], nextCursor: 'next' })
  assert.equal(members.length, 1)
  const proposal = { ...task('Review proposal'), subtasks: [{ ...task('Check budget'), id: 'step' }] }
  const assignment = await taskAssignment('member', members[0].id, date, proposal, 'editor')
  assert.equal(assignment.path, '/shiprite/workspaces/workspace/assignments/5de11d38-9c01-8ee9-9f8f-da03e2761304')
  assert.equal(assignment.body.instructions, 'Review proposal\n- Check budget')
  console.log('Browser notebook kept the synced proposal after stale replacement and creation attempts.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
