import {useEffect} from 'react';
import {pluginScope} from '@diane/plugin-sdk/client';
import {requestJson} from '@diane/plugin-sdk/http';

/** Prepare canonical unfinished work quietly; execution always requires Send. */
export function useTaskPreparation({active,enabled,loading,scope,taskKey,flush}:{active:boolean;enabled:boolean;loading:boolean;scope:string;taskKey:string;flush:()=>Promise<void>}) {
 useEffect(()=>{
  if(!active||!enabled||loading)return;
  let disposed=false;let timer:ReturnType<typeof setTimeout>;
  const controller=new AbortController();
  const current=()=>!disposed&&pluginScope()===scope;
  const refresh=async()=>{
   try {
    if(!current()||document.hidden)return;
    await flush();
    if(!current())return;
    await requestJson('/api/sticky-todo/preparations/refresh',{method:'POST',body:JSON.stringify({scope}),signal:controller.signal});
   } catch { /* Selected-task preparation owns actionable errors; never interrupt capture. */ }
   finally {if(current())timer=setTimeout(()=>void refresh(),60_000);}
  };
  timer=setTimeout(()=>void refresh(),1_000);
  return()=>{disposed=true;clearTimeout(timer);controller.abort();};
 },[active,enabled,loading,scope,taskKey,flush]);
}
