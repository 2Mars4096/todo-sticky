const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const load = require('./helpers/load-typescript.cjs')

async function fixture(options = {}) {
  const slots = [], effects = [], timers = new Map(), listeners = new Map(), docListeners = new Map()
  const storage = new Map(), local = {}, remote = new Map()
  let applyRace, fullReads=0, conditionalReads=0
  let cursor = 0, timerId = 0, now = 0, reads = 0, offline = false, failPut = false, draft = '', hold, heldStarted
  const uploads = []
  const goals = { targets: [], recurring: [] }
  const record = (key, payload, revision = 1) => ({ key, payload, revision, deleted: false, updatedAt: '', mutationId: 'fixture' })
  remote.set('goals', record('goals', goals))
  const key = 'todo-sticky-cloud-v1:p:u:https://sync.example.test:/fixture'
  storage.set('todo-sticky-cloud-server-v1', 'https://sync.example.test')
  storage.set('todo-sticky-cloud-owner-v1', 'p:u')
  storage.set(key, JSON.stringify({ enabled: true, baseline: {}, pending: {}, conflicts: [] }))
  if (options.recoverServer) storage.delete('todo-sticky-cloud-server-v1')
  const user = { uid: 'u', getIdToken: async () => 'fixture' }, auth = { app: { options: { projectId: 'p' } }, currentUser: user }
  const schedule = (fn, delay, repeat = false) => { timers.set(++timerId, { fn, delay, at: now + delay, repeat }); return timerId }
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }) },
    useCallback: fn => fn,
    useEffect(fn, deps) { const i = cursor++, old = slots[i]
      if (!old || deps.some((v, j) => v !== old.deps[j])) {
        old?.cleanup?.(); const next = { deps }; slots[i] = next
        effects.push(() => { next.cleanup = fn() })
      }
    },
  }
  const document = { visibilityState: 'visible', querySelector: () => ({ value: draft }),
    addEventListener: (name, fn) => docListeners.set(name, fn), removeEventListener: name => docListeners.delete(name) }
  const mocks = {
    react, 'firebase/auth': { onAuthStateChanged: (_, fn) => { fn(user); return () => {} } },
    '@tauri-apps/api/core': { invoke: async (name, args) => {
      if (name === 'cloud_task_folder') return '/fixture'
      if (name === 'cloud_apply_day') {
        if (applyRace) { applyRace(args); throw Error('Local tasks changed during sync. Sync again; your edits are safe.') }
        local['day:' + args.date] = { date: args.date, tasks: args.tasks }
      }
    } },
    '../api': { waitForPendingWrites: async () => {}, api: { extractTaskApi: async request => ({ dates: structuredClone(Object.values(local).filter(day => !request.date || day.date === request.date)) }) } },
    '../cloudAccount': { connectAccount: async () => auth, requestJson: async (_, path, requestOptions = {}) => {
      if (path === '/v1/config') return { schemaVersion: 1 }
      if (requestOptions.method === 'PUT') { const body = JSON.parse(requestOptions.body), k = decodeURIComponent(path.split('/').pop())
        uploads.push(body)
        if (failPut) throw Error('Offline upload fixture')
        assert.equal(body.expectedRevision, remote.get(k)?.revision ?? 0, 'Revision-guarded upload')
        const value = record(k, body.payload, body.expectedRevision + 1); remote.set(k, value); return value }
      reads++; heldStarted?.(); if (hold) await hold
      if (offline) throw Error('Offline fixture')
      const generation=options.conditional?require('node:crypto').createHash('sha256').update(JSON.stringify([...remote.values()])).digest('hex'):undefined
      if(generation&&new URL('https://fixture'+path).searchParams.get('ifGeneration')===generation){conditionalReads++;return {schemaVersion:1,records:[],nextCursor:null,generation,notModified:true}}
      fullReads++;return { schemaVersion: 1, records: [...remote.values()], nextCursor: null, ...(generation?{generation}:{}) }
    } },
    '../cloudSync': load('src/cloudSync.ts', {}, { URL }), '../syncConflicts': load('src/syncConflicts.ts'),
    '../syncProgress': { ...load('src/syncProgress.ts'), yieldSyncUi: async () => {} },
  }
  const exported = {}
  const source = fs.readFileSync('src/hooks/useCloudSync.ts', 'utf8').replace('import.meta.env.VITE_SYNC_SERVER_URL', "''")
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports: exported, require: name => mocks[name], URLSearchParams, crypto: require('node:crypto').webcrypto, document,
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), key: i => [...storage.keys()][i] ?? null, get length() { return storage.size } },
    setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, true), clearInterval: id => timers.delete(id),
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
  })
  const hooks = { kbPath: '/fixture', ready: true, blocked: false, changeKey: 'initial', focusActive: false,
    flush: async () => {}, reload: async () => {}, goals, missions: [], applyGoals: async value => { hooks.goals = value },
    applyMission: async value => { assert.equal(hooks.focusActive, false); hooks.missions.push(value) } }
  const render = () => { cursor = 0; const value = exported.useCloudSync(hooks); effects.splice(0).forEach(fn => fn()); return value }
  const flush = async () => { for (let i = 0; i < 8; i++) { await new Promise(setImmediate); render() } }
  const advance = async ms => { const end = now + ms
    for (;;) { const item = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!item) break
      const [id, timer] = item; now = timer.at; if (timer.repeat) timer.at += timer.delay; else timers.delete(id)
      timer.fn(); await flush()
    }
    now = end; await flush()
  }
  render(); await flush()
  return { render, flush, advance, document, hooks, local, listeners, docListeners, timers, uploads, reads: () => reads, fullReads:()=>fullReads, conditionalReads:()=>conditionalReads,
    failPut: value => { failPut = value },
    applyRace: fn => { applyRace = fn },
    baseline: (k, payload) => { const meta = JSON.parse(storage.get(key)); meta.baseline[k] = { revision: 1, payload, deleted: payload === null }; storage.set(key, JSON.stringify(meta)) },
    offline: value => { offline = value }, draft: value => { draft = value },
    remote: (k, payload) => remote.set(k, record(k, payload, (remote.get(k)?.revision ?? 0) + 1)),
    hold: async () => { let release; hold = new Promise(resolve => { release = resolve }); const started = new Promise(resolve => { heldStarted = resolve }); return { started, release: () => { hold = null; release() } } },
    dispose: () => slots.forEach(slot => slot?.cleanup?.()),
  }
}
const day = text => ({ date: '2026-11-07', tasks: [{ id: 'task', text, status: 'todo', subtasks: [] }] })
async function main() {
  let f = await fixture()
  await f.advance(900); assert.equal(f.reads(), 1, 'Launch sync needs no manual click')
  f.remote('day:2026-11-07', day('From phone'))
  await f.advance(14_100)
  assert.equal(f.local['day:2026-11-07'].tasks[0].text, 'From phone', 'Receive remote edits with empty capture focused')
  f.draft('Unsaved text'); f.remote('day:2026-11-07', day('Newer phone edit'))
  await f.advance(15_000); assert.equal(f.reads(), 2, 'Protect a nonempty draft')
  f.draft(''); f.docListeners.get('focusout')({ target: { matches: () => true } }); await f.advance(900)
  assert.equal(f.local['day:2026-11-07'].tasks[0].text, 'Newer phone edit')
  const beforeReviewFocus = f.reads()
  f.docListeners.get('focusout')({ target: { matches: () => false } }); await f.advance(900)
  assert.equal(f.reads(), beforeReviewFocus, 'Review radio/button blur must not schedule sync')
  const beforeHide = f.reads()
  f.document.visibilityState = 'hidden'; await f.advance(15_000)
  assert.equal(f.reads(), beforeHide, 'Hidden app does not poll')
  const beforeResume = f.reads()
  f.document.visibilityState = 'visible'; f.docListeners.get('visibilitychange')(); await f.flush()
  assert.equal(f.reads(), beforeResume + 1, 'Return checks immediately')
  f.offline(true); f.listeners.get('online')(); await f.flush(); assert.match(f.render().error, /Offline/)
  f.offline(false); await f.advance(15_000); assert.equal(f.render().error, null, 'Next poll retries without a manual sync')
  const held = await f.hold(); f.listeners.get('focus')(); await held.started
  assert.equal(f.render().progress, null, 'Automatic checks never mount progress UI')
  assert.equal(f.render().background, true)
  const beforeOverlap = f.reads(); f.listeners.get('online')(); f.docListeners.get('visibilitychange')()
  await f.flush(); assert.equal(f.reads(), beforeOverlap, 'Triggers cannot overlap network sync')
  held.release(); await f.flush(); await f.advance(900)
  assert.equal(f.reads(), beforeOverlap + 1, 'Coalesce overlapping triggers into one follow-up')
  const beforeSavedEdit = f.reads()
  f.local['day:2026-11-07'].tasks[0].text = 'Saved on Mac'
  f.hooks.changeKey = 'saved-edit'; f.render(); await f.advance(899)
  assert.equal(f.reads(), beforeSavedEdit, 'Saved edits debounce')
  await f.advance(1); assert.equal(f.reads(), beforeSavedEdit + 1)
  f.render().toggleEnabled(false); await f.flush()
  const beforePause = f.reads(); await f.advance(30_000)
  assert.equal(f.reads(), beforePause, 'Explicit pause stops polling')
  f.dispose(); assert.equal(f.timers.size, 0); assert.equal(f.listeners.size, 0); assert.equal(f.docListeners.size, 0)

  f = await fixture(); f.hooks.focusActive = true; f.render()
  f.remote('day:2026-11-07', day('Tasks during Focus'))
  f.remote('focus:mission', { id: 'mission', taskId: 't', taskText: 'Focus', vehicleCode: 'v', orbitLabel: 'Orbit', durationMinutes: 25, completedAt: 1, orbitIndex: 0 })
  await f.advance(900)
  assert.equal(f.local['day:2026-11-07'].tasks[0].text, 'Tasks during Focus')
  assert.equal(f.hooks.missions.length, 0); assert.equal(f.render().upToDate, false)
  assert.match(f.render().message, /session to finish/)
  f.hooks.focusActive = false; f.render(); await f.advance(900)
  assert.equal(f.hooks.missions.length, 1, 'Finish Focus resumes deferred history')
  assert.equal(f.render().error, null); f.dispose()
  console.log('Passed automatic remote arrival, empty capture, draft resume, visibility, offline retry, overlap, cleanup and Focus-scoped sync')
}
module.exports = { fixture }
if (require.main === module) main().catch(error => { console.error(error); process.exit(1) })
