const assert=require('node:assert/strict')
const load=require('./helpers/load-typescript.cjs')
let provider='openai';const calls=[],shared=[]
const api=load('src/api.ts',{'./notebookCommand':{invoke:async(name,args)=>{calls.push({name,args});if(name==='get_settings')return {provider,kbPath:'/fixture'};return {subtasks:[{text:'Direct result'}]}}},'@tauri-apps/api/event':{},'./cloudAccount':{usesDianeOpenRouter:p=>p==='diane'||p==='openrouter',runSharedTodoAgent:async(...args)=>{shared.push(args);return {subtasks:[{text:'Shared result'}]}}}}).api
;(async()=>{
 await api.llmBreakdown({taskText:'Work',existingSubtasks:[]});assert.equal(shared.length,0);assert.equal(calls.at(-1).name,'llm_breakdown')
 provider='openrouter';calls.length=0
 await api.llmBreakdown({taskText:'Paired task',existingSubtasks:[]});assert.equal(shared[0][0],'breakdown');assert.equal(calls.some(c=>c.name==='llm_breakdown'),false)
 shared.length=0
 provider='diane';calls.length=0
 await api.llmBreakdown({taskText:'Work',existingSubtasks:[]});assert.equal(shared[0][0],'breakdown');assert.equal(shared[0][2],'/fixture');assert.equal(calls.some(call=>call.name==='llm_breakdown'),false)
 await api.llmSchedule({tasks:[],machines:[],dateStr:'2026-11-10',availableStart:'09:00',availableEnd:'17:00'});assert.equal(shared.at(-1)[0],'schedule')
 await api.llmProjectPlan({mode:'steps',goal:{text:'Outcome'}});assert.equal(shared.at(-1)[0],'project')
 const connection = await api.testConnection({provider:'diane',apiBase:'',apiKey:'',model:''})
 assert.equal(connection.message,'pipedreams connected. Requests use your shared account limits.')
 await api.llmRecommendAlbums({tasks:[]});assert.equal(shared.at(-1)[0],'albums')
 console.log('Shared agent: explicit direct provider stays direct; shared mode uses original typed action/input through the account bridge without native fallback')
})().catch(error=>{console.error(error);process.exit(1)})
