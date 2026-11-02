const assert=require('node:assert/strict')
const load=require('./helpers/load-typescript.cjs')
const crypto=require('node:crypto').webcrypto
const p=load('src/projectPlanning.ts',{}, {crypto})
const {archiveRows,archiveSummary}=load('src/taskArchive.ts')
const plain=value=>JSON.parse(JSON.stringify(value))
const task=(id,extra={})=>({id,text:id,status:'todo',subtasks:[],...extra})
const goal={id:'g',text:'Research\nFull description from phone',done:false,plan:[{id:'a',text:'Read inputs'},{id:'b',text:'Write result'}]}
const day=(date,tasks)=>({date,tasks,filePath:'fixture',weekStart:date,revision:'1'})
const days=[day('2026-11-02',[task('a',{goalId:'g',goalStepId:'a',status:'done'})]),day('2026-11-03',[task('a',{goalId:'g',goalStepId:'a',status:'todo'})])]
const rows=archiveRows(days,[goal])
assert.equal(p.projectProgress(goal,rows).completed,0,'All dated fragments must finish')
days[1].tasks[0].status='done'
assert.equal(p.projectProgress(goal,archiveRows(days,[goal])).completed,1)
const assigned=p.assignTaskProject(task('root',{goalId:'old',goalStepId:'s',subtasks:[task('child'),task('other',{goalId:'different'})]}),'g','old')
assert.equal(assigned.goalId,'g');assert.equal(assigned.goalStepId,undefined);assert.equal(assigned.subtasks[0].goalId,'g');assert.equal(assigned.subtasks[1].goalId,'different')
const nested=archiveRows([day('2026-11-02',[assigned])],[goal])
assert.equal(p.projectUnits(nested,'g').length,1)
assert.equal(archiveSummary(nested,'2026-11-02','2026-11-02','different').roots.length,1)
const window={from:'2026-11-02',until:'2026-11-08',minutesPerDay:60,weekdaysOnly:true}
const action={id:'draft',stepId:'b',text:'Write result',date:'2026-11-03',minutes:30}
p.validateProjectActions([action],goal,rows,window)
assert.throws(()=>p.validateProjectActions([{...action,stepId:'a'}],goal,rows,window),/already/)
assert.throws(()=>p.validateProjectActions([{...action,date:'2026-11-07'}],goal,rows,window),/permitted/)
assert.throws(()=>p.validateProjectActions([{...action,minutes:61}],goal,rows,window),/budget/)
assert.throws(()=>p.validateProjectActions([action,{id:'new',text:'New action',date:action.date,minutes:40}],goal,rows,window),/budget/)
assert.throws(()=>p.validateProjectActions([{...action,stepId:undefined}],goal,rows,window),/existing/)
assert.throws(()=>p.validateProjectActions([action],{...goal,done:true},rows,window),/Reopen/)
const op=p.scheduledOperation('/fixture',goal,days,[action,{id:'c',text:'Show result',date:'2026-11-04',minutes:15}])
assert.equal(op.days.length,2);assert.equal(op.after.plan.length,3);assert.equal(op.days[0].after.at(-1).goalStepId,'b')
assert.equal(goal.plan.length,2,'Preparation does not mutate the goal')
const detached=p.removeStepOperation('/fixture',goal,days,'a')
assert.ok(detached.days.every(day=>day.after[0].goalId==='g'&&!day.after[0].goalStepId))
assert.equal(detached.after.plan.length,1)
;(async()=>{
 const storage=new Map(),written=[],data=new Map(days.map(day=>[day.date,plain(day.tasks)]));let current=plain(goal),fail=true
 const st=load('src/projectStorage.ts',{'@tauri-apps/api/core':{invoke:async(cmd,args)=>{
  if(fail&&args.date==='2026-11-04')throw Error('disk unavailable')
  assert.deepEqual(data.get(args.date)??[],plain(args.expectedTasks));data.set(args.date,plain(args.tasks));written.push(args.date)
 }},'./api':{api:{extractTaskApi:async({date})=>({dates:[day(date,data.get(date)??[])]})}}},{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}})
 const save=(_before,after)=>{current=plain(after)}
 st.beginProjectOperation(op)
 await assert.rejects(st.resumeProjectOperation('/fixture',()=>current,save),/disk/)
 assert.equal(written.length,1);assert.ok(st.pendingProject('/fixture'));assert.equal(current.plan.length,3)
 fail=false;await st.resumeProjectOperation('/fixture',()=>current,save)
 assert.deepEqual(written,['2026-11-03','2026-11-04'],'Retry skips an already saved date')
 assert.equal(st.pendingProject('/fixture'),null)
 // Pending operations never overwrite unrelated edits; discard keeps saved state.
 st.beginProjectOperation(op);current={...goal,text:'Changed elsewhere'}
 await assert.rejects(st.resumeProjectOperation('/fixture',()=>current,save),/changed/)
 st.discardProjectOperation('/fixture');assert.equal(data.get('2026-11-03').at(-1).goalId,'g')
 console.log('Passed linked fragments, assignment, project constraints, removal and partial-save retry/stale protection')
})().catch(error=>{console.error(error);process.exitCode=1})
