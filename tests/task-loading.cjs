const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const transpile = file => ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const rollover = {}; vm.runInNewContext(transpile('src/taskRollover.ts'),{exports:rollover})
const tick = () => new Promise(resolve=>setImmediate(resolve))
const task = id => ({id,text:id,status:'todo',todaySubtasks:[],otherSubtasks:[]})
function fixture() {
 const slots=[],timers=new Map(),out={};let cursor=0,nextTimer=0,resolveArchive,archiveCalls=0
 const writes=[]
 const api={
  getTasks: async date=>({tasks:[task(date)],filePath:'test.md'}),
  extractTaskApi: ()=>{ archiveCalls++;return new Promise(resolve=>{resolveArchive=resolve}) },
  saveTasks: async data=>{writes.push(data)},
  onFileChanged: ()=>()=>{},
 }
 vm.runInNewContext(transpile('src/hooks/useTasks.ts'),{
  exports:out,console:{error:()=>{}},
  setTimeout:(fn,ms)=>{timers.set(++nextTimer,{fn,ms});return nextTimer},clearTimeout:id=>timers.delete(id),
  require:name=>{
   if(name==='react')return {
    useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}]},
    useRef:initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
    useCallback:fn=>fn,useEffect:()=>{},
   }
   if(name==='../api')return {api,waitForPendingWrites:async()=>{}}
   if(name==='../taskRollover')return rollover
  if(name==='../taskHistory'||name==='../taskPlanning')return require('./helpers/load-typescript.cjs')(`src/${name.slice(3)}.ts`)
   if(name==='../taskCarryForward')return {resolveTaskCarryForwardTarget:()=>({dateStr:'2026-10-13'})}
   throw Error(name)
  },
 })
 return {
  render:(date='2026-10-12',today=true)=>{cursor=0;return out.useTasks(date,today)},
  resolve:()=>resolveArchive({dates:[{date:'2026-10-11',filePath:'old.md',tasks:[{id:'old',text:'old',status:'todo',subtasks:[]}]}]}),
  timeout:()=>{for(const [id,t] of timers)if(t.ms===8000){timers.delete(id);t.fn()}},
  api,writes,calls:()=>archiveCalls,
 }
}
;(async()=>{
 let f=fixture(),load=f.render().load();await tick()
 assert.equal(f.render().loading,false)
 assert.equal(f.render().rolloverLoading,true)
 assert.equal(f.render().tasks[0].text,'2026-10-12')
 f.render().addTask('Captured during scan')
 f.resolve();await load
 assert.equal(f.render().tasks.length,3)
 assert.equal(f.render().tasks[1].text,'Captured during scan')
 await f.render().flushPendingSave()
 assert.equal(f.writes[0].tasks.length,2)
 assert.equal(f.writes[0].dateStr,'2026-10-12')
 // Deadline is local to carried work. Retry shares the unresolved native request.
 f=fixture();load=f.render().load();await tick();f.timeout();await load
 assert.equal(f.render().loading,false);assert.equal(f.render().rolloverError,true)
 const retry=f.render().load();await tick();assert.equal(f.calls(),1)
 f.resolve();await retry
 assert.equal(f.render().rolloverError,false);assert.equal(f.render().tasks.length,2)
 // Navigation invalidates a previous background result.
 f=fixture();load=f.render().load();await tick()
 await f.render('2026-10-10',false).load()
 f.resolve();await load
 assert.equal(f.render('2026-10-10',false).tasks.length,1)
 assert.equal(f.render('2026-10-10',false).tasks[0].text,'2026-10-10')
 // A stalled current-day read also exits its global loading state.
 f=fixture();f.api.getTasks=()=>new Promise(()=>{});load=f.render().load();await tick();f.timeout();await load
 assert.equal(f.render().loading,false);assert.equal(f.render().loadError,'failed')
 console.log('Passed immediate Today, edits during scan, bounded waits, shared retry, stale navigation, and stalled current-day loading checks')
})().catch(e=>{console.error(e);process.exitCode=1})
