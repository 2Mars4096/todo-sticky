/** Original GoalsSidebar/ProjectPage contract, with acknowledged scoped writes. */
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createTodoApi} from '../api';
import {fields,newId,pluginApi,pluginScope,type PluginRecord} from '@diane/plugin-sdk/client';
import {recordsChanged} from '@diane/plugin-sdk/records';
import {canonical} from '../cloudSync';
import {validateGoalPlan} from '../projectPlanning';
import {storageForAccount} from '../storage';
import type {GoalCategory,GoalItem} from '../types';
import type {Cadence,RoutineSchedules} from '../routines';
const DRAFT='pending-goal-write';
interface Pending {operation:'put'|'remove';record:PluginRecord;before?:PluginRecord;requestId:string}
const goal=(r:PluginRecord):GoalItem=>({id:r.record_id,text:r.text||r.title,done:r.extensions.done===true,plan:Array.isArray(r.extensions.plan)?r.extensions.plan as GoalItem['plan']:[]});
const applyDraft=(records:PluginRecord[],draft:Pending)=>draft.operation==='remove'?records.filter(r=>r.record_id!==draft.record.record_id):[...records.filter(r=>r.record_id!==draft.record.record_id),draft.record];
export function useGoals(scope:string){
 const api=useMemo(()=>createTodoApi(scope),[scope]),storage=useMemo(()=>storageForAccount(scope),[scope]);
 const [records,setRecords]=useState<PluginRecord[]>([]),latest=useRef(records);latest.current=records;
 const [storageError,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[collapsed,setCollapsed]=useState(true),[pending,setPending]=useState(false);
 const alive=useRef(true),lock=useRef<Promise<void>|null>(null),draft=useRef<Pending|null>(null);
 const publish=(rows:PluginRecord[])=>{latest.current=rows;if(alive.current)setRecords(rows);};
 const reload=useCallback(async()=>{
  const result=await api.goalRecords();if(!alive.current||pluginScope()!==scope)return;
  const rows=result.items.map(r=>({...r,_scope:scope}));publish(draft.current?applyDraft(rows,draft.current):rows);
  if(!draft.current)setError(null);
 },[api,scope]);
 useEffect(()=>{alive.current=true;try{
   setCollapsed(storage.getItem('goals-collapsed')!=='false');
   const value=JSON.parse(storage.getItem(DRAFT)||'null') as Pending|null;
   if(value){if(!['put','remove'].includes(value.operation)||value.record?._scope!==scope||!value.requestId)throw Error('Saved goal draft needs recovery. Its original data is retained.');draft.current=value;setPending(true);setError('An unsaved goal change is retained. Retry save to finish it.');}
  }catch(e){setError(String(e));}
  void reload().catch(e=>{if(alive.current)setError(String(e));});return()=>{alive.current=false;};
 },[reload,scope,storage]);
 const retrySave=useCallback(async()=>{
  if(lock.current)return lock.current;
  const saved=draft.current;if(!saved){await reload();return;}
  if(pluginScope()!==scope)throw Error('The Diane account changed. Reopen Todo before retrying.');
  setBusy(true);setError(null);
  const operation=(async()=>{try{
   if(saved.operation==='remove')await pluginApi.remove(saved.record,saved.requestId);
   else await pluginApi.put('todo',saved.record.record_type,saved.record.record_id,fields(saved.record),saved.record.revision,saved.requestId,scope);
   if(pluginScope()!==scope)return;
   if(draft.current===saved){storage.removeItem(DRAFT);draft.current=null;if(alive.current)setPending(false);}
   await reload();recordsChanged('todo',scope);
  }catch(e){if(alive.current)setError((e instanceof Error?e.message:String(e))+' Your change is retained.');throw e;}
  finally{lock.current=null;if(alive.current)setBusy(false);}})();lock.current=operation;return operation;
 },[reload,scope,storage]);
 function queue(operation:Pending['operation'],record:PluginRecord):boolean{
  if(draft.current||lock.current){setError('Finish the pending goal save before making another change.');return false;}
  const pendingWrite:Pending={operation,record:{...record,_scope:scope},before:latest.current.find(item=>item.record_id===record.record_id),requestId:newId()};
  try{storage.setItem(DRAFT,JSON.stringify(pendingWrite));}catch{setError('The goal draft could not be retained. Keep this edit open and free local storage.');return false;}
  draft.current=pendingWrite;setPending(true);publish(applyDraft(latest.current,pendingWrite));void retrySave().catch(()=>{});return true;
 }
 function change(category:GoalCategory,id:string,update:(r:PluginRecord)=>Partial<PluginRecord>){const record=latest.current.find(r=>r.record_id===id&&r.record_type===(category==='targets'?'goal':'routine'));if(!record){setError('This goal was removed.');return false;}return queue('put',{...record,...update(record)});}
 const schedule=(id:string,patch:Record<string,unknown>)=>change('recurring',id,r=>({extensions:{...r.extensions,schedule:{...(r.extensions.schedule as object||{}),...patch}}}));
 const schedules:RoutineSchedules=Object.create(null);
 for(const r of records.filter(r=>r.record_type==='routine')){const s=r.extensions.schedule as {frequency:Cadence;anchor?:string;paused?:boolean;handled_through?:string}|undefined;if(s)schedules[r.record_id]={cadence:s.frequency,anchor:s.anchor||new Date().toLocaleDateString('en-CA'),paused:!!s.paused,handledThrough:s.handled_through};}
 const setSidebarCollapsed=(value:boolean)=>{setCollapsed(value);try{storage.setItem('goals-collapsed',String(value));}catch{}};
 return {busy,pending,records,reload,storageError,recoveryNotice:null,retrySave:()=>void retrySave().catch(()=>{}),sidebarCollapsed:collapsed,setSidebarCollapsed,toggleSidebar:()=>setSidebarCollapsed(!collapsed),
  discardPending:async()=>{if(lock.current)return;storage.removeItem(DRAFT);draft.current=null;setPending(false);await reload();},
  targets:records.filter(r=>r.record_type==='goal').map(goal),recurring:records.filter(r=>r.record_type==='routine').map(goal),
  addGoal:(category:GoalCategory,text:string)=>{if(!text.trim())return false;const stamp=new Date().toISOString();return queue('put',{...fields({title:text.slice(0,200),text,status:'todo',extensions:{done:false,plan:[]}}),plugin_id:'todo',record_type:category==='targets'?'goal':'routine',record_id:newId(),revision:0,created_at:stamp,updated_at:stamp,_scope:scope});},
  updateGoal:(category:GoalCategory,id:string,text:string)=>change(category,id,()=>({title:text.slice(0,200),text})),
  deleteGoal:(_category:GoalCategory,id:string)=>{const record=latest.current.find(r=>r.record_id===id);return record?queue('remove',record):false;},
  toggleGoal:(category:GoalCategory,id:string)=>change(category,id,r=>({extensions:{...r.extensions,done:!r.extensions.done}})),
  currentProject:(id:string)=>{const r=draft.current?.record.record_id===id?draft.current.before:latest.current.find(r=>r.record_id===id&&r.record_type==='goal');return r?goal(r):undefined;},
  saveProject:async(before:GoalItem,after:GoalItem)=>{
   if(draft.current)await retrySave();
   const record=latest.current.find(r=>r.record_id===before.id&&r.record_type==='goal');
   if(record&&canonical(goal(record))===canonical(after))return;
   if(!record||canonical(goal(record))!==canonical(before))throw Error('The project changed. Refresh before saving.');
   validateGoalPlan(after.plan??[]);
   if(!queue('put',{...record,title:after.text.slice(0,200),text:after.text,extensions:{...record.extensions,done:after.done,plan:after.plan??[]}}))throw Error('The goal draft could not be saved.');
   await retrySave();
  },
  routines:{schedules,error:storageError||'',available:!busy&&!pending,configure:(id:string,cadence:Cadence)=>{const now=new Date();schedule(id,{frequency:cadence,anchor:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,days:cadence==='weekly'?[now.getDay()]:[],paused:false});},pause:(id:string)=>schedule(id,{paused:!schedules[id]?.paused}),skip:(id:string)=>schedule(id,{skip_next:true}),retry:()=>void retrySave().catch(()=>{})},
 };
}
