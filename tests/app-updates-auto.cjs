const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020} }).outputText
async function mount(native=true) {
  let now=0, checks=0, cleanup, nextTimer=0
  const timers=new Map(), listeners=new Map(), docListeners=new Map()
  const window={setInterval:(fn,delay)=>{timers.set(++nextTimer,{fn,delay});return nextTimer},clearInterval:id=>timers.delete(id),addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)}
  const document={visibilityState:'visible',addEventListener:(n,f)=>docListeners.set(n,f),removeEventListener:n=>docListeners.delete(n)}
  const updates={}
  vm.runInNewContext(transpile('src/appUpdates.ts'),{exports:updates,Date:{now:()=>now}})
  const hook={}
  vm.runInNewContext(transpile('src/hooks/useAppUpdates.ts'),{exports:hook,window,document,require:name=>({
    react:{useState:value=>[value,()=>{}],useRef:value=>({current:value}),useEffect:fn=>{cleanup=fn()}},
    '@tauri-apps/api/app':{getVersion:async()=> '2.1.2'},
    '@tauri-apps/api/core':{isTauri:()=>native},
    '@tauri-apps/plugin-updater':{check:async()=>{checks++;return null}},
    '@tauri-apps/plugin-process':{relaunch:async()=>{}},
    '../appUpdates':updates,
  }[name])})
  const api=hook.useAppUpdates(async()=>{})
  const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()}
  await flush()
  return {api,flush,timers,listeners,docListeners,document,cleanup:()=>cleanup(),checks:()=>checks,time:t=>{now=t},interval:updates.UPDATE_CHECK_INTERVAL_MS}
}
;(async()=>{
  let f=await mount();assert.equal(f.checks(),1,'Check on launch')
  assert.equal(f.timers.size,1);assert.equal([...f.timers.values()][0].delay,15*60*1000)
  f.listeners.get('focus')();f.listeners.get('online')();await f.flush();assert.equal(f.checks(),1)
  f.time(f.interval);f.document.visibilityState='hidden';f.docListeners.get('visibilitychange')();await f.flush();assert.equal(f.checks(),1)
  f.document.visibilityState='visible';f.docListeners.get('visibilitychange')();await f.flush();assert.equal(f.checks(),2,'Check overdue after resume')
  f.time(f.interval*2);[...f.timers.values()][0].fn();await f.flush();assert.equal(f.checks(),3,'Periodic check')
  f.api.check();await f.flush();assert.equal(f.checks(),4,'Manual check remains available')
  f.cleanup();assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);assert.equal(f.docListeners.size,0)
  f=await mount(false);assert.equal(f.checks(),0);assert.equal(f.timers.size,0);f.cleanup()
  console.log('Passed automatic update startup, 15-minute cadence, resume/online throttling, manual checks, cleanup, and browser-only gating')
})().catch(e=>{console.error(e);process.exitCode=1})
