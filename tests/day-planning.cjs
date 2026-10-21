const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const repo = path.resolve(__dirname, '..')
function createTsLoader(stubs = {}, globals = {}) {
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
      module, exports: module.exports, console, setTimeout, clearTimeout,
      require: request => Object.hasOwn(stubs, request) ? stubs[request]
        : request.startsWith('.') ? load(path.resolve(path.dirname(absolute), request)) : require(request),
      ...globals,
    }, { filename: absolute })
    return module.exports
  }
  return load
}
const load = createTsLoader()
const { minutesOfDay, validateDayPlan, planningTaskKey } = load('src/taskPlanning.ts')
const task = (id, extra = {}) => ({ id, text: id, status: 'todo', todaySubtasks: [], otherSubtasks: [], ...extra })
const step = (id, extra = {}) => ({ id, text: id, status: 'todo', subtasks: [], ...extra })
const day = '2026-10-21'
const context = overrides => ({ date: day, start: '09:00', end: '17:00', machines: [], tasks: [task('draft'), task('share')], ...overrides })
const block = overrides => ({ taskId: 'draft', parentTask: 'draft', time: '09:00', endTime: '09:30', action: 'Write one useful paragraph', assignedTo: 'human', ...overrides })
const proposed = (blocks = [block()]) => ({ plan: 'Draft, then share.', schedule: blocks })
const plain = value => JSON.parse(JSON.stringify(value))
let passed = 0
function check(label, run) {
  run()
  passed += 1
  console.log('ok - ' + label)
}

check('time parsing accepts clock boundaries and rejects malformed or out-of-day times', () => {
  assert.equal(minutesOfDay('00:00'), 0)
  assert.equal(minutesOfDay('09:30'), 570)
  assert.equal(minutesOfDay('23:59'), 1439)
  for (const value of ['24:00', '25:00', '09:60', '9:00', '09:00:00', '-1:00', ' 09:00', '09:00 ', '', 'tomorrow']) assert.equal(minutesOfDay(value), null, value)
})

check('a valid proposal resolves stable identities, normalizes actions, and sorts chronologically', () => {
  const input = proposed([
    block({ taskId: 'share', parentTask: 'provider paraphrase', time: '10:00', endTime: '10:15', action: '  Share with one reader  ' }),
    block({ taskId: undefined, parentTask: 'draft', assignedTo: undefined }),
  ])
  const original = JSON.stringify(input)
  const result = validateDayPlan(input, context())
  assert.deepEqual(Array.from(result.schedule, item => item.taskId), ['draft', 'share'])
  assert.equal(result.schedule[0].assignedTo, 'human')
  assert.equal(result.schedule[1].parentTask, 'share')
  assert.equal(result.schedule[1].action, 'Share with one reader')
  assert.equal(JSON.stringify(input), original)
})

check('unknown, ambiguous and closed parents are rejected without fuzzy title matching', () => {
  for (const entry of [block({ taskId: 'missing' }), block({ taskId: undefined, parentTask: 'dra' }), block({ taskId: undefined, parentTask: ' draft ' })]) {
    assert.throws(() => validateDayPlan(proposed([entry]), context()), /unknown or ambiguous/)
  }
  const duplicate = context({ tasks: [task('one', { text: 'Same title' }), task('two', { text: 'Same title' })] })
  assert.throws(() => validateDayPlan(proposed([block({ taskId: undefined, parentTask: 'Same title' })]), duplicate), /unknown or ambiguous/)
  const exact = validateDayPlan(proposed([block({ taskId: 'two', parentTask: 'Same title' })]), duplicate)
  assert.equal(exact.schedule[0].taskId, 'two')
  for (const status of ['done', 'stopped']) {
    assert.throws(() => validateDayPlan(proposed(), context({ tasks: [task('draft', { status })] })), /unknown or ambiguous/)
  }
})

check('invalid output envelopes and incomplete block fields fail before any task mutation', () => {
  for (const raw of [null, 'plan', [], {}, { schedule: [] }, { schedule: {} }, { schedule: Array.from({ length: 101 }, () => block()) }]) {
    assert.throws(() => validateDayPlan(raw, context()))
  }
  for (const entry of [null, 'block', block({ action: '' }), block({ action: '  ' }), block({ action: 12 }), block({ action: 'a'.repeat(1001) }), block({ time: undefined }), block({ endTime: undefined })]) {
    assert.throws(() => validateDayPlan(proposed([entry]), context()))
  }
  assert.equal(validateDayPlan({ plan: 'x'.repeat(1600), schedule: [block()] }, context()).plan.length, 1200)
})

check('the requested window bounds every block and excludes zero, reversed or overnight intervals', () => {
  for (const entry of [block({ time: '08:59' }), block({ endTime: '17:01' }), block({ time: '10:00', endTime: '09:59' }), block({ endTime: '09:00' }), block({ time: '23:00', endTime: '01:00' })]) {
    assert.throws(() => validateDayPlan(proposed([entry]), context()), /outside your available time/)
  }
  assert.equal(validateDayPlan(proposed([block({ time: '09:00', endTime: '17:00' })]), context()).schedule.length, 1)
  for (const window of [{ start: '17:00', end: '09:00' }, { start: '09:00', end: '09:00' }, { start: '9:00', end: '17:00' }, { start: '09:00', end: '24:00' }]) {
    assert.throws(() => validateDayPlan(proposed(), context(window)), /end time later/)
  }
})

