const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/appUpdates.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsObject })
const { createAppUpdater } = exportsObject
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b}); return {promise,resolve,reject} }
function fixture(overrides = {}) {
  const calls=[], states=[]
  const resource = {
    version:'2.1.0', body:'Release notes',
    download:async cb => { calls.push('download'); cb({event:'Started',data:{contentLength:100}}); cb({event:'Progress',data:{chunkLength:50}}) },
    install:async () => {calls.push('install')}, close:async () => {calls.push('close')},
    ...overrides.resource,
  }
  const controller=createAppUpdater({
    check:async () => { calls.push('check'); return resource },
    beforeInstall:async () => { calls.push('save') }, relaunch:async () => {calls.push('restart')},
    ...overrides.deps, onChange:s=>states.push(s),
  })
  return {controller,calls,states,resource,last:()=>states.at(-1)}
}
;(async()=>{
  let f=fixture({deps:{check:async()=>null}})
  await f.controller.check(); assert.equal(f.last().phase,'current')
  await f.controller.install(); assert.equal(f.calls.length,0)
  f=fixture(); await f.controller.check(); assert.equal(f.last().version,'2.1.0')
  await f.controller.install(); assert.equal(f.last().phase,'installed')
  assert.deepEqual(f.calls,['check','save','download','save','install','close'])
  assert.equal(f.states.find(s=>s.downloaded===50).total,100)
  await f.controller.restart(); assert.equal(f.calls.at(-1),'restart')
  f=fixture({deps:{beforeInstall:async()=>{throw Error('Save failed')}}})
  await f.controller.check(); await f.controller.install(); assert.equal(f.last().phase,'error'); assert.ok(!f.calls.includes('install')); assert.ok(!f.calls.includes('download'))
  f=fixture({resource:{download:async()=>{throw Error('Invalid signature')}}})
  await f.controller.check(); await f.controller.install(); assert.match(f.last().error,/signature/); assert.ok(!f.calls.includes('install'))
  f=fixture({deps:{relaunch:async()=>{throw Error('Restart failed')}}})
  await f.controller.check(); await f.controller.install(); await f.controller.restart()
  assert.equal(f.last().phase,'installed'); assert.match(f.last().error,/Restart failed/)
  await f.controller.install(); assert.equal(f.calls.filter(c=>c==='install').length,1)
  let pending=deferred();f=fixture({deps:{check:()=>pending.promise}})
  const check=f.controller.check();await f.controller.check();f.controller.dispose();pending.resolve(f.resource);await check
  assert.equal(f.calls.filter(c=>c==='close').length,1);assert.equal(f.last().phase,'checking')
  pending=deferred();f=fixture({resource:{download:()=>pending.promise}})
  await f.controller.check();const install=f.controller.install();await f.controller.install();f.controller.dispose();pending.resolve();await install
  assert.ok(!f.calls.includes('install'));assert.equal(f.calls.filter(c=>c==='close').length,1)
  f=fixture({deps:{check:async()=>{throw Error('Offline')}}});await f.controller.check();assert.equal(f.last().phase,'error')
  console.log('Passed updater lifecycle, save gating, signature/download failure, restart retry, concurrency, and resource cleanup checks')
})().catch(e=>{console.error(e);process.exitCode=1})
