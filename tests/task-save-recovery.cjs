const assert = require('node:assert/strict')
const loadTypeScript = require('./helpers/load-typescript.cjs')
const { planningTaskKey } = loadTypeScript('src/taskPlanning.ts')
const clone = value => JSON.parse(JSON.stringify(value))
const node = (id, status = 'todo', subtasks = []) => ({ id, text: id, status, subtasks })
const tick = () => new Promise(resolve => setImmediate(resolve))

function fixture() {
  const slots = [], timers = new Map(), writes = [], reads = [], moves = []
  let failDate = null
  let moveHold = null, failMove = false
  let cursor = 0, nextTimer = 0, fail = false, hold = null, readHold = null, archiveHold = null, failRead = false
  const sections = {
    '2026-10-21': [node('today')],
    '2026-10-20': [
      node('first'), node('hidden-completed', 'done'),
      { ...node('nested', 'partial', [node('child', 'question', [node('grandchild')])]),
        finish: { doneWhen: 'A real result', by: '2026-10-25', originalBy: '2026-10-24', reviewReady: true,
          deadlineChanges: [{ from: '2026-10-24', to: '2026-10-25', at: '2026-10-21T10:00:00Z' }] } },
      node('last'),
    ],
    '2026-10-22': [node('tomorrow')],
  }
  async function save(data) {
    writes.push(clone(data))
    if (hold) await hold.promise
    if (fail || failDate === data.dateStr) throw Error('Fixture disk unavailable')
    sections[data.dateStr] = clone(data.tasks)
    return { filePath: 'fixture.md' }
  }
  const api = {
    getTasks: async date => {
      reads.push(date)
      const result = { filePath: 'fixture.md', tasks: (sections[date] ?? []).map(task => ({ ...clone(task), todaySubtasks: clone(task.subtasks), otherSubtasks: [] })) }
      if (readHold) await readHold.promise
      if (failRead) throw Error('Fixture read unavailable')
      return result
    },
    extractTaskApi: async () => {
      if (archiveHold) await archiveHold.promise
      return { dates: Object.entries(sections).map(([date, tasks]) => ({ date, tasks: clone(tasks), filePath: 'fixture.md' })) }
    },
    saveTasks: save, createDateSection: save,
    pushTask: async data => {
      moves.push(clone(data))
      if (moveHold) await moveHold.promise
      if (failMove) throw Error('Fixture destination unavailable')
      sections[data.toDate] = [...(sections[data.toDate] ?? []), clone(data.taskSnapshot)]
      return { filePath: 'fixture.md' }
    },
    onFileChanged: () => () => {},
  }
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], update => { slots[index] = typeof update === 'function' ? update(slots[index]) : update }] },
    useRef(initial) { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }) },
    useCallback: value => value, useEffect: () => {},
  }
  const hook = loadTypeScript('src/hooks/useTasks.ts', { react, '../api': { api, waitForPendingWrites: async () => {} } }, {
    console: { error() {} }, setTimeout: (callback, ms) => { const id = ++nextTimer; timers.set(id, { callback, ms }); return id }, clearTimeout: id => timers.delete(id),
  })
  return {
    render(date = '2026-10-21') { cursor = 0; return hook.useTasks(date, date === '2026-10-21') },
    sections, writes, reads, moves,
    fail(value) { fail = value },
    failDate(value) { failDate = value },
    failRead(value) { failRead = value },
    failMove(value) { failMove = value },
    holdMove() { let resolve; const promise = new Promise(done => { resolve = done }); moveHold = { promise, resolve }; return () => { moveHold.resolve(); moveHold = null } },
    hold() { let resolve; const promise = new Promise(done => { resolve = done }); hold = { promise, resolve }; return () => { hold.resolve(); hold = null } },
    holdRead() { let resolve; const promise = new Promise(done => { resolve = done }); readHold = { promise, resolve }; return () => { readHold.resolve(); readHold = null } },
    holdArchive() { let resolve; const promise = new Promise(done => { resolve = done }); archiveHold = { promise, resolve }; return () => { archiveHold.resolve(); archiveHold = null } },
    saveTimer() { const timer = [...timers.entries()].find(([, entry]) => entry.ms === 300); if (!timer) throw Error('No pending save'); timers.delete(timer[0]); return timer[1].callback() },
  }
}

