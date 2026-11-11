/** Source API adapted from Todo Sticky. Hosted records replace Tauri/file I/O. */
import { requestJson } from '@diane/plugin-sdk/http';
import { connectionScope, pluginScope, pluginApi, type PluginRecord, type Workflow } from '@diane/plugin-sdk/client';
import { subscribeToPluginChanges, PLUGIN_RECORD_CHANGE_KEY } from '@diane/plugin-sdk/records';
import { canonical } from './cloudSync';
import type { PlanningPreferences } from './PlanningSettings';
import type { AggregatedTask, Task, ExtractedTaskDate, TaskMutationResult, AppSettings, AlbumRecommendationResult } from './types';
const pendingWrites = new Set<Promise<unknown>>();
const attempts = new Map<string,string>();
export type SuggestionSource = Pick<PluginRecord, 'record_type' | 'record_id' | 'revision'>;
export const suggestionSource = (record: PluginRecord): SuggestionSource => ({record_type: record.record_type, record_id: record.record_id, revision: record.revision});
function persist<T>(request:Promise<T>) { pendingWrites.add(request); void request.then(()=>pendingWrites.delete(request),()=>pendingWrites.delete(request)); return request; }
export async function waitForPendingWrites(){while(pendingWrites.size)await Promise.all([...pendingWrites]);}
export async function compat<T>(command:string,payload:unknown={},scope=pluginScope()):Promise<T>{
  const actual=await connectionScope();
  if(scope && actual!==scope)throw Error('The Diane account changed. Reopen Todo before continuing.');
  const now=new Date(),local_today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const scopedPayload={...(payload as Record<string,unknown>),local_today};
  const signature=JSON.stringify([actual,command,scopedPayload]);
  const requestId=attempts.get(signature)??crypto.randomUUID(); attempts.set(signature,requestId);
  const value=await requestJson<T>(`/api/plugins/todo/compat/${command}`,{method:'POST',headers:{'X-Diane-Plugin-Scope':actual},body:JSON.stringify({request_id:requestId,payload:scopedPayload}),timeoutMs:command==='ai'?390000:120000});
  if(pluginScope()!==actual)throw Error('The Diane account changed. Reopen Todo before continuing.');
  attempts.delete(signature);return value;
}
export function createTodoApi(scope: string) {
async function taskSources(tasks: AggregatedTask[]): Promise<SuggestionSource[]> {
 const sources = await Promise.all(tasks.slice(0,40).map(async task => {
  const record=await compat<PluginRecord>('record',{id:task.originalId??task.id},scope);
  if((record.text||record.title)!==task.text)throw Error('A task changed. Refresh before planning.');
  return suggestionSource(record);
 }));
 return sources.filter((source,index)=>sources.findIndex(item=>item.record_id===source.record_id)===index);
}
async function extract(request: {date?:string;fromDate?:string;toDate?:string;all?:boolean;skipUnavailable?:boolean;canonicalDates?:boolean}){
 const result=await compat<{dates:ExtractedTaskDate[];unavailableFiles?:string[]}>('extract',request,scope);
 return result;
}
async function saveDay(date:string,tasks:Task[],expectedRevision:string){
 // The caller must supply the revision belonging to the edited snapshot. A
 // passive read must never silently authorize replacement of a newer day.
 if(typeof expectedRevision!=='string'||!expectedRevision)throw Error('Reload this day before saving; its edit revision is unavailable.');
 const result=await compat<ExtractedTaskDate&{ok:boolean}>('save_day',{dateStr:date,tasks,expectedRevision},scope);
 try { localStorage.setItem(PLUGIN_RECORD_CHANGE_KEY,JSON.stringify({plugin:'todo',scope,nonce:crypto.randomUUID()})); } catch { /* Focus/refresh can reconcile another window. */ }
 return result;
}
function find(tasks:Task[],id:string):Task|undefined { for(const task of tasks){if(task.id===id)return task;const child=find(task.subtasks,id);if(child)return child;} }
function remove(tasks:Task[],id:string):Task[]{return tasks.filter(task=>task.id!==id).map(task=>({...task,subtasks:remove(task.subtasks,id)}));}
async function mutation(action:'create'|'update'|'delete',request:any):Promise<TaskMutationResult>{
 const day=(await extract({date:request.date})).dates[0];
 if(request.expectedRevision && request.expectedRevision!==day.revision)throw Error('This day changed. Refresh before saving.');
 let task:Task;
 if(action==='create'){
  task={id:crypto.randomUUID(),text:request.text,status:request.status??'todo',subtasks:(request.subtasks??[]).map((s:Task)=>({...s,id:crypto.randomUUID(),status:s.status??'todo',subtasks:[]}))};
  if(request.parentId){const parent=find(day.tasks,request.parentId);if(!parent)throw Error('The parent task is unavailable');parent.subtasks.push(task);}else day.tasks.push(task);
 }else{const current=find(day.tasks,request.id);if(!current)throw Error('Task not found');task=current;if(action==='delete')day.tasks=remove(day.tasks,request.id);else Object.assign(task,...['text','status'].filter(key=>request[key]!==undefined).map(key=>({[key]:request[key]})));}
 const saved=await saveDay(request.date,day.tasks,day.revision);return {...saved,ok:true,task};
}
return {
 extractTaskApi:extract,
 createTaskApi:(request:Parameters<typeof mutation>[1])=>persist(mutation('create',request)),
 updateTaskApi:(request:Parameters<typeof mutation>[1])=>persist(mutation('update',request)),
 deleteTaskApi:(request:Parameters<typeof mutation>[1])=>persist(mutation('delete',request)),
 async getTasks(dateStr:string){
  const day=await compat<{tasks:AggregatedTask[];filePath:string;weekStart:string;revision:string}>('get_tasks',{dateStr},scope);
  return day;
 },
 saveTasks:({dateStr,tasks,expectedRevision}:{filePath:string;dateStr:string;tasks:Task[];expectedRevision:string})=>persist(saveDay(dateStr,tasks,expectedRevision)),
 createDateSection:({dateStr,tasks,expectedRevision}:{dateStr:string;tasks:Task[];expectedRevision:string})=>persist(saveDay(dateStr,tasks,expectedRevision)),
 appendTasksToDate:async({dateStr,tasks}:{dateStr:string;tasks:Task[]})=>{const day=(await extract({date:dateStr})).dates[0];return persist(saveDay(dateStr,[...day.tasks,...tasks],day.revision));},
 async applyDay(date:string,tasks:Task[],expectedTasks:Task[]){const day=(await extract({date})).dates[0];if(canonical(day.tasks)!==canonical(expectedTasks))throw Error('Daily work changed. Refresh before applying.');return persist(saveDay(date,tasks,day.revision));},
 async pushTask(data:{fromDate:string;toDate:string;taskText:string;subtaskTexts:string[];parentTaskText?:string;taskSnapshot?:Task;parentSnapshot?:Task}){
  if(!data.taskSnapshot)throw Error('A saved task snapshot is required');
  const result=await persist(compat<ExtractedTaskDate&{ok:boolean}>('push_task',data,scope));
  return result;
 },
 listWeeklyFiles:async()=>(await extract({all:true})).dates.map(d=>d.filePath),
 llmBreakdown:(input:{taskText:string;existingSubtasks:string[];suggestFinish?:boolean},sources?:SuggestionSource[])=>compat<{finishSuggestion?:string;subtasks:{text:string;estimatedMinutes?:number;machineTask?:boolean}[]}>('ai',{action:'breakdown',input,...(sources?.length?{sources}:{}),intent_id:crypto.randomUUID()},scope),
 llmSchedule:async(input:{tasks:AggregatedTask[];machines:AppSettings['machines'];dateStr:string;availableStart:string;availableEnd:string})=>compat<unknown>('ai',{action:'schedule',input,sources:await taskSources(input.tasks),intent_id:crypto.randomUUID()},scope),
 llmProjectPlan:async(input:unknown)=>{
  const goal=(input as {goal?:{id:string;text:string;plan?:unknown[]}})?.goal;
  const records=await compat<{items:PluginRecord[]}>('goals',{},scope);
  const record=records.items.find(item=>item.record_type==='goal'&&item.record_id===goal?.id);
  if(!record||!goal||(record.text||record.title)!==goal.text||canonical(record.extensions.plan??[])!==canonical(goal.plan??[]))throw Error('The project changed. Refresh before planning.');
  return compat<unknown>('ai',{action:'project',input,sources:[suggestionSource(record)],intent_id:crypto.randomUUID()},scope);
 },
 async workflowStatuses(ids:string[],signal?:AbortSignal){
  const actual=await connectionScope();
  if(actual!==scope)throw Error('The Diane account changed. Reopen Todo before continuing.');
  const query=new URLSearchParams({task_ids:ids.join(',')});
  const result=await requestJson<{workflows:Record<string,Workflow|null>}>(`/api/plugins/todo/workflows?${query}`,{headers:{'X-Diane-Plugin-Scope':scope},signal,timeoutMs:20000});
  if(pluginScope()!==scope)throw Error('The Diane account changed. Reopen Todo before continuing.');
  if(!result||typeof result.workflows!=='object'||result.workflows===null)throw Error('Diane status is unavailable.');
  if(ids.some(id=>!Object.prototype.hasOwnProperty.call(result.workflows,id)))throw Error('Diane returned incomplete task status.');
  for(const [id,workflow] of Object.entries(result.workflows))if(!ids.includes(id)||workflow&&(workflow.task_id!==id||typeof workflow.state!=='string'))throw Error('Diane returned mismatched task status.');
  return result.workflows;
 },
 llmRecommendAlbums:(input:{tasks:unknown[]})=>compat<AlbumRecommendationResult>('ai',{action:'albums',input,intent_id:crypto.randomUUID()},scope),
 onFileChanged(cb:()=>void){return subscribeToPluginChanges('todo',cb,scope);},
 taskRecord:(id:string)=>compat<PluginRecord>('record',{id},scope),
 goalRecords:()=>compat<{items:PluginRecord[]}>('goals',{},scope),
 preferences:()=>compat<PlanningPreferences>('preferences',{},scope),
 savePreferences:(value:Omit<PlanningPreferences,'revision'>,expected_revision:number)=>compat<PlanningPreferences>('save_preferences',{value,expected_revision},scope),
 command:<T,>(name:string,payload:unknown={})=>compat<T>(name,payload,scope),
 configure:pluginApi.configure,
};

}
