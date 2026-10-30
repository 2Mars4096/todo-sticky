const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const repo = path.resolve(__dirname, '..')
function createTsLoader() {
  const cache = new Map()
  function load(file) {
    const filename = path.extname(file) ? file : file + '.ts'
    const absolute = path.resolve(repo, filename)
    if (cache.has(absolute)) return cache.get(absolute).exports
    const module = { exports: {} }
    cache.set(absolute, module)
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText
    vm.runInNewContext(source, {
      module, exports: module.exports,
      require: request => request.startsWith('.') ? load(path.resolve(path.dirname(absolute), request)) : require(request),
    }, { filename: absolute })
    return module.exports
  }
  return load
}
const load = createTsLoader()
const { deleteWithUndo, applyPlanWithUndo, restoreTaskChange } = load('src/taskHistory.ts')
const { carriedTasks, mergeCarriedSection, flattenTasks } = load('src/taskRollover.ts')
const { planStepPrefix, planTextHash } = load('src/taskPlanning.ts')
const plain = value => JSON.parse(JSON.stringify(value))
const same = (actual, expected) => assert.deepEqual(plain(actual), plain(expected))
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
const day = '2026-10-21'
const oldDay = '2026-10-19'
const finish = () => ({ doneWhen: 'A colleague can try the result — 无需帮助', by: '2026-10-23', originalBy: '2026-10-20', deadlineChanges: [{ from: '2026-10-20', to: '2026-10-23', at: '2026-10-21T09:00:00Z' }], reviewReady: true })
const step = (id, status = 'todo', extra = {}) => ({ id, text: id, status, subtasks: [], ...extra })
const task = (id, extra = {}) => ({ id, text: id, status: 'todo', todaySubtasks: [], otherSubtasks: [], ...extra })
const block = (taskId, action, time = '09:00', endTime = '09:30') => ({ taskId, parentTask: taskId, action, time, endTime, assignedTo: 'human' })
const ids = items => Array.from(items, item => item.id)
let passed = 0
let failed = 0
function check(label, run) {
  try {
    run()
    passed += 1
    console.log('ok - ' + label)
  } catch (error) {
    failed += 1
    console.error('not ok - ' + label)
    console.error(error.message)
  }
}

check('root deletion undo restores its whole tree, metadata and order without reverting subsequent work', () => {
  const deleted = task('deliver', {
    finish: finish(), status: 'partial',
    todaySubtasks: [step('draft', 'done'), step('review', 'partial', { finish: finish(), subtasks: [step('nested', 'question', { subtasks: [step('leaf', 'stopped')] })] })],
    otherSubtasks: [{ ...step('historical', 'done'), sourceDate: '2026-10-18' }],
  })
  const initial = freeze([task('before'), deleted, task('after')])
  const change = deleteWithUndo(initial, day, 'deliver')
  assert.equal(change.undo.date, day)
  assert.equal(change.undo.label, 'Task deleted')
  assert.deepEqual(ids(change.tasks), ['before', 'after'])
  const later = [...change.tasks.map(item => item.id === 'before' ? { ...item, text: 'Later unrelated edit' } : item), task('new')]
  const restored = restoreTaskChange(later, change.undo)
  assert.deepEqual(ids(restored), ['before', 'deliver', 'after', 'new'])
  same(restored[1], deleted)
  assert.equal(restored[0].text, 'Later unrelated edit')
  same(initial[1], deleted)
  same(restoreTaskChange(restored, change.undo), restored)
})

check('carried-task undo preserves original date and ID, hidden archive entries, and archive order', () => {
  const archived = freeze({ date: oldDay, filePath: 'older/index.md', weekStart: '2026-10-19', revision: 'revision-a', tasks: [
    step('hidden-done', 'done'),
    step('carried', 'partial', { finish: finish(), subtasks: [step('child', 'todo', { subtasks: [step('grandchild', 'done')] })] }),
    step('other'),
    step('hidden-stopped', 'stopped'),
  ] })
  const visible = freeze([task('today'), ...carriedTasks([archived], day)])
  const visibleIds = new Set(visible.filter(item => item.sourceDate).map(item => item.id))
  const change = deleteWithUndo(visible, day, oldDay + ':carried')
  assert.equal(change.undo.root.task.sourceDate, oldDay)
  assert.equal(change.undo.root.task.originalId, 'carried')
  const deletedSaved = mergeCarriedSection(archived, visibleIds, change.tasks)
  assert.deepEqual(ids(deletedSaved), ['hidden-done', 'other', 'hidden-stopped'])
  const afterEdit = change.tasks.map(item => item.originalId === 'other' ? { ...item, text: 'Later archive edit' } : item)
  const restored = restoreTaskChange(afterEdit, change.undo)
  const saved = mergeCarriedSection(archived, visibleIds, restored)
  assert.deepEqual(ids(saved), ['hidden-done', 'carried', 'other', 'hidden-stopped'])
  same(saved[1], archived.tasks[1])
  assert.equal(saved[2].text, 'Later archive edit')
  assert.deepEqual(ids(flattenTasks(restored.filter(item => !item.sourceDate))), ['today'])
})

