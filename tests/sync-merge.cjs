const assert = require('node:assert/strict')
const fs = require('node:fs')
const load = require('./helpers/load-typescript.cjs')
const { canonical, mergeSyncPayload } = load('src/syncMerge.ts')
const { reconcile, validateRecords } = load('src/cloudSync.ts', {}, { URL })
for (const c of JSON.parse(fs.readFileSync('tests/fixtures/sync-merge.json'))) {
  const before = canonical(c)
  const result = mergeSyncPayload(c.key, c.ancestor, c.local, c.cloud, c.hasAncestor, c.choices)
  assert.equal(canonical(result.payload), canonical(c.expected), c.name)
  assert.equal(canonical(result.issues.map(issue => issue.path)), canonical(c.issuePaths), c.name)
  validateRecords([{ key: c.key, payload: result.payload, deleted: result.payload === null, revision: 1 }])
  if (!result.issues.length) {
    const reverse = mergeSyncPayload(c.key, c.ancestor, c.cloud, c.local, c.hasAncestor)
    assert.equal(canonical(reverse.payload), canonical(result.payload), c.name + ': direction-independent convergence')
  }
  assert.equal(canonical(c), before, c.name + ': input snapshots remain immutable')
  const remote = { key: c.key, payload: c.cloud, deleted: c.cloud === null, revision: 2 }
  const action = reconcile(c.local ? { [c.key]: c.local } : {}, [remote], c.hasAncestor ? { [c.key]: { revision: 1, deleted: c.ancestor === null, payload: c.ancestor } } : {})[0]
  if (action?.kind === 'merge') assert.equal(action.merge.issues.length, 0)
}
console.log('Passed shared three-way merge fixtures, per-field choices, deletions, nested tasks, ordering, immutability and direction-independent convergence')