;(async () => {
  let f = fixture()
  await f.render().load()
  f.fail(true)
  f.render().addTask('Keep this unsaved capture')
  await assert.rejects(f.render().flushPendingSave(), /disk unavailable/)
  assert.equal(f.render().saveError.date, '2026-10-21')
  assert.equal(f.render().saving, false)
  assert.ok(f.render().tasks.some(task => task.text === 'Keep this unsaved capture'))
  const readCount = f.reads.length
  await f.render().load()
  assert.equal(f.reads.length, readCount, 'Failed saves block reload from replacing memory')
  assert.equal(await f.render().retrySave(), false)
  f.render().addTask('A later capture')
  f.fail(false)
  assert.equal(await f.render().retrySave(), true)
  assert.equal(f.render().saveError, null)
  assert.equal(f.render().saving, false)
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Keep this unsaved capture'))
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'A later capture'))

  // A committed deletion can be undone even when its archive section has hidden
  // completed rows. All metadata, nested steps, date ownership and positions survive.
  f = fixture(); await f.render().load()
  const original = clone(f.sections['2026-10-20'])
  f.render().deleteTask('2026-10-20:nested')
  await f.render().flushPendingSave()
  assert.deepEqual(f.sections['2026-10-20'].map(task => task.id), ['first', 'hidden-completed', 'last'])
  f.render().addTask('Unrelated new work')
  f.render().undoLastAction()
  await f.render().flushPendingSave()
  assert.deepEqual(f.sections['2026-10-20'], original)
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Unrelated new work'))
  assert.equal(f.render().undo, null)

  f.render().deleteTask('2026-10-20:nested', 'child')
  await f.render().flushPendingSave()
  f.render().undoLastAction()
  await f.render().flushPendingSave()
  assert.deepEqual(f.sections['2026-10-20'], original)

  // Reload establishes a new storage snapshot, so an old deletion cannot be
  // replayed over external changes or an archive template that no longer has it.
  f.render().deleteTask('2026-10-20:nested')
  await f.render().flushPendingSave()
  assert.ok(f.render().undo)
  await f.render().load()
  assert.equal(f.render().undo, null)
  f.render().undoLastAction()
  assert.equal(f.render().tasks.some(task => task.id === '2026-10-20:nested'), false)

  // A newer queued snapshot still runs after the older in-flight snapshot fails.
  f = fixture(); await f.render().load()
  f.render().addTask('First snapshot')
  f.fail(true)
  const release = f.hold()
  const olderWrite = f.saveTimer()
  await tick()
  f.render().addTask('Latest snapshot')
  const newerWrite = f.saveTimer()
  release(); await Promise.all([olderWrite, newerWrite])
  assert.ok(f.writes.length >= 2)
  assert.ok(f.writes[f.writes.length - 1].tasks.some(task => task.text === 'Latest snapshot'))
  f.fail(false); await f.render().retrySave()
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Latest snapshot'))

  // Requested date changes cannot misfile edits if saving prevented navigation.
  f = fixture(); await f.render().load(); f.fail(true)
  f.render().addTask('Still belongs to today')
  await f.render('2026-10-22').load()
  assert.equal(f.render('2026-10-22').dataDate, '2026-10-21')
  f.render('2026-10-22').addTask('Also belongs to today')
  f.fail(false); await f.render('2026-10-22').retrySave()
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Also belongs to today'))
  assert.equal(f.sections['2026-10-22'].length, 1)
  await f.render('2026-10-22').load()
  assert.equal(f.render('2026-10-22').dataDate, '2026-10-22')

  // Late breakdowns are scoped to the requested task, not the whole day. A
  // user's later closure, rename, outcome edit or added step takes precedence.
  const laterChanges = [
    ['completion', current => current.reviewTask('today', 'complete')],
    ['stopping', current => current.reviewTask('today', 'stop')],
    ['title edit', current => current.updateTaskText('today', 'A changed task')],
    ['outcome edit', current => current.updateFinish('today', { doneWhen: 'A different result' })],
    ['step addition', current => current.addSubtask('today', 'A step I chose myself')],
  ]
  for (const [label, change] of laterChanges) {
    f = fixture(); await f.render().load()
    const requested = f.render().tasks.find(task => task.id === 'today')
    const fingerprint = planningTaskKey([requested])
    change(f.render()); await f.render().flushPendingSave()
    const afterChange = clone(f.render().tasks)
    const writeCount = f.writes.length
    f.render().addAISubtasks('today', [{ text: 'An obsolete AI suggestion' }], '2026-10-21', fingerprint)
    await f.render().flushPendingSave()
    assert.deepEqual(clone(f.render().tasks), afterChange, `Late breakdown must preserve ${label}`)
    assert.equal(f.writes.length, writeCount, `Rejected breakdown must not write after ${label}`)
  }

  f = fixture(); await f.render().load()
  const requested = f.render().tasks.find(task => task.id === 'today')
  const fingerprint = planningTaskKey([requested])
  f.render().addTask('Unrelated capture during the request')
  f.render().updateTaskText('2026-10-20:first', 'An unrelated task edit')
  f.render().addAISubtasks('today', [{ text: 'A valid suggested step' }], '2026-10-21', fingerprint)
  await f.render().flushPendingSave()
  assert.equal(f.sections['2026-10-21'].find(task => task.id === 'today').subtasks[0].text, 'A valid suggested step')
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Unrelated capture during the request'))
  assert.equal(f.sections['2026-10-20'].find(task => task.id === 'first').text, 'An unrelated task edit')

  // Identical task IDs/content in another day's file cannot accept yesterday's result.
  f = fixture(); await f.render().load()
  const oldFingerprint = planningTaskKey([f.render().tasks.find(task => task.id === 'today')])
  f.sections['2026-10-22'] = clone(f.sections['2026-10-21'])
  await f.render('2026-10-22').load()
  f.render('2026-10-22').addAISubtasks('today', [{ text: 'Wrong day' }], '2026-10-21', oldFingerprint)
  await f.render('2026-10-22').flushPendingSave()
  assert.equal(f.writes.length, 0)
  assert.equal(f.render('2026-10-22').tasks[0].todaySubtasks.length, 0)

  const planBlock = { taskId: 'today', parentTask: 'today', time: '09:00', endTime: '09:45', action: 'Make a useful result', assignedTo: 'human' }
  // A selected-day read owns the snapshot until it finishes. Test callbacks
  // captured before loading as well as callbacks read while getTasks is held.
  f = fixture(); await f.render().load()
  f.render().deleteTask('2026-10-20:nested'); await f.render().flushPendingSave()
  const beforeRefresh = clone(f.render().tasks)
  const beforeDisk = clone(f.sections)
  const previousCallbacks = f.render()
  const fullFingerprint = planningTaskKey(previousCallbacks.tasks)
  const singleFingerprint = planningTaskKey([previousCallbacks.tasks.find(task => task.id === 'today')])
  const releaseRead = f.holdRead()
  const refresh = previousCallbacks.load()
  previousCallbacks.undoLastAction()
  previousCallbacks.applySchedule([planBlock], '2026-10-21', fullFingerprint)
  previousCallbacks.addAISubtasks('today', [{ text: 'Arrived during refresh' }], '2026-10-21', singleFingerprint)
  await tick()
  assert.equal(f.render().loading, true)
  f.render().undoLastAction()
  f.render().applySchedule([planBlock], '2026-10-21', fullFingerprint)
  assert.deepEqual(clone(f.render().tasks), beforeRefresh)
  assert.ok(f.render().undo, 'A blocked Undo stays available until the fresh snapshot arrives')
  releaseRead(); await refresh; await f.render().flushPendingSave()
  assert.deepEqual(clone(f.sections), beforeDisk, 'Blocked callbacks must not enqueue a later stale write')
  assert.deepEqual(clone(f.render().tasks), beforeRefresh)
  assert.equal(f.render().undo, null)
  f.render().applySchedule([planBlock], '2026-10-21', planningTaskKey(f.render().tasks))
  await f.render().flushPendingSave()
  f.render().addTask('A later capture'); await f.render().flushPendingSave()
  assert.equal(f.sections['2026-10-21'].find(task => task.id === 'today').subtasks.length, 1,
    'A subsequent capture must retain a plan applied after refresh')

  // Failed reads release the loading guard without changing data ownership.
  f = fixture(); await f.render().load()
  const beforeFailedRead = clone(f.sections)
  f.failRead(true); await f.render('2026-10-22').load()
  assert.equal(f.render('2026-10-22').loading, false)
  assert.equal(f.render('2026-10-22').dataDate, '2026-10-21')
  f.render('2026-10-22').applySchedule([planBlock], '2026-10-22', planningTaskKey(f.render('2026-10-22').tasks))
  f.render('2026-10-22').addAISubtasks('today', [{ text: 'Wrong requested date' }], '2026-10-22',
    planningTaskKey([f.render('2026-10-22').tasks.find(task => task.id === 'today')]))
  await f.render('2026-10-22').flushPendingSave()
  assert.deepEqual(clone(f.sections), beforeFailedRead)
  assert.equal(f.writes.length, 0)
  f.failRead(false); await f.render().load()
  f.render().addAISubtasks('today', [{ text: 'Works after read recovery' }], '2026-10-21',
    planningTaskKey([f.render().tasks.find(task => task.id === 'today')]))
  await f.render().flushPendingSave()
  assert.equal(f.sections['2026-10-21'][0].subtasks[0].text, 'Works after read recovery')

  // Archive discovery remains background work: today's capture, plan and Undo
  // stay usable after the selected-day read has completed.
  f = fixture()
  const releaseArchive = f.holdArchive()
  const loadingArchive = f.render().load()
  await tick()
  assert.equal(f.render().loading, false)
  assert.equal(f.render().rolloverLoading, true)
  f.render().addTask('Captured while history loads')
  f.render().applySchedule([planBlock], '2026-10-21', planningTaskKey(f.render().tasks))
  assert.equal(f.render().tasks[0].todaySubtasks.length, 1)
  f.render().undoLastAction()
  assert.equal(f.render().tasks[0].todaySubtasks.length, 0)
  releaseArchive(); await loadingArchive; await f.render().flushPendingSave()
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Captured while history loads'))
  assert.ok(f.render().tasks.some(task => task.sourceDate === '2026-10-20'))
  // Promoting a tree writes Today before removing its source; partial failures
  // retain a recoverable copy, and retries cannot duplicate destination rows.
  f = fixture(); await f.render().load()
  const promotedTree = clone(f.sections['2026-10-20'][2])
  f.render().moveToToday('2026-10-20:nested', 'today', 'before')
  f.fail(true)
  await assert.rejects(f.render().flushPendingSave(), /disk unavailable/)
  assert.deepEqual(f.sections['2026-10-20'][2], promotedTree)
  assert.equal(f.render().tasks[0].id, 'nested')
  f.fail(false); f.failDate('2026-10-20')
  await assert.rejects(f.render().flushPendingSave(), /disk unavailable/)
  assert.deepEqual(f.sections['2026-10-21'][0], promotedTree)
  assert.ok(f.sections['2026-10-20'].some(task => task.id === 'nested'))
  f.render().updateTaskText('nested', 'Edited after the move')
  f.failDate(null)
  await f.render().retrySave()
  assert.equal(f.sections['2026-10-21'].filter(task => task.id === 'nested').length, 1)
  assert.equal(f.sections['2026-10-21'][0].text, 'Edited after the move')
  assert.deepEqual(f.sections['2026-10-20'].map(task => task.id), ['first', 'hidden-completed', 'last'])
  await f.render().load()
  assert.equal(f.render().tasks.filter(task => task.id === 'nested').length, 1)
  assert.equal(f.render().tasks.some(task => task.id === '2026-10-20:nested'), false)
  // Empty Today, repeated requests and invalid/stale date contexts.
  f = fixture(); f.sections['2026-10-21'] = []; await f.render().load()
  f.render().moveToToday('2026-10-20:first')
  f.render().moveToToday('2026-10-20:first')
  await f.render().flushPendingSave()
  assert.deepEqual(f.sections['2026-10-21'].map(task => task.id), ['first'])
  const beforeInvalidMove = clone(f.render().tasks)
  f.render('2026-10-22').moveToToday('2026-10-20:last')
  f.render().moveToToday('2026-10-20:last', 'missing')
  assert.deepEqual(clone(f.render().tasks), beforeInvalidMove)

  // Moving a task cannot overwrite captures/edits accepted while its destination
  // write is pending. Keep the source safe until that destination succeeds.
  f = fixture(); await f.render().load()
  let releaseMove = f.holdMove()
  let moving = f.render().carryForward('today')
  await tick()
  const duringMove = f.render()
  duringMove.addTask('Captured while moving')
  duringMove.updateTaskText('2026-10-20:first', 'Edited while moving')
  await f.saveTimer()
  assert.ok(f.sections['2026-10-21'].some(task => task.id === 'today'), 'Source stays saved before destination exists')
  let navigationReady = false
  const navigationDrain = f.render().flushPendingSave().then(() => { navigationReady = true })
  await tick(); assert.equal(navigationReady, false)
  releaseMove(); const moved = await moving; await navigationDrain
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Captured while moving'))
  assert.equal(f.sections['2026-10-20'].find(task => task.id === 'first').text, 'Edited while moving')
  assert.equal(f.sections['2026-10-21'].some(task => task.id === 'today'), false)
  assert.equal(f.sections[moved.dateStr].filter(task => task.id === 'today').length, 1)
  assert.equal(navigationReady, true)

  // A concurrent change to the moved task preserves both versions and reports
  // the conflict; it must never delete the user's newer text/steps/outcome.
  f = fixture(); await f.render().load(); releaseMove = f.holdMove()
  moving = f.render().carryForward('today'); await tick()
  f.render().updateTaskText('today', 'My newer version')
  releaseMove(); await assert.rejects(moving, /task changed while it was moving/)
  await f.render().flushPendingSave()
  assert.equal(f.sections['2026-10-21'].find(task => task.id === 'today').text, 'My newer version')
  assert.equal(f.sections[f.moves[0].toDate].find(task => task.id === 'today').text, 'today')

  // A failed destination leaves current edits and the source intact. A failed
  // source cleanup leaves a retryable save, and retry never dispatches twice.
  f = fixture(); await f.render().load(); releaseMove = f.holdMove(); f.failMove(true)
  moving = f.render().carryForward('today'); await tick()
  f.render().addTask('Capture despite destination failure')
  releaseMove(); await assert.rejects(moving, /destination unavailable/)
  await f.render().flushPendingSave()
  assert.ok(f.sections['2026-10-21'].some(task => task.id === 'today'))
  assert.ok(f.sections['2026-10-21'].some(task => task.text === 'Capture despite destination failure'))
  f = fixture(); await f.render().load(); f.failDate('2026-10-21')
  await assert.rejects(f.render().carryForward('today'), /Retry save to finish the move/)
  assert.equal(f.render().saveError.date, '2026-10-21')
  assert.equal(f.sections[f.moves[0].toDate].filter(task => task.id === 'today').length, 1)
  f.failDate(null); await f.render().retrySave()
  assert.equal(f.moves.length, 1)
  assert.equal(f.sections['2026-10-21'].some(task => task.id === 'today'), false)
  console.log('Passed save recovery, deletion Undo, stale breakdown rejection, pending-read mutation guards and background archive editing')
  console.log('Passed move captures, concurrent-edit conflict preservation, navigation drain and partial-write recovery')
})().catch(error => { console.error(error); process.exitCode = 1 })