check('step undo keeps nested metadata while retaining parent edits and later added or edited steps', () => {
  const removed = step('middle', 'question', { finish: finish(), subtasks: [step('nested', 'done')] })
  const initial = freeze([task('parent', { finish: finish(), todaySubtasks: [step('first'), removed, step('last')] }), task('unrelated')])
  const change = deleteWithUndo(initial, day, 'parent', 'middle')
  assert.equal(change.undo.label, 'Step deleted')
  const later = change.tasks.map(item => item.id === 'parent' ? {
    ...item, text: 'Renamed parent', finish: { ...item.finish, by: '2026-11-01' },
    todaySubtasks: [{ ...item.todaySubtasks[0], text: 'Edited first step' }, step('new'), item.todaySubtasks[1]],
  } : { ...item, text: 'Unrelated edit' })
  const restored = restoreTaskChange(later, change.undo)
  assert.deepEqual(ids(restored[0].todaySubtasks), ['first', 'new', 'middle', 'last'])
  same(restored[0].todaySubtasks[2], removed)
  assert.equal(restored[0].text, 'Renamed parent')
  assert.equal(restored[0].finish.by, '2026-11-01')
  assert.equal(restored[0].todaySubtasks[0].text, 'Edited first step')
  assert.equal(restored[1].text, 'Unrelated edit')
})

check('undo uses remaining neighbors, does not duplicate restored IDs, and ignores missing deletion targets', () => {
  const initial = freeze([task('left'), task('middle'), task('right')])
  const change = deleteWithUndo(initial, day, 'middle')
  assert.deepEqual(ids(restoreTaskChange([task('new'), task('left')], change.undo)), ['new', 'left', 'middle'])
  const alreadyRestored = [task('middle', { text: 'Externally restored version' })]
  same(restoreTaskChange(alreadyRestored, change.undo), alreadyRestored)
  assert.equal(deleteWithUndo(initial, day, 'missing'), null)
  assert.equal(deleteWithUndo(initial, day, 'left', 'missing-step'), null)
})

check('replanning preserves legacy steps and replaces only untouched generated suggestions', () => {
  const current = planStepPrefix(day)
  const initial = freeze([task('open', { finish: finish(), todaySubtasks: [step('manual'), step(current + 'legacy')] })])
  const first = applyPlanWithUndo(initial, day, [block('open', 'Show the draft')], 'batch-a')
  assert.equal(first.tasks[0].todaySubtasks.length, 3)
  assert.ok(first.tasks[0].todaySubtasks.some(item => item.id === current + 'legacy'))
  const generated = first.tasks[0].todaySubtasks[2]
  assert.ok(generated.id.endsWith('_h' + planTextHash(generated.text)))
  const repeated = applyPlanWithUndo(first.tasks, day, [block('open', 'Show the draft')], 'batch-b')
  assert.equal(repeated.tasks[0].todaySubtasks.length, 3)
  assert.ok(!repeated.tasks[0].todaySubtasks.some(item => item.id === generated.id))
  for (const edit of [{ text: 'My revised action' }, { status: 'partial' }, { status: 'done' }, { status: 'stopped' }, { subtasks: [step('nested')] }, { finish: finish() }]) {
    const edited = first.tasks.map(root => ({ ...root, todaySubtasks: root.todaySubtasks.map(child => child.id === generated.id ? { ...child, ...edit } : child) }))
    const replanned = applyPlanWithUndo(edited, day, [block('open', 'Different action')], 'batch-c')
    assert.ok(replanned.tasks[0].todaySubtasks.some(item => item.id === generated.id), JSON.stringify(edit))
  }
})

check('unmodified plan undo restores original steps, finish review state and order', () => {
  const current = planStepPrefix(day)
  const initial = freeze([task('task', { finish: finish(), todaySubtasks: [step('first'), step(current + 'old'), step('last')] }), task('unrelated')])
  const change = applyPlanWithUndo(initial, day, [block('task', 'Deliver result')], 'batch')
  same(restoreTaskChange(change.tasks, change.undo), initial)
})

