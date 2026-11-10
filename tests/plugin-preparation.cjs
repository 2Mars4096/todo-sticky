const assert=require('node:assert/strict');const load=require('./helpers/load-typescript.cjs');
function rig(overrides={}){let owner='one',cleanup;const timers=new Map(),calls=[];let serial=0,flushed=0;const globals={AbortController,document:{hidden:false},setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial},clearTimeout:id=>timers.delete(id)};
 const {useTaskPreparation}=load('plugin/src/hooks/useTaskPreparation.ts',{react:{useEffect:fn=>{cleanup=fn()}},'@diane/plugin-sdk/client':{pluginScope:()=>owner},'@diane/plugin-sdk/http':{requestJson:async(url,options)=>{calls.push({url,options,flushed})}}},globals);
 useTaskPreparation({active:true,enabled:true,loading:false,scope:'one',taskKey:'first',flush:async()=>{flushed++},...overrides});
 return {calls,timers,setOwner:value=>owner=value,close:()=>cleanup?.(),tick:async()=>{const [id,item]=timers.entries().next().value;timers.delete(id);item.fn();await new Promise(setImmediate);},get flushed(){return flushed}};
}
(async()=>{
 for(const values of [{active:false},{enabled:false},{loading:true}])assert.equal(rig(values).timers.size,0);
 let r=rig();assert.equal([...r.timers.values()][0].ms,1000);await r.tick();assert.equal(r.calls.length,1);assert.equal(r.calls[0].flushed,1);assert.equal(r.calls[0].url,'/api/sticky-todo/preparations/refresh');assert.equal(r.calls[0].options.body,'{"scope":"one"}');assert.equal([...r.timers.values()][0].ms,60000);await r.tick();assert.equal(r.calls.length,2);r.close();assert.equal(r.timers.size,0);assert.equal(r.calls[0].options.signal.aborted,true);
 let release;const pending=new Promise(resolve=>release=resolve);r=rig({flush:()=>pending});await r.tick();r.setOwner('two');release();await new Promise(setImmediate);assert.equal(r.calls.length,0);assert.equal(r.timers.size,0);
 r=rig({flush:async()=>{throw Error('unsaved')}});await r.tick();assert.equal(r.calls.length,0);assert.equal(r.timers.size,1);r.close();
 r=rig();r.close();assert.equal(r.timers.size,0);
 console.log('Plugin preparation: inactive/loading gates, debounce, saved-before-request, quiet repeat, account-switch during flush, save failure and unmount abort passed');
})().catch(e=>{console.error(e);process.exitCode=1});
