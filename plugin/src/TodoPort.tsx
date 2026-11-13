import { ListTodo, CalendarRange, Music2, Search, ChartNoAxesCombined } from 'lucide-react';
import {useEffect,useMemo,useRef,useState} from 'react';
import {parseISO} from 'date-fns';
import {usePluginScope,subscribeToPluginChanges} from '@diane/plugin-sdk/records';
import {pluginApi,pluginScope} from '@diane/plugin-sdk/client';
import {useManagedPluginHost} from '@diane/plugin-sdk/host-context';
import type {SidePanelProps} from '@diane/plugin-sdk/panel-context';
import {TaskEditorContext, type TodoTaskEditorProps} from './TaskEditor';
import type {ComponentType} from 'react';
import {TodoPortContext} from './TodoPortContext';
import {createTodoApi,suggestionSource} from './api';
import {StepProposalContext} from './TaskStepProposal';
import {proposedSteps,type StepProposal} from './stepProposal';
import {TaskWorkflowContext} from './TaskWorkflowStatus';
import {useTaskWorkflowStatuses} from './hooks/useTaskWorkflowStatuses';
import {useTasks} from './hooks/useTasks';
import {useTaskPreparation} from './hooks/useTaskPreparation';
import {useCalendar} from './hooks/useCalendar';
import {useGoals} from './hooks/useGoals';
import {TaskList} from './components/TaskList';
import {DateHeader} from './components/DateHeader';
import {AddTask} from './components/AddTask';
import {GoalsSidebar} from './components/GoalsSidebar';
import {ArchivePage} from './components/ArchivePage';
import {ProjectPage} from './components/ProjectPage';
import {ScheduleView} from './components/ScheduleView';
import {AlbumRecommendations} from './components/AlbumRecommendations';
import {planningTaskKey,type PlannedBlock} from './taskPlanning';
import type {ArchiveRow} from './taskArchive';
import type {AlbumRecommendationResult,Task,FinishPromise} from './types';
import {formatAgentPrompt} from './taskTransfer';
import {BackupTools} from './BackupTools';
import {PlanningSettings,type PlanningPreferences} from './PlanningSettings';
import {storageForAccount} from './storage';
import './styles/sticky.css';
import './port.css';
import './paneLayout.css';
import './styles/task-execution.css';

