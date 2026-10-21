const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Exercise the real hook with deterministic state and debounce scheduling.
let state, pendingSave, saved
const exportsObject = {}
const source = ts.transpileModule(fs.readFileSync('src/hooks/useTasks.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
vm.runInNewContext(source, {
  exports: exportsObject,
  console,
  setTimeout: callback => { pendingSave = callback; return 1 },
  clearTimeout: () => {},
  require: name => {
    if (name === 'react') return {
      useState: initial => [initial, update => { if (typeof update === 'function') state = update(state) }],
      useCallback: fn => fn,
      useRef: current => ({ current }),
      useEffect: () => {},
    }
    if (name === '../api') return { api: {
      createDateSection: async payload => { saved = payload; return { filePath: 'test.md' } },
    } }
    if (name === '../taskCarryForward') return { resolveTaskCarryForwardTarget: () => ({ dateStr: '2026-09-23' }) }
    if (name === '../taskHistory' || name === '../taskPlanning') return require('./helpers/load-typescript.cjs')(`src/${name.slice(3)}.ts`)
    if (name === '../taskRollover') {
      const out = {}
      vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/taskRollover.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: out })
      return out
    }
    throw new Error(`Unexpected import: ${name}`)
  },
})
const task = (id, status = 'todo') => ({ id, text: id, status, subtasks: [] })
const parent = (statuses, status = 'todo') => ({
  id: 'parent', text: 'Parent', status,
  todaySubtasks: statuses.map((status, i) => task(`step${i}`, status)),
  otherSubtasks: [{ ...task('historical'), sourceDate: '2026-09-21' }],
})
async function toggle(initial, subtaskId) {
  state = [initial, { ...parent([]), id: 'unrelated' }]
  exportsObject.useTasks('2026-09-22').toggleStatus('parent', subtaskId)
  await pendingSave()
  assert.equal(saved.tasks[0].status, state[0].status)
  assert.equal(saved.tasks[0].subtasks[0]?.status, state[0].todaySubtasks[0]?.status)
  assert.equal(state[1].status, 'todo')
  return state[0]
}
;(async () => {
  assert.equal((await toggle(parent(['done', 'todo']), 'step1')).status, 'done')
  assert.equal((await toggle(parent(['todo']), 'step0')).status, 'done')
  assert.equal((await toggle(parent(['todo', 'todo']), 'step0')).status, 'todo')
  assert.equal((await toggle(parent(['todo', 'partial'], 'question'), 'step0')).status, 'question')
  assert.equal((await toggle(parent(['todo', 'question']), 'step0')).status, 'todo')
  assert.equal((await toggle(parent([]), 'missing')).status, 'todo')
  assert.equal((await toggle(parent(['done']), 'missing')).status, 'todo')
  assert.equal((await toggle(parent(['done'], 'done'), 'step0')).status, 'partial')
  assert.equal((await toggle(parent(['done'], 'done'))).status, 'partial')
  const nested = parent(['todo', 'partial'])
  nested.todaySubtasks[0].subtasks = [task('grandchild')]
  const completed = await toggle(nested)
  assert.equal(completed.status, 'done')
  assert.ok(completed.todaySubtasks.every(s => s.status === 'done'))
  assert.equal(completed.todaySubtasks[0].subtasks[0].status, 'done')
  assert.equal(completed.otherSubtasks[0].status, 'todo')
  const promised = { ...parent(['todo']), finish: { doneWhen: 'Someone can use it', by: '2026-10-23' } }
  const awaiting = await toggle(promised, 'step0')
  assert.equal(awaiting.status, 'partial')
  assert.equal(awaiting.finish.reviewReady, true)
  assert.equal(saved.tasks[0].finish.by, '2026-10-23')
  const manual = await toggle(promised)
  assert.equal(manual.status, 'todo')
  assert.equal(manual.todaySubtasks[0].status, 'todo')
  assert.equal(manual.finish.reviewReady, true)
  console.log('Passed ordinary completion, promise review gating and metadata persistence scenarios')
})().catch(error => { console.error(error); process.exitCode = 1 })
