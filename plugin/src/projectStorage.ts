import { storageForAccount } from './storage'
import { createTodoApi } from './api'
import { canonical, validateRecords } from './cloudSync'
import type { GoalItem } from './types'
import { validateGoalPlan, validProjectDate, type ProjectOperation } from './projectPlanning'
const key = (folder: string) => `todo-sticky-project-write-v1:${folder}`
export function pendingProject(folder: string): ProjectOperation | null {
  const raw = storageForAccount(folder).getItem(key(folder))
  if (!raw) return null
  const value = JSON.parse(raw) as ProjectOperation
  if (!value || value.folder !== folder || !value.before?.id || value.after?.id !== value.before.id || !Array.isArray(value.days)
    || value.days.some(day=>!validProjectDate(day.date)||!Array.isArray(day.before)||!Array.isArray(day.after))) throw new Error('The pending project save needs recovery. Its original data has been kept.')
  validateGoalPlan(value.after.plan ?? [])
  const record = (key:string,payload:unknown) => ({key,payload,revision:1,deleted:false,updatedAt:'',mutationId:'project-recovery'})
  for(const goal of [value.before,value.after]) validateRecords([record('goals',{targets:[goal],recurring:[]})])
  for(const day of value.days) for(const tasks of [day.before,day.after]) validateRecords([record(`day:${day.date}`,{date:day.date,tasks})])
  return value
}
export function beginProjectOperation(operation: ProjectOperation) {
  const folder=operation.folder
  if (pendingProject(operation.folder)) throw new Error('Finish the pending project save first.')
  storageForAccount(folder).setItem(key(operation.folder),JSON.stringify(operation))
}
export function discardProjectOperation(folder: string) { const operation=pendingProject(folder); storageForAccount(folder).removeItem(key(folder)); if(operation)window.dispatchEvent(new CustomEvent('diane:todo-recovery-resolved',{detail:{scope:folder,operation}})) }
export async function resumeProjectOperation(folder: string, getGoal: (id:string)=>GoalItem|undefined, saveGoal:(before:GoalItem,after:GoalItem)=>void|Promise<void>) {
  const api=createTodoApi(folder)
  const operation = pendingProject(folder)
  if (!operation) return
  const goal = getGoal(operation.before.id)
  if (!goal || (canonical(goal)!==canonical(operation.before) && canonical(goal)!==canonical(operation.after))) throw new Error('The project changed during a pending save. Saved work is safe; discard the remaining operation before editing again.')
  // Goals first: a failed day write leaves valid unscheduled steps, never orphaned new tasks.
  await saveGoal(operation.before,operation.after)
  for (const change of operation.days) {
    const current = await api.extractTaskApi({date:change.date,canonicalDates:true})
    const tasks = current.dates.find(day=>day.date===change.date)?.tasks ?? []
    if (canonical(tasks)===canonical(change.after)) continue // An acknowledged write or interrupted response.
    if (canonical(tasks)!==canonical(change.before)) throw new Error(`Daily work changed on ${change.date}. Saved work is safe; discard the remaining operation and refresh.`)
    await api.applyDay(change.date,change.after,tasks)
  }
  discardProjectOperation(folder)
}
