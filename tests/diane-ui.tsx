import React, { useEffect, useState } from 'react'
import { AddTask } from '../src/components/AddTask'
import type { Task } from '../src/types'
import { createRoot } from 'react-dom/client'
import { DianeProvider } from '../src/components/DianeAction'
import { TaskItem } from '../src/components/TaskItem'
import '../src/styles/sticky.css'
const failure = new URLSearchParams(location.search).get('failure')
const statuses = ['queued', 'running', 'attention', 'ready', 'stopped', 'failed']
const entries = Object.fromEntries(statuses.map(status => {
 const task_key = `test|2026-10-10|${status}`, request_id = crypto.randomUUID()
 const request = { request_id, task_key, text: status, parent: '', steps: [], project_id: 'project-a' }
 return [task_key, { request, result: { request_id, task_key, session_id: 'session', workflow_id: 'project-a', project_name: 'Test project', status, summary: 'Evidence: verified the requested output.', artifacts: [], updated_at: new Date().toISOString() } }]
}))
if (!localStorage.getItem('sticky-todo-diane-v1')) localStorage.setItem('sticky-todo-diane-v1', JSON.stringify(entries))
if (failure === 'corrupt') localStorage.setItem('sticky-todo-diane-v1', '{broken')
;(window as any).calls = []
;(window as any).__TAURI_INTERNALS__ = { invoke: async (_: string, args: any) => {
 (window as any).calls.push(args)
 if (failure === 'offline') throw Error('Diane is not installed or connected')
 if (failure === 'pending') return new Promise(() => {})
 if (failure === 'malformed') return {}
 if (args.action === 'projects') return {version:1, projects:[{id:'project-a',name:'Test project',root:'/tmp'}],active_project_id:'project-a'}
 const saved = JSON.parse(localStorage.getItem('sticky-todo-diane-v1') || '{}')
 if (args.action === 'dispatch') { await new Promise(r => setTimeout(r, 100)); return {...args.body, session_id:'new-session',workflow_id:'project-a',project_name:'Test project',status:'running',summary:'Working',artifacts:[],updated_at:new Date().toISOString()} }
 const entry: any = Object.values(saved).find((e: any) => e.request.request_id === args.requestId)
 if ((window as any).offline) throw Error('Connection unavailable')
 if (args.action === 'stop') return {...entry.result, stopping:true}
 if (args.action === 'open') return {ok:true}
 return entry?.result
}}
function Fixture() {
 const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem('fixture-tasks') || 'null') || ['new', ...statuses].map(id => ({ id, text:id === 'new' ? 'Inspect this project' : id, status:'todo', subtasks:[] })))
 useEffect(() => { localStorage.setItem('fixture-tasks', JSON.stringify(tasks)) }, [tasks])
 const edit = (id: string, patch: Partial<Task>) => setTasks(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row))
 return <div style={{width:440,padding:12}}><DianeProvider date="2026-10-10" kbPath="test">
  <AddTask inline onAdd={text => setTasks(rows => [...rows, { id:crypto.randomUUID(), text, status:'todo', subtasks:[] }])}/>
  {tasks.map(task => <TaskItem key={task.id} id={task.id} text={task.text} status={task.status} viewMode="today" moveTargetLabel="tomorrow"
   onToggle={() => edit(task.id, {status:task.status === 'done' ? 'todo' : 'done'})}
   onDelete={() => setTasks(rows => rows.filter(row => row.id !== task.id))} onPush={()=>{}} onTextChange={text => edit(task.id, {text})}/>)}</DianeProvider></div>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
