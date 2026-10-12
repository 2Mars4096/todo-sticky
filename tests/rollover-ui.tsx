import React from 'react'
import { createRoot } from 'react-dom/client'
import { format, subDays } from 'date-fns'
import { api } from '../src/api'
import { useTasks } from '../src/hooks/useTasks'
import { TaskList } from '../src/components/TaskList'
import '../src/styles/sticky.css'
const today = format(new Date(), 'yyyy-MM-dd')
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
const older = format(subDays(new Date(), 8), 'yyyy-MM-dd')
const task = (id: string, status = 'todo', subtasks: any[] = []) => ({ id, text: id, status, subtasks })
const seed = {
 [today]: [task('Today task', 'todo', [task('Today step')])],
 [yesterday]: [task('Yesterday task', 'todo', [task('First step'), task('Second step')]), task('Archived completed', 'done')],
 [older]: [task('Older task', 'partial')],
}
const sections = JSON.parse(localStorage.getItem('rollover-fixture') || 'null') || seed
const writes: any[] = []
;(window as any).fixture = { sections, writes, today, yesterday, older }
api.getTasks = async date => ({ filePath: 'fixture.md', tasks: (sections[date] || []).map((t: any) => ({ ...t, todaySubtasks: t.subtasks, otherSubtasks: [] })) })
api.extractTaskApi = async () => ({ dates: Object.entries(sections).map(([date, tasks]) => ({ date, tasks, filePath: 'fixture.md', weekStart: older, revision: 'fixture' })) as any, unavailableFiles: [] })
api.saveTasks = async payload => { sections[payload.dateStr] = payload.tasks; writes.push(payload); localStorage.setItem('rollover-fixture', JSON.stringify(sections)); return {ok:true} }
api.onFileChanged = () => () => {}
function Fixture() {
 const tasks = useTasks(today, true)
 return <div style={{width:'100%',height:'100vh',background:'#FFF8DC'}}><TaskList
 tasks={tasks.tasks} loading={tasks.loading} loadError={tasks.loadError} rolloverError={tasks.rolloverError}
 viewMode="today" isCurrentDay moveTargetLabel="tomorrow" onToggle={tasks.toggleStatus} onDelete={tasks.deleteTask}
 onPush={tasks.carryForward} onCopyTask={()=>{}} onTextChange={tasks.updateTaskText} onAddSubtask={tasks.addSubtask}
 onAddTask={tasks.addTask} onReorderTask={tasks.reorderTasks} onReorderSubtask={tasks.reorderSubtasks}
 onAIBreakdown={()=>{}} onFocusTask={()=>{}} onGoToday={()=>{}} onRetryLoad={tasks.load} /></div>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
