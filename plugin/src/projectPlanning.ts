import { canonical } from './cloudSync'
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import type { ExtractedTaskDate, GoalItem, GoalPlanStep, Task } from './types'
import type { ArchiveRow } from './taskArchive'

export interface ProjectWindow { from: string; until: string; minutesPerDay: number; weekdaysOnly: boolean }
export interface ProjectAction { id: string; stepId?: string; text: string; date: string; minutes: number }
export interface DayChange { date: string; before: Task[]; after: Task[] }
export interface ProjectOperation { folder: string; before: GoalItem; after: GoalItem; days: DayChange[] }
const validId = (id: string) => /^[A-Za-z0-9_-]{1,128}$/.test(id)
export const validProjectDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && isValid(parseISO(date))
export const newProjectId = () => `step_${Array.from(crypto.getRandomValues(new Uint8Array(16)), byte=>byte.toString(16).padStart(2,'0')).join('')}`
export function effectiveProject(task: {id: string; originalId?: string; goalId?: string}, goals: GoalItem[], inherited?: string) {
  return task.goalId ?? goals.find(goal => goal.plan?.some(step => step.id === (task.originalId ?? task.id)))?.id ?? inherited
}
export function linkedStepRows(goal: GoalItem, stepId: string, rows: ArchiveRow[]) {
  return rows.filter(row => (row.task.goalId === goal.id && row.task.goalStepId === stepId)
    || (!row.task.goalStepId && row.task.id === stepId && (!row.task.goalId || row.task.goalId === goal.id)))
}
export function projectUnits(rows: ArchiveRow[], goalId: string) {
  return rows.filter(row => row.goalId === goalId && row.parentGoalId !== goalId)
}
export function projectProgress(goal: GoalItem, rows: ArchiveRow[]) {
  const steps = (goal.plan ?? []).map(step => {
    const work = linkedStepRows(goal, step.id, rows)
    return { step, work, done: work.length > 0 && work.every(row => row.task.status === 'done') }
  })
  return { steps, completed: steps.filter(step => step.done).length, total: steps.length }
}
export function projectFingerprint(goal: GoalItem, dates: ExtractedTaskDate[]) {
  return JSON.stringify([goal, [...dates].sort((a,b) => a.date.localeCompare(b.date)).map(day => [day.date, day.tasks])])
}
export function validateProjectWindow(window: ProjectWindow) {
  const span = differenceInCalendarDays(parseISO(window.until), parseISO(window.from))
  if (!validProjectDate(window.from) || !validProjectDate(window.until) || span < 0 || span > 90
    || !Number.isInteger(window.minutesPerDay) || window.minutesPerDay < 15 || window.minutesPerDay > 480) {
    throw new Error('Choose a range of up to 90 days and 15–480 minutes per day.')
  }
}
export function validateProjectActions(actions: ProjectAction[], goal: GoalItem, rows: ArchiveRow[], window?: ProjectWindow) {
  if (goal.done) throw new Error('Reopen this project before changing its plan.')
  if (!validId(goal.id)) throw new Error('Create a new project before linking this older goal.')
  if (window) validateProjectWindow(window)
  if (!actions.length || actions.length > (window ? 30 : 200)) throw new Error(window ? 'Keep between 1 and 30 tasks in the proposal.' : 'Select up to 200 project steps.')
  const ids = new Set<string>(), texts = new Set<string>(), totals = new Map<string,number>()
  const linkedText = new Set(projectUnits(rows, goal.id).map(row => row.task.text.trim().toLowerCase()))
  for (const action of actions) {
    const id = action.stepId ?? action.id, text = action.text.trim(), normalized = text.toLowerCase()
    if (!validId(id) || !text || text.length > 5000 || !validProjectDate(action.date)) throw new Error('Each task needs valid text, identity and date.')
    if (ids.has(id) || texts.has(normalized) || linkedText.has(normalized)) throw new Error('This work is duplicated or already belongs to the project. Open its daily task instead.')
    ids.add(id); texts.add(normalized)
    if (rows.some(row => row.task.id === id) || linkedStepRows(goal,id,rows).length) throw new Error('A selected step is already scheduled. Refresh the project.')
    if (action.stepId && !goal.plan?.some(step => step.id === action.stepId)) throw new Error('A step changed. Generate a fresh proposal.')
    if (!action.stepId && goal.plan?.some(step => step.id === id || step.text.trim().toLowerCase() === normalized)) throw new Error('Use the existing project step instead of duplicating it.')
    if (window) {
      if (action.date < window.from || action.date > window.until || window.weekdaysOnly && [0,6].includes(parseISO(action.date).getDay())) throw new Error('Choose a permitted date inside the plan range.')
      if (!Number.isInteger(action.minutes) || action.minutes < 5 || action.minutes > window.minutesPerDay) throw new Error('Choose estimates within the daily budget.')
      const total = (totals.get(action.date) ?? 0) + action.minutes
      if (total > window.minutesPerDay) throw new Error(`The project budget is exceeded on ${action.date}.`)
      totals.set(action.date,total)
    }
  }
  if ((goal.plan?.length ?? 0) + actions.filter(action => !action.stepId).length > 200) throw new Error('A project can contain up to 200 steps.')
}
export function parseProjectActions(raw: unknown): ProjectAction[] {
  const list = (raw as { actions?: unknown })?.actions
  if (!Array.isArray(list) || !list.length || list.length > 30) throw new Error('The provider returned no usable proposal.')
  return list.map(item => {
    if (!item || typeof item.text !== 'string' || typeof item.date !== 'string' || typeof item.minutes !== 'number'
      || item.stepId != null && typeof item.stepId !== 'string') throw new Error('The provider returned an incomplete task.')
    return { id: newProjectId(), ...(item.stepId ? { stepId:item.stepId } : {}), text:item.text, date:item.date, minutes:item.minutes }
  })
}
export function scheduledOperation(folder: string, goal: GoalItem, dates: ExtractedTaskDate[], actions: ProjectAction[]): ProjectOperation {
  const plan = (goal.plan ?? []).map(step => ({...step}))
  const days = new Map<string,DayChange>()
  for (const action of actions) {
    const id = action.stepId ?? action.id
    const existing = plan.find(step => step.id === id)
    if (existing) existing.text = action.text.trim(); else plan.push({id,text:action.text.trim()})
    if (!days.has(action.date)) { const before = dates.find(day => day.date === action.date)?.tasks ?? []; days.set(action.date,{ date:action.date,before,after:[...before] }) }
    days.get(action.date)!.after.push({id,text:action.text.trim(),goalId:goal.id,goalStepId:id,status:'todo',subtasks:[]})
  }
  return {folder,before:goal,after:{...goal,plan},days:[...days.values()]}
}
export function removeStepOperation(folder: string, goal: GoalItem, dates: ExtractedTaskDate[], stepId: string): ProjectOperation {
  const detach = (task: Task): Task => {
    const matches = task.goalId === goal.id && task.goalStepId === stepId || !task.goalStepId && task.id === stepId && (!task.goalId || task.goalId === goal.id)
    return {...task,...(matches ? {goalId:goal.id,goalStepId:undefined}:{}),subtasks:task.subtasks.map(detach)}
  }
  return {folder,before:goal,after:{...goal,plan:goal.plan?.filter(step=>step.id!==stepId)},days:dates.map(day=>({date:day.date,before:day.tasks,after:day.tasks.map(detach)})).filter(day=>JSON.stringify(day.before)!==JSON.stringify(day.after))}
}
export function assignTaskProject(task: Task, goalId: string | undefined, previous: string | undefined): Task {
  const visit = (item: Task, root = false): Task => !root && item.goalId && item.goalId !== previous ? item
    : {...item,goalId,goalStepId:undefined,subtasks:item.subtasks.map(child=>visit(child))}
  return visit(task,true)
}
export function validateGoalPlan(plan: GoalPlanStep[]) {
  if (plan.length > 200 || new Set(plan.map(step=>step.id)).size !== plan.length || plan.some(step=>!validId(step.id)||!step.text.trim()||step.text.length>5000)) throw new Error('Keep up to 200 distinct steps, each with 1–5,000 characters.')
}


