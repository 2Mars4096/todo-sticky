const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
function fixture() {
  const writes=[], timers=new Map();let taskState=[],nextTimer=0
  const apiExports={}
  vm.runInNewContext(transpile('src/api.ts'), {exports:apiExports,require:name=>{
    if(name==='@tauri-apps/api/core') return {invoke:(command,payload)=>new Promise((resolve,reject)=>writes.push({command,payload,resolve,reject}))}
    if(name==='@tauri-apps/api/event') return {listen:()=>{}}
    throw Error(name)
  }})
  const hookExports={}
  vm.runInNewContext(transpile('src/hooks/useTasks.ts'),{
    exports:hookExports,console:{error:()=>{}},
    setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearTimeout:id=>timers.delete(id),
    require:name=>{
      if(name==='react')return {useRef:current=>({current}),useEffect:()=>{},useCallback:fn=>fn,useState:initial=>[initial,update=>{if(typeof update==='function')taskState=update(taskState)}]}
      if(name==='../api')return apiExports
      if(name==='../taskCarryForward')return {resolveTaskCarryForwardTarget:()=>({dateStr:'2026-10-04'})}
      throw Error(name)
    },
  })
  return {hook:hookExports.useTasks('2026-10-03'),api:apiExports,writes,timers}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve))
;(async()=>{
  let f=fixture();f.hook.addTask('Save before update')
  let done=false;const flush=f.hook.flushPendingSave().then(()=>{done=true})
  await tick();assert.equal(f.timers.size,0);assert.equal(f.writes.length,1);assert.equal(done,false)
  assert.equal(f.writes[0].payload.tasks[0].text,'Save before update')
  f.writes[0].resolve({filePath:'test.md'});await flush;assert.equal(done,true)
  await f.hook.flushPendingSave();assert.equal(f.writes.length,1)
  f=fixture();f.hook.addTask('Already saving');const save=[...f.timers.values()][0]()
  const inFlightFlush=f.hook.flushPendingSave();await tick();assert.equal(f.writes.length,1)
  f.writes[0].resolve({filePath:'test.md'});await Promise.all([save,inFlightFlush]);assert.equal(f.writes.length,1)
  f=fixture();f.hook.addTask('Retry failed save');const failure=f.hook.flushPendingSave();await tick()
  f.writes[0].reject(Error('Disk unavailable'));await assert.rejects(failure,/Disk unavailable/)
  const retry=f.hook.flushPendingSave();await tick();assert.equal(f.writes.length,2)
  f.writes[1].resolve({filePath:'test.md'});await retry
  f=fixture();const saveFocus=f.api.api.saveStarFocusState({});const drain=f.api.waitForPendingWrites();let drained=false;drain.then(()=>{drained=true})
  await tick();assert.equal(drained,false);f.writes[0].resolve({ok:true});await Promise.all([saveFocus,drain]);assert.equal(drained,true)
  console.log('Passed update persistence checks: debounce flush, in-flight writes, save failure/retry, and native focus-state drain')
})().catch(e=>{console.error(e);process.exitCode=1})