check('plan undo preserves completed, edited and stopped blocks plus later unrelated edits', () => {
  const current = planStepPrefix(day)
  const initial = freeze([task('task', { finish: finish(), todaySubtasks: [step('manual'), step(current + 'previous')] }), task('other')])
  const schedule = ['Finish work', 'User edits this', 'User stops this', 'Untouched block'].map((action, index) => block('task', action, String(9 + index).padStart(2, '0') + ':00', String(9 + index).padStart(2, '0') + ':30'))
  const change = applyPlanWithUndo(initial, day, schedule, 'batch')
  const later = change.tasks.map(item => item.id === 'task' ? {
    ...item, text: 'User renamed parent', finish: { ...item.finish, by: '2026-10-30' },
    todaySubtasks: [...item.todaySubtasks.map(child => child.id.includes('batch_0_h') ? { ...child, status: 'done' }
      : child.id.includes('batch_1_h') ? { ...child, text: 'User rewritten block', subtasks: [step('new-nested')] }
      : child.id.includes('batch_2_h') ? { ...child, status: 'stopped' }
      : child.id === 'manual' ? { ...child, text: 'Edited manual step' } : child), step('later-manual')],
  } : { ...item, text: 'Unrelated title edit' })
  const restored = restoreTaskChange(later, change.undo)
  const children = restored[0].todaySubtasks
  assert.ok(children.some(child => child.id === current + 'previous'))
  assert.equal(children.find(child => child.id.includes('batch_0_h')).status, 'done')
  assert.equal(children.find(child => child.id.includes('batch_1_h')).subtasks[0].id, 'new-nested')
  assert.equal(children.find(child => child.id.includes('batch_2_h')).status, 'stopped')
  assert.ok(!children.some(child => child.id.includes('batch_3_h')))
  assert.equal(children.find(child => child.id === 'manual').text, 'Edited manual step')
  assert.ok(children.some(child => child.id === 'later-manual'))
  assert.equal(restored[0].text, 'User renamed parent')
  assert.equal(restored[0].finish.by, '2026-10-30')
  assert.equal(restored[1].text, 'Unrelated title edit')
})

check('plan undo does not resurrect subsequently deleted roots, and equal existing work is retained', () => {
  const existingText = '⏰ 09:00–09:30 Deliver result'
  const initial = freeze([task('task', { todaySubtasks: [step('manual', 'todo', { text: existingText })] })])
  assert.equal(applyPlanWithUndo(initial, day, [block('task', 'Deliver result')], 'batch'), null)
  const change = applyPlanWithUndo([task('task')], day, [block('task', 'New result')], 'batch')
  same(restoreTaskChange([task('later')], change.undo), [task('later')])
})

check('undoing a deleted unfinished step reopens a parent closed after the deletion', () => {
  const initial = [task('parent', { finish: finish(), todaySubtasks: [step('already-done', 'done'), step('unfinished')] })]
  const change = deleteWithUndo(initial, day, 'parent', 'unfinished')
  for (const status of ['done', 'stopped']) {
    const later = change.tasks.map(item => ({ ...item, status, finish: { ...item.finish, reviewReady: false } }))
    const restored = restoreTaskChange(later, change.undo)
    assert.equal(restored[0].todaySubtasks.find(child => child.id === 'unfinished').status, 'todo')
    assert.equal(restored[0].status, 'partial', 'restored unfinished work must not be hidden under a closed parent')
    assert.equal(restored[0].finish.reviewReady, false)
  }
})

check('plan undo cannot leave restored unfinished blocks under a subsequently completed parent', () => {
  const current = planStepPrefix(day)
  const oldId = current + 'old_h' + planTextHash('Old suggestion')
  const initial = [task('parent', { todaySubtasks: [step(oldId, 'todo', { text: 'Old suggestion' })] })]
  const change = applyPlanWithUndo(initial, day, [block('parent', 'User completed this')], 'batch')
  const later = change.tasks.map(item => ({ ...item, status: 'done', todaySubtasks: item.todaySubtasks.map(child => ({ ...child, status: 'done' })) }))
  const restored = restoreTaskChange(later, change.undo)
  assert.equal(restored[0].todaySubtasks.find(child => child.id.includes('batch_0_h')).status, 'done')
  assert.equal(restored[0].status, 'done', 'the completed outcome remains closed')
  assert.ok(!restored[0].todaySubtasks.some(child => child.id === oldId), 'an obsolete unfinished plan must not reopen a completed outcome')
  const stopped = change.tasks.map(item => ({ ...item, status: 'stopped' }))
  const undoneStop = restoreTaskChange(stopped, change.undo)
  assert.equal(undoneStop[0].status, 'stopped')
  assert.ok(!undoneStop[0].todaySubtasks.some(child => child.id === oldId))
})

check('plan undo preserves closed review metadata after stopping a previously review-ready task', () => {
  const initial = [task('parent', { status: 'partial', finish: { ...finish(), reviewReady: true } })]
  const change = applyPlanWithUndo(initial, day, [block('parent', 'Unfinished work')], 'batch')
  const later = change.tasks.map(item => ({ ...item, status: 'stopped', finish: { ...item.finish, reviewReady: false } }))
  const restored = restoreTaskChange(later, change.undo)
  assert.equal(restored[0].status, 'stopped')
  assert.equal(restored[0].finish.reviewReady, false)
})

console.log('Passed ' + passed + ' deletion/undo and generated-plan history scenarios')
if (failed) { console.error('Failed ' + failed + ' history scenarios'); process.exitCode = 1 }
