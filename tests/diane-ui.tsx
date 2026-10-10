import React from 'react'
import { createRoot } from 'react-dom/client'
import { DianeProvider } from '../src/components/DianeAction'
import { TaskItem } from '../src/components/TaskItem'
import '../src/styles/sticky.css'
const statuses = ['queued', 'running', 'attention', 'ready', 'stopped', 'failed']
const entries = Object.fromEntries(statuses.map(status => {
 const task_key = `test|2026-10-10|${status}`, request_id = crypto.randomUUID()
 const request = { request_id, task_key, text: status, parent: '', steps: [], project_id: 'project-a' }
 return [task_key, { request, result: { request_id, task_key, session_id: 'session', workflow_id: 'project-a', project_name: 'Test project', status, summary: 'Evidence: verified the requested output.', artifacts: [], updated_at: new Date().toISOString() } }]
}))
if (!localStorage.getItem('sticky-todo-diane-v1')) localStorage.setItem('sticky-todo-diane-v1', JSON.stringify(entries))
;(window as any).calls = []
;(window as any).__TAURI_INTERNALS__ = { invoke: async (_: string, args: any) => {
 (window as any).calls.push(args)
 if (args.action === 'projects') return {version:1, projects:[{id:'project-a',name:'Test project',root:'/tmp'}],active_project_id:'project-a'}
 const saved = JSON.parse(localStorage.getItem('sticky-todo-diane-v1') || '{}')
 if (args.action === 'dispatch') { await new Promise(r => setTimeout(r, 100)); return {...args.body, session_id:'new-session',workflow_id:'project-a',project_name:'Test project',status:'running',summary:'Working',artifacts:[],updated_at:new Date().toISOString()} }
 const entry: any = Object.values(saved).find((e: any) => e.request.request_id === args.requestId)
 if ((window as any).offline) throw Error('Connection unavailable')
 if (args.action === 'stop') return {...entry.result, stopping:true}
 if (args.action === 'open') return {ok:true}
 return entry?.result
}}
createRoot(document.getElementById('root')!).render(<div style={{width:440,padding:12}}><DianeProvider date="2026-10-10" kbPath="test">{['new',...statuses].map(status=><TaskItem key={status} id={status} text={status==='new'?'Inspect this project':status} status="todo" viewMode="today" moveTargetLabel="tomorrow" onToggle={()=>{}} onDelete={()=>{}} onPush={()=>{}} onTextChange={()=>{}}/>)}</DianeProvider></div>)