export function reviseProjectTask(folder: string, goal: GoalItem, dates: ExtractedTaskDate[], original: ArchiveRow, text: string, toDate = original.date): ProjectOperation {
  const value=text.trim()
  if(!validProjectDate(toDate))throw new Error('Choose a valid work date.')
  if(!value||value.length>5000) throw new Error('Task text must contain 1–5,000 characters.')
  const day=dates.find(day=>day.date===original.date)
  if(!day)throw new Error('This task moved or was removed. Refresh the project.')
  let found=false
  const update=(task:Task):Task=>{
    if(task.id===original.task.id){
      if(canonical(task)!==canonical(original.task))throw new Error('This task changed while you were editing. Cancel and reopen it to see the latest version.')
      found=true;return {...task,text:value}
    }
    return {...task,subtasks:task.subtasks.map(update)}
  }
  const after=day.tasks.map(update)
  if(!found)throw new Error('This task moved or was removed. Refresh the project.')
  if(toDate===original.date)return {folder,before:goal,after:goal,days:[{date:day.date,before:day.tasks,after}]}
  if(original.parents.length)throw new Error('Move this step through its parent task.')
  const moved=after.find(task=>task.id===original.task.id)!
  const destination=dates.find(day=>day.date===toDate)?.tasks??[]
  const ids=new Set<string>()
  const collect=(task:Task)=>{ids.add(task.id);task.subtasks.forEach(collect)}
  collect(moved)
  const collides=(task:Task):boolean=>ids.has(task.id)||task.subtasks.some(collides)
  if(destination.some(collides))throw new Error('This task already exists on that date. Refresh before moving it.')
  return {folder,before:goal,after:goal,days:[
    {date:toDate,before:destination,after:[...destination,moved]},
    {date:day.date,before:day.tasks,after:day.tasks.filter(task=>task.id!==original.task.id)},
  ]}
}
