import { createPortal } from 'react-dom';
import { useEffect, useState, useMemo } from 'react';
import { createTodoApi } from './api';
import { useTodoPort } from './TodoPortContext';
import { TaskExecution } from './TaskExecution';
import { UseInDiane } from '@diane/plugin-sdk/input-context';
import { pluginScope, type PluginRecord } from '@diane/plugin-sdk/client';

export function TaskDianeAction({id,compact=false,controlsTarget,onConfigure}:{id:string;compact?:boolean;controlsTarget?:HTMLElement|null;onConfigure?:()=>void}){
 const port=useTodoPort();const api=useMemo(()=>createTodoApi(port?.scope||pluginScope()),[port?.scope]);const [record,setRecord]=useState<PluginRecord>();const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [saved,setSaved]=useState<{taskKey?:string;flush:()=>Promise<void>}>();
 useEffect(()=>{let disposed=false;if(!port)return;const scope=port.scope;
  setSaved(undefined);
  void port.flush().then(()=>disposed?undefined:api.taskRecord(id)).then(value=>{if(value&&!disposed&&pluginScope()===scope){setRecord({...value,_scope:scope});setError('');setSaved({taskKey:port.taskKey,flush:port.flush});}}).catch(e=>{if(!disposed)setError(e instanceof Error?e.message:String(e));});
  return()=>{disposed=true;};
 },[id,port?.scope,port?.flush,port?.taskKey,retry]);
 if(!port)return null;
 const saving=!saved||saved.taskKey!==port.taskKey||saved.flush!==port.flush;
 const current=record?.record_id===id&&record._scope===port.scope?record:undefined;
 return <section className="todo-diane-handoff" aria-label="Diane task handoff">
  {current?<><TaskExecution compact={compact} controlsTarget={controlsTarget} onConfigure={onConfigure} key={`${current._scope}:${current.record_id}`} task={current} active={port.active} saving={saving} enabled={port.enabled && Boolean(current.text.trim())}/>{!saving&&(!compact||controlsTarget)&&(compact ? createPortal(<UseInDiane record={current} text={[current.text,current.extensions.outcome?`Outcome: ${current.extensions.outcome}`:''].filter(Boolean).join('\n\n')} label="Discuss in Diane"/>,controlsTarget!) : <UseInDiane record={current} text={[current.text,current.extensions.outcome?`Outcome: ${current.extensions.outcome}`:''].filter(Boolean).join('\n\n')} label="Discuss in Diane" iconOnly/>)}</>:!error&&<span role="status">Saving task…</span>}
  {error&&<p role="alert">{error}<button onClick={()=>setRetry(x=>x+1)}>Retry</button></p>}
 </section>;
}
