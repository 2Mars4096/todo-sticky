const assert = require('node:assert/strict')
const load = require('./helpers/load-typescript.cjs')
const calls = [], storage = new Map()
let scope = 'account-a', failure = false, changed = false
const record = {schema_version:1,record_type:'task',record_id:'canonical',revision:2,title:'Task',text:'Task',status:'todo',tags:[],relationships:[],attachments:[],extensions:{date:'2026-11-10',source:{app:'todo-sticky',id:'local'}}}
const suggestion = {project_id:'a',context:'Reviewed context',reason:''}
const api = async (action,id,body) => {
 calls.push({action,id,body})
 if(action==='connection') return {scope}
 if(action==='preparation-records')return {items:[{...record,text:changed?'New text':'Task'}]}
 if(action==='prepare'){if(failure)throw Error('Timeout'); return {suggestion}}
 if(action==='preparation-status')return {status:failure?'running':'completed',result:{suggestion}}
 throw Error(action)
}
const {executionContract,suggestDianeSetup}=load('web/src/dianePreparation.ts',{'./diane':{dianeRequest:api}},{crypto:require('node:crypto').webcrypto,TextEncoder,structuredClone,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}})
const input={id:'local',date:'2026-11-10',text:'Task',parent:'Parent',steps:['Step'],projects:[{id:'a',name:'A',root:'/tmp/a'}]}
;(async()=>{
 const fixture={schema_version:1,title:'研究',text:'Task',status:'todo',tags:[],relationships:[{kind:'parent',target:{record_id:'p',unresolved:true}}],attachments:[],extensions:{date:'2026-11-10',order:2,planned_minutes:30,outcome:'Done'}}
 assert.equal(await executionContract(fixture),'d79284824c338315c68969a1bfb2e1981300de4daf4a047a2251d326948bfea5')
 assert.equal(fixture.extensions.order,2)
 assert.equal((await suggestDianeSetup(input)).context,suggestion.context)
 await suggestDianeSetup(input)
 assert.equal(calls.filter(c=>c.action==='prepare').length,1)
 changed=true; await assert.rejects(suggestDianeSetup(input),/Sync this task/);changed=false
 storage.clear();failure=true;await assert.rejects(suggestDianeSetup(input),/Timeout/)
 const before=calls.filter(c=>c.action==='prepare').length
 await assert.rejects(suggestDianeSetup(input),/pending or uncertain/)
 assert.equal(calls.filter(c=>c.action==='prepare').length,before)
 assert.equal(calls.some(c=>c.action==='dispatch'),false)
 console.log('Diane preparation: Python contract parity, original-ID matching, stale sync rejection, durable receipt reuse and no execution passed')
})().catch(e=>{console.error(e);process.exit(1)})

const {dianeReceiptKey}=load('web/src/diane.ts',{'@tauri-apps/api/core':{}})
const links={'/notes|2026-11-10|task-a':{},'/notes|2026-10-31|2026-10-31:task-a':{}}
assert.equal(dianeReceiptKey(links,'/notes','2026-11-10','2026-11-10:task-a'),'/notes|2026-11-10|task-a')
assert.equal(dianeReceiptKey(links,'/notes','2026-10-31','task-a'),'/notes|2026-10-31|2026-10-31:task-a')
assert.equal(dianeReceiptKey(links,'/notes','2026-11-11','task-a'),'/notes|2026-11-11|task-a')
assert.equal(dianeReceiptKey({'/notes|2026-11-10|task-a':{}},'/notes','2026-11-11','task-a'),'/notes|2026-11-10|task-a')
assert.equal(dianeReceiptKey(links,'/other','2026-11-10','task-a'),'/other|2026-11-10|task-a')
