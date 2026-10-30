const assert = require('node:assert/strict')
const load = require('./helpers/load-typescript.cjs')
;(async () => {
  const globals = { document: { visibilityState: 'hidden' }, requestAnimationFrame: () => { throw Error('Hidden frame requested') }, cancelAnimationFrame() {} }
  let { yieldSyncUi, nextSyncProgress } = load('src/syncProgress.ts', {}, globals)
  await yieldSyncUi()
  let cancelled = false
  ;({ yieldSyncUi } = load('src/syncProgress.ts', {}, { document: { visibilityState: 'visible' }, requestAnimationFrame: () => 7, cancelAnimationFrame: id => { cancelled = id === 7 } }))
  await yieldSyncUi()
  assert.ok(cancelled, 'A stopped WebKit frame must release the wait and cancel the callback')
  const first = nextSyncProgress(null, 'Reading cloud', {}, 100)
  const loaded = nextSyncProgress(first, 'Uploading', { total: 3, detail: '2026-10-30' }, 200)
  const saved = nextSyncProgress(loaded, 'Uploading', { completed: 1, detail: loaded.detail }, 300)
  assert.equal(first.total, null)
  assert.equal(saved.startedAt, 100)
  assert.equal(saved.updatedAt, 300)
  assert.equal(saved.total, 3)
  assert.equal(saved.completed, 1)
  // Exercise the real hook with delayed upload acknowledgements and synthetic storage.
  const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
  const fixture = async (fail = false, conflictMode = false, editDuringUpload = false) => {
    const slots = [], pendingEffects = [], seen = [], storage = new Map()
    let cursor = 0, heldResolve, startedResolve
    const held = new Promise(resolve => { heldResolve = resolve })
    const started = new Promise(resolve => { startedResolve = resolve })
    const user = { uid: 'u', getIdToken: async () => 'fixture' }
    const auth = { app: { options: { projectId: 'p' } }, currentUser: user }
    const metadataKey = 'todo-sticky-cloud-v1:p:u:https://sync.example.test:/fixture'
    storage.set('todo-sticky-cloud-server-v1', 'https://sync.example.test')
    storage.set('todo-sticky-cloud-owner-v1', 'p:u')
    storage.set(metadataKey, JSON.stringify({ enabled: true, baseline: {}, pending: {}, conflicts: [] }))
    const react = {
      useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
        return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; if (slots[i]?.stage) seen.push({...slots[i]}) }] },
      useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }) },
      useCallback: fn => fn,
      useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((x,j) => x !== old.deps[j])) { slots[i] = {deps}; pendingEffects.push(fn) } },
    }
    const sync = load('src/cloudSync.ts', {}, { URL })
    let first = true, cloudRevision = 2
    const applied = []
    const cloudRecord = (key, payload, revision = 1) => ({key, payload, revision, deleted:false, updatedAt:'', mutationId:'fixture-mutation'})
    const requestJson = async (origin, path, options = {}) => {
      if (options.method !== 'PUT') return { schemaVersion: 1, records: conflictMode ? [cloudRecord('day:2026-10-30',{date:'2026-10-30',tasks:[{id:'t',text:`Cloud ${cloudRevision}`,status:'todo',subtasks:[]}]},cloudRevision),cloudRecord('goals',{targets:[],recurring:[]})] : [], nextCursor: null }
      if (first) { first = false; startedResolve(); await held }
      if (fail) throw Error('Fixture rejection')
      const body = JSON.parse(options.body)
      return {...body, key: decodeURIComponent(path.split('/').pop()), revision: 1, updatedAt: ''}
    }
    const mocks = { react, 'firebase/auth': { onAuthStateChanged: (_, fn) => {fn(user); return () => {}} },
      '@tauri-apps/api/core': { invoke: async (command, args) => { if(command==='cloud_apply_day')applied.push(args); return '/fixture' } },
      '../api': { api: { extractTaskApi: async () => ({dates:[{date:'2026-10-30',tasks:[{id:'t',text:'',status:'todo',subtasks:[]}]}]}) }, waitForPendingWrites: async () => {} },
      '../cloudAccount': { connectAccount: async () => auth, requestJson }, '../cloudSync': sync,
      '../syncConflicts': load('src/syncConflicts.ts'),
      '../syncProgress': { ...load('src/syncProgress.ts'), yieldSyncUi: async () => {} },
    }
    const result = {}
    const code = ts.transpileModule(fs.readFileSync('src/hooks/useCloudSync.ts','utf8').replace('import.meta.env.VITE_SYNC_SERVER_URL', "''"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
    vm.runInNewContext(code,{exports:result,require:n=>{if(!(n in mocks))throw Error(n);return mocks[n]},
      localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},crypto:require('node:crypto').webcrypto,
      setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},window:{addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',querySelector:()=>null}})
    const hooks={kbPath:'/fixture',ready:true,blocked:false,changeKey:'fixture',flush:async()=>{},reload:async()=>{},goals:{targets:[],recurring:[]},missions:[],applyGoals(){},applyMission:async()=>{}}
    const render=()=>{cursor=0;const account=result.useCloudSync(hooks);pendingEffects.splice(0).forEach(fn=>fn());return account}
    for(let i=0;i<4;i++){render();await new Promise(setImmediate)}
    if(conflictMode) {
      await render().sync()
      const review = render().conflicts[0]
      assert.equal(render().recovery.length,1,'Preserve both copies on detection, before a choice')
      const fingerprint = mocks['../syncConflicts'].conflictFingerprint(review)
      cloudRevision = 3
      await render().resolve(review.key,'cloud',fingerprint)
      assert.match(render().error,/Conflict changed/)
      assert.equal(applied.length,0,'Do not apply a changed cloud version under an old review')
      assert.equal(render().recovery.length,2)
      assert.equal(render().conflicts[0].remote.revision,3)
      return
    }
    const work=render().sync();await started
    assert.equal(render().progress.stage,'Uploading');assert.equal(render().progress.completed,0);assert.equal(render().progress.total,2)
    if (editDuringUpload) { hooks.changeKey = 'edit-during-upload'; render() }
    heldResolve();await work
    assert.equal(render().busy,false);assert.equal(render().progress,null)
    if(fail){assert.match(render().error,/Uploading \(2026-10-30\)/);assert.ok(seen.every(p=>p.completed===0))}
    else {
      assert.equal(render().error,null);assert.ok(seen.some(p=>p.completed===2))
      assert.equal(render().upToDate,!editDuringUpload,'Only acknowledged current content is synced')
      hooks.changeKey='edited-after-sync'
      assert.equal(render().upToDate,false,'New edits immediately clear the synced indicator')
    }
  }
  await fixture();await fixture(true);await fixture(false,true);await fixture(false,false,true)
  console.log('Passed real sync-hook acknowledgement progress, failure context and hidden-frame recovery')
})().catch(e => { console.error(e); process.exit(1) })
