const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./helpers/load-typescript.cjs');
async function run(count,pulls=false,changeDuringPull=false){
 const slots=[],effects=[],storage=new Map(),reads=[],writes=[];let cursor=0,reloads=0,applies=0,metadataWrites=0;
 const local={},cloud=[],baseline={};
 for(let i=0;i<count;i++){
  const date=new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),key='day:'+date;
  const payload={date,tasks:[{id:'t'+i,text:'Local '+i,status:'todo',subtasks:[]}]};
  local[key]=structuredClone(payload);baseline[key]={revision:1,payload:structuredClone(payload),deleted:false,payloadSchemaVersion:1};
  cloud.push({key,revision:pulls?2:1,payload:pulls?{date,tasks:[{...payload.tasks[0],text:'Remote '+i}]}:structuredClone(payload),deleted:false,updatedAt:'',mutationId:'m'+i});
 }
 local.goals={targets:[],recurring:[]};baseline.goals={revision:1,payload:local.goals,deleted:false,payloadSchemaVersion:1};cloud.push({key:'goals',revision:1,payload:local.goals,deleted:false,updatedAt:'',mutationId:'goals'});
 const key='todo-sticky-cloud-v1:p:u:https://sync.example.test:/fixture';storage.set('todo-sticky-cloud-server-v1','https://sync.example.test');storage.set('todo-sticky-cloud-owner-v1','p:u');storage.set(key,JSON.stringify({enabled:true,baseline,pending:{},conflicts:[]}));
 const user={uid:'u',getIdToken:async()=>'fixture'},auth={app:{options:{projectId:'p'}},currentUser:user};
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial})},useCallback:fn=>fn,useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old[j])){slots[i]=deps;effects.push(fn)}}};
 const mocks={react,'firebase/auth':{onAuthStateChanged:(_,fn)=>{fn(user);return()=>{}}},'@tauri-apps/api/core':{invoke:async(command,args)=>{
  if(command==='cloud_task_folder')return'/fixture';
  if(command==='cloud_apply_day'){assert.equal(JSON.stringify(args.expectedTasks),JSON.stringify(local['day:'+args.date]?.tasks??[]));local['day:'+args.date]={date:args.date,tasks:args.tasks};applies++;}
 }},'../api':{waitForPendingWrites:async()=>{},api:{extractTaskApi:async request=>{
  reads.push(request);if(changeDuringPull&&request.date&&applies===1)local['day:'+request.date].tasks[0].text='Concurrent edit';
  return {dates:Object.entries(local).filter(([key])=>key.startsWith('day:')&&(!request.date||key==='day:'+request.date)).map(([key,value])=>({...structuredClone(value),filePath:'fixture.md',revision:'r',weekStart:key.slice(4)}))};
 }}},'../cloudAccount':{connectAccount:async()=>auth,requestJson:async(_,path,options={})=>{if(options.method==='PUT'){writes.push(path);throw Error('Unexpected upload')}return path==='/v1/config'?{schemaVersion:1}:{schemaVersion:1,records:cloud,nextCursor:null}}},'../cloudSync':load('src/cloudSync.ts',{}, {URL}),'../syncConflicts':load('src/syncConflicts.ts'),'../syncProgress':{...load('src/syncProgress.ts'),yieldSyncUi:async()=>{}}};
 const exported={};const code=ts.transpileModule(fs.readFileSync('src/hooks/useCloudSync.ts','utf8').replace('import.meta.env.VITE_SYNC_SERVER_URL',"''"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports:exported,require:n=>mocks[n],URLSearchParams,crypto:require('node:crypto').webcrypto,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(k===key)metadataWrites++;storage.set(k,v)}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},window:{addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',querySelector:()=>null,addEventListener(){},removeEventListener(){}}});
 const hooks={kbPath:'/fixture',ready:true,blocked:false,changeKey:'fixture',flush:async()=>{},reload:async()=>{reloads++},goals:local.goals,missions:[],applyGoals:async()=>{},applyMission:async()=>{}};
 const render=()=>{cursor=0;const result=exported.useCloudSync(hooks);effects.splice(0).forEach(fn=>fn());return result};
 for(let i=0;i<4;i++){render();await new Promise(setImmediate)}
 await render().sync();const result=render();
 assert.equal(reads.filter(r=>r.all).length,1,'Exactly one full scan per sync');assert.equal(writes.length,0);
 if(changeDuringPull){assert.match(result.error,/edited/);assert.equal(applies,1);assert.equal(reloads,1,'Refresh successful downloads even after a later stale-edit rejection');}
 else {assert.equal(result.error,null);assert.equal(applies,pulls?count:0);assert.equal(reloads,pulls?1:0);if(!pulls)assert.equal(metadataWrites,0,'Unchanged records must not cause writes');}
 return {count,pulls,fullScans:reads.filter(r=>r.all).length,targetedReads:reads.filter(r=>r.date).length,reloads,metadataWrites};
}
(async()=>{console.log(await run(200));console.log(await run(20,true));await run(3,true,true);console.log('Passed bounded archive reads, one download refresh, zero idle writes and concurrent-edit preservation')})().catch(error=>{console.error(error);process.exit(1)});
