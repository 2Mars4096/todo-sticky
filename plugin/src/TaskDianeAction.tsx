import { useEffect, useState, useMemo } from 'react';
import { createTodoApi } from './api';
import { useTodoPort } from './TodoPortContext';
import { WorkflowReview } from '@diane/plugin-sdk/workflow';
import { UseInDiane } from '@diane/plugin-sdk/input-context';
import { pluginScope, type PluginRecord } from '@diane/plugin-sdk/client';

export function TaskDianeAction({id}:{id:string}){
 const port=useTodoPort();const api=useMemo(()=>createTodoApi(port?.scope||pluginScope()),[port?.scope]);const [record,setRecord]=useState<PluginRecord>();const [error,setError]=useState('');const [retry,setRetry]=useState(0);
 useEffect(()=>{let disposed=false;if(!port)return;const scope=port.scope;
  void port.flush().then(()=>api.taskRecord(id)).then(value=>{if(!disposed&&pluginScope()===scope){setRecord({...value,_scope:scope});setError('');}}).catch(e=>{if(!disposed)setError(e instanceof Error?e.message:String(e));});
  return()=>{disposed=true;};
 },[id,port?.scope,port?.flush,port?.taskKey,retry]);
 if(!port)return null;
 return <section className="todo-diane-handoff" aria-label="Diane task handoff">
  {record?<><WorkflowReview key={`${record.record_id}:${record.revision}`} task={record} active={port.active} enabled={port.enabled && Boolean(record.text.trim())}/><UseInDiane record={record} text={[record.text,record.extensions.outcome?`Outcome: ${record.extensions.outcome}`:''].filter(Boolean).join('\n\n')} label="Discuss in Diane" iconOnly/></>:error?<p role="alert">{error}<button onClick={()=>setRetry(x=>x+1)}>Retry</button></p>:<span role="status">Saving task…</span>}
 </section>;
}