check('only selected machines are allowed and parallel assignments use independent timelines', () => {
  assert.throws(() => validateDayPlan(proposed([block({ assignedTo: 'invented-machine' })]), context()), /machine you did not select/)
  const configured = context({ machines: [{ name: 'build', type: 'server' }, { name: 'render', type: 'workstation' }] })
  const result = validateDayPlan(proposed([block(), block({ assignedTo: 'build' }), block({ assignedTo: 'render' })]), configured)
  assert.equal(result.schedule.length, 3)
  assert.throws(() => validateDayPlan(proposed([block({ assignedTo: 'Build' })]), configured), /machine you did not select/)
})

check('overlap detection rejects conflicting or nested blocks but accepts touching boundaries', () => {
  const overlaps = [
    [block({ time: '09:00', endTime: '10:00' }), block({ taskId: 'share', time: '09:30', endTime: '10:30' })],
    [block({ time: '09:00', endTime: '12:00' }), block({ time: '10:00', endTime: '11:00' })],
    [block(), block()],
  ]
  for (const blocks of overlaps) assert.throws(() => validateDayPlan(proposed(blocks), context()), /overlapping/)
  const adjacent = validateDayPlan(proposed([block({ time: '09:30', endTime: '10:00' }), block()]), context())
  assert.deepEqual(Array.from(adjacent.schedule, item => item.time), ['09:00', '09:30'])
  const configured = context({ machines: [{ name: 'build', type: 'server' }] })
  assert.throws(() => validateDayPlan(proposed([block({ assignedTo: 'build' }), block({ assignedTo: 'build', time: '09:10', endTime: '09:45' })]), configured), /overlapping/)
})

check('stale-plan fingerprints include nested steps, finish metadata, dates, order and statuses', () => {
  const initial = [task('draft', { finish: { doneWhen: 'One reader can use it', by: '2026-10-23' }, todaySubtasks: [step('review', { subtasks: [step('leaf')] })] }), task('share')]
  const original = planningTaskKey(initial)
  assert.equal(planningTaskKey(plain(initial)), original)
  const mutations = [
    tasks => { tasks[0].text = 'Renamed' },
    tasks => { tasks[0].status = 'done' },
    tasks => { tasks[0].finish.by = '2026-10-24' },
    tasks => { tasks[0].todaySubtasks[0].subtasks[0].text = 'Nested edit' },
    tasks => { tasks[0].sourceDate = '2026-10-20' },
    tasks => { tasks.reverse() },
  ]
  for (const mutate of mutations) { const modified = plain(initial); mutate(modified); assert.notEqual(planningTaskKey(modified), original) }
})

function hookFixture() {
  const slots = [], timers = new Map(), writes = []
  let cursor = 0, timerId = 0
  const api = {
    getTasks: async date => ({ filePath: date + '.md', tasks: [task('draft'), task('share')] }),
    saveTasks: async payload => { writes.push(plain(payload)) },
    createDateSection: async payload => { writes.push(plain(payload)); return { filePath: payload.dateStr + '.md' } },
    onFileChanged: () => () => {},
  }
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], update => { slots[index] = typeof update === 'function' ? update(slots[index]) : update }] },
    useRef(initial) { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }) },
    useCallback: callback => callback,
    useEffect: () => {},
  }
  const hookLoad = createTsLoader({
    react,
    '../api': { api, waitForPendingWrites: async () => {} },
    '../taskCarryForward': { resolveTaskCarryForwardTarget: () => ({ dateStr: '2026-10-22', actionLabel: 'tomorrow' }) },
  }, {
    setTimeout: callback => { timers.set(++timerId, callback); return timerId },
    clearTimeout: id => timers.delete(id),
  })
  const { useTasks } = hookLoad('src/hooks/useTasks.ts')
  return { writes, render(date = day) { cursor = 0; return useTasks(date, false) } }
}

;(async () => {
  let fixture = hookFixture()
  await fixture.render().load()
  const validated = validateDayPlan(proposed(), context()).schedule
  const initialKey = planningTaskKey(fixture.render().tasks)
  fixture.render().applySchedule(validated, day, initialKey)
  await fixture.render().flushPendingSave()
  assert.equal(fixture.writes.length, 1)
  assert.equal(fixture.writes[0].dateStr, day)
  assert.equal(fixture.writes[0].tasks[0].subtasks.length, 1)
  assert.equal(fixture.render().undo.kind, 'plan')
  passed += 1
  console.log('ok - validated plan is applied and persisted to its captured date')

  fixture = hookFixture()
  await fixture.render().load()
  const oldKey = planningTaskKey(fixture.render().tasks)
  await fixture.render('2026-10-22').load()
  fixture.render('2026-10-22').applySchedule(validated, day, oldKey)
  assert.equal(fixture.render('2026-10-22').tasks[0].todaySubtasks.length, 0)
  assert.equal(fixture.writes.length, 0)
  passed += 1
  console.log('ok - a response from another date cannot change matching tasks on the new date')

  fixture = hookFixture()
  await fixture.render().load()
  const beforeEditKey = planningTaskKey(fixture.render().tasks)
  fixture.render().updateFinish('draft', { by: '2026-11-01' })
  fixture.render().applySchedule(validated, day, beforeEditKey)
  await fixture.render().flushPendingSave()
  assert.equal(fixture.render().tasks[0].todaySubtasks.length, 0)
  assert.equal(fixture.writes[0].tasks[0].finish.by, '2026-11-01')
  assert.equal(fixture.render().undo, null)
  passed += 1
  console.log('ok - intervening task edits invalidate a proposal while preserving the latest edits')

  console.log('Passed ' + passed + ' plan validation and captured-context application scenarios')
})().catch(error => { console.error(error); process.exitCode = 1 })