export type Props=Pick<SidePanelProps,'active'>&Partial<Pick<SidePanelProps,'context'>>&{taskEditor?:ComponentType<TodoTaskEditorProps>};
export default function TodoPort(props:Props){const scope=usePluginScope();return scope?<TaskEditorContext.Provider value={props.taskEditor}><TodoBody key={scope} {...props} scope={scope}/></TaskEditorContext.Provider>:<p role="status">Connecting Todo…</p>;}
function TodoBody({active,scope}:Props&{scope:string}){
 const api=useMemo(()=>createTodoApi(scope),[scope]);
 const [preferences,setPreferences]=useState<PlanningPreferences>({revision:0,machines:[],planningPreferences:{}});
 useEffect(()=>{let disposed=false;void api.preferences().then(value=>{if(!disposed){setPreferences(value);if(Object.keys(value.planningPreferences).length)storageForAccount(scope).setItem('todo-sticky-planning-preferences-v1',JSON.stringify(value.planningPreferences));}}).catch(()=>{});return()=>{disposed=true;};},[api,scope]);
 const calendar=useCalendar(),tasks=useTasks(calendar.dateStr,calendar.isCurrentDay),goals=useGoals(scope),host=useManagedPluginHost();
 const [page,setPage]=useState<'tasks'|'search'|'progress'>('tasks'),[project,setProject]=useState<string|null>(null),[planning,setPlanning]=useState(false),[albums,setAlbums]=useState<AlbumRecommendationResult|null>(null),[showAlbums,setShowAlbums]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[enabled,setEnabled]=useState(true);
 const [selection,setSelection]=useState<{recordId:string;requestId?:number|string}>();
 const [stepProposal,setStepProposal]=useState<StepProposal|null>(null),[applyingSteps,setApplyingSteps]=useState(false);
 const currentTasks=useRef(tasks.tasks);currentTasks.current=tasks.tasks;
 const workflowStatuses=useTaskWorkflowStatuses(scope,tasks.tasks,active&&enabled&&page==='tasks'&&!project);
 const leaveGuard=useRef<()=>boolean>(()=>true),writing=useRef(false),alive=useRef(true),op=useRef(false);
 const selectionToken=host?.selection;
 useEffect(()=>{alive.current=true;void pluginApi.settings('todo',undefined,scope).then(s=>{if(alive.current&&pluginScope()===scope)setEnabled(s.enabled);}).catch(e=>{if(alive.current)setError(String(e));});return()=>{alive.current=false;};},[scope]);
 const perform=async(work:()=>Promise<unknown>)=>{if(op.current)return;op.current=true;setError('');try{await work();}catch(e){if(alive.current)setError(e instanceof Error?e.message:String(e));}finally{op.current=false;}};
 const navigate=async(change:()=>void)=>{if(!leaveGuard.current()||writing.current)return;await tasks.flushPendingSave();change();};
 useEffect(()=>{if(!selectionToken||selectionToken.pluginId!=='todo'||!selectionToken.recordId||!leaveGuard.current()||writing.current)return;let cancelled=false;
  void tasks.flushPendingSave().then(()=>api.taskRecord(selectionToken.recordId!)).then(record=>{if(cancelled||pluginScope()!==scope||!leaveGuard.current()||writing.current)return;setProject(null);setPage('tasks');goals.setSidebarCollapsed(true);if(typeof record.extensions.date==='string')calendar.goToDate(parseISO(record.extensions.date));else calendar.goToday();setSelection({recordId:record.record_id,requestId:selectionToken.requestId});void tasks.load();}).catch(e=>{if(!cancelled)setError(String(e));});return()=>{cancelled=true;};
 },[selectionToken,scope]);
 useEffect(()=>subscribeToPluginChanges('todo',()=>void goals.reload(),scope),[goals.reload,scope]);
 // Recurrence is an already-selected schedule, not authorization to run an agent.
 useEffect(()=>{if(!active||!enabled||goals.pending||goals.busy)return;let cancelled=false;const due=goals.records.filter(r=>r.record_type==='routine'&&(r.extensions.schedule as any)?.frequency!=='manual'&&(r.extensions.schedule as any)?.frequency);
  if(!due.length)return;const tick=()=>{if(cancelled||document.hidden||pluginScope()!==scope)return;void pluginApi.todoAction({request_id:crypto.randomUUID(),action:'routines',date:calendar.todayStr,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,routine_ids:due.map(r=>r.record_id),expected_revisions:Object.fromEntries(due.map(r=>[r.record_id,r.revision]))},scope).then(()=>{if(!cancelled){void tasks.load();void goals.reload();}}).catch(e=>{if(!cancelled)setError(String(e));});};
  tick();const timer=setInterval(tick,60000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};
 },[active,enabled,goals.pending,goals.busy,scope,calendar.todayStr,JSON.stringify(goals.records.map(r=>[r.record_id,r.revision]))]);
 const openArchive=async(row:ArchiveRow)=>{await navigate(()=>{setProject(null);setPage('tasks');calendar.goToDate(parseISO(row.date));setSelection({recordId:row.task.id,requestId:Date.now()});});};
 const openProject=(id:string)=>{void perform(()=>navigate(()=>{setProject(id);setPage('tasks');goals.setSidebarCollapsed(true);}));};
 const breakdown=async(id:string)=>{if(op.current)return;const task=currentTasks.current.find(t=>t.id===id);if(!task)return;const key=planningTaskKey([task]),day=calendar.dateStr;await perform(async()=>{setBusy(id);try{await tasks.flushPendingSave();const record=await api.taskRecord(task.originalId??task.id);if((record.text||record.title)!==task.text)throw Error('The task changed. Refresh before requesting suggestions.');const result=await api.llmBreakdown({taskText:[task.text,task.finish?.doneWhen&&`Done when: ${task.finish.doneWhen}`,task.finish?.by&&`Due: ${task.finish.by}`].filter(Boolean).join('\n'),existingSubtasks:task.todaySubtasks.map(t=>t.text)},[suggestionSource(record)]);const steps=proposedSteps(result.subtasks,task.todaySubtasks.map(t=>t.text));if(alive.current){if(!steps.length)throw Error('No additional steps were suggested. Your task is unchanged.');setStepProposal({taskId:id,date:day,taskKey:key,title:task.text,steps});}}finally{if(alive.current)setBusy('');}});};
 const proposalTask=stepProposal&&tasks.tasks.find(task=>task.id===stepProposal.taskId);
 const proposalStale=Boolean(stepProposal&&(!proposalTask||calendar.dateStr!==stepProposal.date||planningTaskKey([proposalTask])!==stepProposal.taskKey));
 const applySteps=()=>void perform(async()=>{if(!stepProposal)return;setApplyingSteps(true);try{tasks.addAISubtasks(stepProposal.taskId,stepProposal.steps.map(text=>({text})),stepProposal.date,stepProposal.taskKey);setStepProposal(null);await tasks.flushPendingSave();}finally{if(alive.current)setApplyingSteps(false);}});
 const recommend=async()=>{setShowAlbums(true);await perform(async()=>{setBusy('albums');try{const value=await api.llmRecommendAlbums({tasks:tasks.tasks.filter(t=>!['done','stopped'].includes(t.status)).map(t=>({text:t.text,finish:t.finish,steps:t.todaySubtasks.map(s=>s.text)}))});if(alive.current)setAlbums(value);}finally{if(alive.current)setBusy('');}});};
 useTaskPreparation({active,enabled,loading:tasks.loading,scope,taskKey:planningTaskKey(tasks.tasks),flush:tasks.flushPendingSave});
 const handoff=useMemo(()=>({scope,active,enabled,flush:tasks.flushPendingSave,selection,taskKey:planningTaskKey(tasks.tasks)}),[scope,active,enabled,tasks.flushPendingSave,selection,tasks.tasks]);
 return <TodoPortContext.Provider value={handoff}><StepProposalContext.Provider value={{proposal:stepProposal,stale:proposalStale,busy:applyingSteps,edit:(index,text)=>setStepProposal(value=>value?{...value,steps:value.steps.map((step,i)=>i===index?text:step)}:null),remove:index=>setStepProposal(value=>value?{...value,steps:value.steps.filter((_,i)=>i!==index)}:null),apply:applySteps,dismiss:()=>setStepProposal(null)}}><TaskWorkflowContext.Provider value={workflowStatuses}><div className="diane-todo-port" aria-label="Todo plugin"><div className="app-shell is-compact">
  <GoalsSidebar saving={goals.busy||goals.pending||!enabled} onDiscardDraft={()=>void goals.discardPending().catch(e=>setError(String(e)))} collapsed={goals.sidebarCollapsed} targets={goals.targets} recurring={goals.recurring} routines={goals.routines} storageError={goals.storageError} onRetrySave={goals.retrySave} onToggleCollapse={goals.toggleSidebar} onAddGoal={goals.addGoal} onUpdateGoal={goals.updateGoal} onDeleteGoal={goals.deleteGoal} onToggleGoal={goals.toggleGoal} onOpenProject={openProject}/>
  {!goals.sidebarCollapsed&&<button className="sidebar-backdrop" aria-label="Close goals" onClick={()=>goals.setSidebarCollapsed(true)}/>}
  <div className="sticky-container">
   {!enabled&&<p role="status">Todo is disabled. Saved work remains available.</p>}
   {error&&<p className="todo-port-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error">×</button></p>}
   {tasks.saveError&&<p className="todo-port-error" role="alert">Changes not saved. Your edits stay here.<button onClick={()=>void tasks.retrySave()}>Retry save</button></p>}
   {workflowStatuses.unavailable&&<p className="todo-port-status" role="status">Diane status unavailable. Reconnecting…</p>}
   {project?<ProjectPage key={project} goalId={project} goals={goals.targets} folder={scope} flush={tasks.flushPendingSave} getGoal={goals.currentProject} saveGoal={goals.saveProject} reloadTasks={tasks.load} onBack={()=>setProject(null)} onOpen={openArchive} onWriting={value=>{writing.current=value;}} registerLeaveGuard={guard=>{leaveGuard.current=guard??(()=>true);}}/>:page!=='tasks'?<ArchivePage goals={goals.targets} folder={scope} mode={page} date={calendar.dateStr} flush={tasks.flushPendingSave} onBack={()=>setPage('tasks')} onOpen={openArchive}/>:<>
    <DateHeader displayDate={calendar.displayDate} selectedDate={calendar.selectedDate} calendarOpen={calendar.calendarOpen} isCurrentDay={calendar.isCurrentDay} onPrev={()=>void perform(()=>navigate(calendar.goPrev))} onNext={()=>void perform(()=>navigate(calendar.goNext))} onToggleCalendar={calendar.toggleCalendar} onSelectDate={date=>void perform(()=>navigate(()=>calendar.goToDate(date)))} onToday={()=>void perform(()=>navigate(calendar.goToday))} onCloseCalendar={()=>calendar.setCalendarOpen(false)}/>
    <AddTask onAdd={text=>{if(enabled)tasks.addTask(text);}} disabled={!enabled||tasks.loading}/>
    <fieldset className="todo-task-guard" disabled={!enabled}><TaskList projects={goals.targets} onOpenProject={openProject} onAssignProject={tasks.assignProject} tasks={tasks.tasks} loading={tasks.loading} loadError={tasks.loadError} rolloverError={tasks.rolloverError} rolloverLoading={tasks.rolloverLoading} isCurrentDay={calendar.isCurrentDay} moveTargetLabel={tasks.carryForwardTarget.actionLabel} onToggle={tasks.toggleStatus} onDelete={tasks.deleteTask} onPush={(id,step)=>void perform(()=>tasks.carryForward(id,step))} onCopyTask={(text:string,steps:Task[],finish?:FinishPromise)=>void navigator.clipboard.writeText(formatAgentPrompt({text,subtasks:steps.map(step=>step.text),finish})).catch(e=>setError(String(e)))} onTextChange={tasks.updateTaskText} onUpdateFinish={tasks.updateFinish} onReview={tasks.reviewTask} onAddSubtask={tasks.addSubtask} onAddTask={tasks.addTask} onMoveToToday={tasks.moveToToday} onReorderTask={tasks.reorderTasks} onReorderSubtask={tasks.reorderSubtasks} onAIBreakdown={breakdown} onGoToday={()=>void perform(()=>navigate(calendar.goToday))} onRetryLoad={tasks.load}/></fieldset>
   </>}
   {tasks.undo&&<div className="task-undo-notice" role="status"><span>{tasks.undo.label}</span><button disabled={tasks.loading} onClick={tasks.undoLastAction}>Undo</button><button onClick={tasks.dismissUndo} aria-label="Dismiss undo">×</button></div>}
   <div className="action-bar"><button onClick={goals.toggleSidebar} aria-expanded={!goals.sidebarCollapsed} aria-label="Goals & routines" title="Goals & routines"><ListTodo size={16} aria-hidden="true" /></button><button disabled={!!busy||!enabled||tasks.loading||!tasks.tasks.length} onClick={()=>setPlanning(true)} aria-label="Plan day" title="Plan day"><CalendarRange size={16} aria-hidden="true" /></button><button disabled={!!busy||!tasks.tasks.length} onClick={()=>void recommend()} aria-label="Albums" title="Albums"><Music2 size={16} aria-hidden="true" /></button><button onClick={()=>void perform(()=>navigate(()=>{setProject(null);setPage('search');}))} aria-label="Search" title="Search"><Search size={16} aria-hidden="true" /></button><button onClick={()=>void perform(()=>navigate(()=>{setProject(null);setPage('progress');}))} aria-label="Progress" title="Progress"><ChartNoAxesCombined size={16} aria-hidden="true" /></button></div>
   {showAlbums&&<AlbumRecommendations result={albums} loading={busy==='albums'} providerLabel="Diane" onClose={()=>setShowAlbums(false)} onRegenerate={()=>void recommend()}/>}
   {planning&&<ScheduleView date={calendar.dateStr} tasks={tasks.tasks} tasksLoading={tasks.loading} machines={preferences.machines} onApply={(blocks:PlannedBlock[],day,key)=>{tasks.applySchedule(blocks,day,key);setPlanning(false);}} onClose={()=>setPlanning(false)}/>}
   <div className="todo-port-data"><BackupTools scope={scope} flush={tasks.flushPendingSave} onChanged={async()=>{await tasks.load();await goals.reload();}} onOpenProject={openProject} onPreferences={value=>{setPreferences(value);storageForAccount(scope).setItem('todo-sticky-planning-preferences-v1',JSON.stringify(value.planningPreferences));}}/><PlanningSettings scope={scope} value={preferences} onSaved={setPreferences}/></div>
  </div>
 </div></div></TaskWorkflowContext.Provider></StepProposalContext.Provider></TodoPortContext.Provider>;
}
