const assert = require('node:assert/strict')
const loadTypeScript = require('./helpers/load-typescript.cjs')
const tick = () => new Promise(resolve => setImmediate(resolve))
const key = 'todo-sticky-goals-v1'

function goalsFixture(raw, { failRecovery = false, failRead = false } = {}) {
  const storage = new Map(raw === undefined ? [] : [[key, raw]])
  const slots = [], effects = [], writes = []
  let cursor = 0
  const same = (a, b) => a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], update => { slots[index] = typeof update === 'function' ? update(slots[index]) : update }]
    },
    useRef(initial) { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }) },
    useCallback(callback, dependencies) {
      const index = cursor++
      if (!same(slots[index]?.dependencies, dependencies)) slots[index] = { callback, dependencies }
      return slots[index].callback
    },
    useEffect(callback, dependencies) {
      const index = cursor++
      if (!same(slots[index], dependencies)) effects.push(callback)
      slots[index] = dependencies
    },
  }
  const module = loadTypeScript('src/hooks/useGoals.ts', { react }, {
    console: { error() {} },
    window: { localStorage: {
      getItem(name) { if (failRead) throw Error('Storage unreadable'); return storage.get(name) ?? null },
      setItem(name, value) {
        if (failRecovery && name.includes('-recovery-')) throw Error('Storage quota exceeded')
        writes.push(name); storage.set(name, value)
      },
    } },
  })
  return {
    storage, writes,
    allowRecovery() { failRecovery = false },
    render() {
      cursor = 0
      const result = module.useGoals()
      while (effects.length) effects.shift()()
      return result
    },
  }
}

;(async () => {
  let listener, resolveRegistration, rejectRegistration, unlistened = 0, calls = 0
  const errors = []
  const { api } = loadTypeScript('src/api.ts', {
    '@tauri-apps/api/core': { invoke() {} },
    '@tauri-apps/api/event': { listen(_event, callback) {
      listener = callback
      return new Promise((resolve, reject) => { resolveRegistration = resolve; rejectRegistration = reject })
    } },
  }, { console: { error: (...args) => errors.push(args) } })
  let dispose = api.onFileChanged(() => { calls += 1 })
  dispose(); listener()
  resolveRegistration(() => { unlistened += 1 }); await tick()
  assert.equal(calls, 0, 'Disposed date handlers cannot start stale reloads')
  assert.equal(unlistened, 1, 'A late native registration must be released')
  dispose(); assert.equal(unlistened, 1)
  dispose = api.onFileChanged(() => { calls += 1 })
  resolveRegistration(() => { unlistened += 1 }); await tick()
  listener(); assert.equal(calls, 1)
  dispose(); dispose(); listener()
  assert.equal(calls, 1); assert.equal(unlistened, 2)
  dispose = api.onFileChanged(() => {})
  rejectRegistration(Error('Bridge unavailable')); await tick()
  assert.equal(errors.length, 1); dispose()

  const broken = '{"targets":[{"id":"one","text":"Recover me"}'
  let f = goalsFixture(broken)
  f.render(); let state = f.render()
  assert.ok([...f.storage.entries()].some(([name, value]) => name.startsWith(`${key}-recovery-`) && value === broken))
  assert.ok(state.recoveryNotice.includes('recovery copy'))
  assert.equal(state.storageError, null)
  state.addGoal('targets', 'A new goal'); f.render(); state = f.render()
  assert.equal(JSON.parse(f.storage.get(key)).targets[0].text, 'A new goal')
  assert.equal([...f.storage.keys()].filter(name => name.startsWith(`${key}-recovery-`)).length, 1)

  f = goalsFixture(broken, { failRecovery: true })
  f.render(); state = f.render()
  assert.equal(f.storage.get(key), broken, 'Failed backup cannot overwrite the original bytes')
  assert.ok(state.storageError.includes('could not be saved'))
  f.allowRecovery(); state.retrySave(); state = f.render()
  assert.equal(state.storageError, null)
  assert.ok([...f.storage.entries()].some(([name, value]) => name.startsWith(`${key}-recovery-`) && value === broken))

  const partial = JSON.stringify({ targets: [{ id: 'one', text: 'Keep this', done: false }, { id: 'bad' }], recurring: [] })
  f = goalsFixture(partial); f.render(); state = f.render()
  assert.equal(state.targets.length, 1); assert.equal(state.targets[0].text, 'Keep this')
  assert.ok([...f.storage.entries()].some(([name, value]) => name.startsWith(`${key}-recovery-`) && value === partial))

  const valid = JSON.stringify({ targets: [{ id: 'one', text: 'Existing goal', done: false }], recurring: [] })
  f = goalsFixture(valid, { failRead: true }); f.render(); state = f.render()
  assert.equal(f.storage.get(key), valid)
  assert.equal(f.writes.length, 0, 'An unreadable store cannot be assumed empty')
  assert.ok(state.storageError.includes('not been replaced'))
  assert.equal(state.retrySave, undefined)
  console.log('Passed native listener cleanup, rejected registration, goals recovery-copy ordering and unreadable-storage preservation')
})().catch(error => { console.error(error); process.exitCode = 1 })
