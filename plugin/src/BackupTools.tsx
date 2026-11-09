import {useEffect,useMemo,useRef,useState} from 'react';
import {createTodoApi} from './api';
import {downloadFile,pluginApi,pluginScope} from '@diane/plugin-sdk/client';
import {storageForAccount} from './storage';
import {recordsChanged} from '@diane/plugin-sdk/records';
import {beginProjectOperation,pendingProject} from './projectStorage';
import type {ProjectOperation} from './projectPlanning';
import type {PlanningPreferences} from './PlanningSettings';
interface Recovery {original:unknown;operation:ProjectOperation}
interface Prepared {archive:{format:string;version:number;plugin_id:string;records:unknown[]};recoveries:Recovery[];preferences:Omit<PlanningPreferences,'revision'>|null;warnings:string[]}
export function BackupTools({scope,flush,onChanged,onOpenProject,onPreferences}:{scope:string;flush:()=>Promise<void>;onChanged:()=>Promise<void>;onOpenProject:(id:string)=>void;onPreferences:(value:PlanningPreferences)=>void}){
 const api=useMemo(()=>createTodoApi(scope),[scope]);const [prepared,setPrepared]=useState<Prepared>(),[recoveries,setRecoveries]=useState<Recovery[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const alive=useRef(true),requests=useRef<string[]>([]),finished=useRef(new Set<number>());
 const refresh=async()=>{const value=await api.command<{items:Recovery[]}>('recoveries');if(alive.current)setRecoveries(value.items);};
 useEffect(()=>{alive.current=true;void refresh().catch(e=>setError(String(e)));return()=>{alive.current=false;};},[api]);
 useEffect(()=>{const resolved=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.scope===scope)void api.command<{items:Recovery[]}>('dismiss_recovery',{operation:detail.operation}).then(result=>{if(alive.current)setRecoveries(result.items);}).catch(e=>{if(alive.current)setError(String(e));});};window.addEventListener('diane:todo-recovery-resolved',resolved);return()=>window.removeEventListener('diane:todo-recovery-resolved',resolved);},[api,scope]);
 async function inspect(file?:File){if(!file)return;setError('');setNotice('');setPrepared(undefined);requests.current=[];finished.current.clear();setBusy(true);try{if(file.size>8*1024*1024)throw Error('Choose a backup smaller than 8 MiB. Split larger archives by date.');const text=await file.text();const archive=/\.md$/i.test(file.name)?{format:'todo-sticky-markdown',version:1,content:text}:JSON.parse(text);const result=await api.command<Prepared>('prepare_backup',{archive});if(alive.current&&pluginScope()===scope)setPrepared(result);}catch(e){if(alive.current)setError(e instanceof Error?e.message:String(e));}finally{if(alive.current)setBusy(false);}}
 async function apply(){if(!prepared)return;setBusy(true);setError('');try{await flush();if(storageForAccount(scope).getItem('pending-goal-write'))throw Error('Save or discard the pending goal change before importing a backup.');for(let start=0,index=0;start<prepared.archive.records.length;start+=100,index++){if(finished.current.has(index))continue;const request_id=requests.current[index]??crypto.randomUUID();requests.current[index]=request_id;const result=await pluginApi.import('todo',{request_id,dry_run:false,archive:{...prepared.archive,records:prepared.archive.records.slice(start,start+100)}},scope) as {conflicts?:unknown[]};if(result.conflicts?.length)throw Error(`${result.conflicts.length} existing records differ. They were kept; resolve them before retrying this backup.`);finished.current.add(index);}
  if(prepared.recoveries.length)await api.command('retain_recoveries',{items:prepared.recoveries});
  if(prepared.preferences){const current=await api.preferences();const value=await api.savePreferences(prepared.preferences,current.revision);if(alive.current)onPreferences(value);}
  if(alive.current&&pluginScope()===scope){setNotice('Backup imported. Tasks have not been run.');setPrepared(undefined);await onChanged();await refresh();recordsChanged('todo',scope);}
 }catch(e){if(alive.current)setError(e instanceof Error?e.message:String(e));}finally{if(alive.current)setBusy(false);}}
 async function exportBackup(){setBusy(true);setError('');try{await flush();if(storageForAccount(scope).getItem('pending-goal-write'))throw Error('Save or discard the pending goal change before exporting a backup.');const [archive,preferences,pending]=await Promise.all([pluginApi.export('todo',scope),api.preferences(),api.command<{items:Recovery[]}>('recoveries')]);const current=pendingProject(scope);const recovery=current?[...pending.items,{original:current,operation:current}]:pending.items;const {revision:_,...savedPreferences}=preferences;downloadFile('diane-todo-backup.json',JSON.stringify({format:'diane-todo-port-backup',version:1,archive,preferences:savedPreferences,recoveries:recovery},null,2));}catch(e){if(alive.current)setError(String(e));}finally{if(alive.current)setBusy(false);}}
 function review(item:Recovery){try{if(pendingProject(scope))throw Error('Finish or discard the current pending project save first.');beginProjectOperation({...item.operation,folder:scope});onOpenProject(item.operation.before.id);}catch(e){setError(String(e));}}
 return <details className="todo-port-backup"><summary>Import & backup</summary>
 <label>Original Todo export<input type="file" accept=".json,.md,application/json,text/markdown" disabled={busy} onChange={event=>void inspect(event.target.files?.[0])}/></label>
 <small>Weekly Markdown contains tasks only. A full backup can also include goals, routines and unfinished project saves.</small>
 {prepared&&<div><p>{prepared.archive.records.length} records · {prepared.recoveries.length} unfinished saves</p>{prepared.warnings.map((warning,i)=><p key={i}>{warning}</p>)}<button disabled={busy} onClick={()=>void apply()}>Import backup</button><button disabled={busy} onClick={()=>setPrepared(undefined)}>Cancel</button></div>}
 <button disabled={busy} onClick={()=>void exportBackup()}>Export complete backup</button><button disabled={busy} onClick={()=>void onChanged().catch(e=>setError(String(e)))}>Refresh</button>
 {recoveries.map((item,index)=><div key={index}><span>Unfinished project save: {item.operation.after.text}</span><button disabled={busy} onClick={()=>review(item)}>Review unfinished save</button></div>)}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </details>;
}
