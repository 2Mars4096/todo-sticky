import { ui } from './interfaceLocale'
import {useEffect,useId,useMemo,useState} from 'react';
import {createTodoApi} from './api';
import type {AppSettings} from './types';
import {storageForAccount} from './storage';
export interface PlanningPreferences {revision:number;machines:AppSettings['machines'];planningPreferences:{start?:string;end?:string;machines?:string[]}}
type MachineDraft=AppSettings['machines'][number]&{capabilitiesText:string};
const drafts=(machines:AppSettings['machines']):MachineDraft[]=>machines.map(machine=>({...machine,capabilitiesText:(machine.capabilities||[]).join(', ')}));
/** Machine controls adapted directly from original SettingsPanel.tsx. */
export function PlanningSettings({scope,value,onSaved,embedded=false}:{scope:string;embedded?:boolean;value:PlanningPreferences;onSaved:(value:PlanningPreferences)=>void}){
 const id=useId(),api=useMemo(()=>createTodoApi(scope),[scope]);const [machines,setMachines]=useState(()=>drafts(value.machines)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setMachines(drafts(value.machines)),[value]);
 const dirty=JSON.stringify(machines)!==JSON.stringify(drafts(value.machines));
 const updateMachine=(index:number,patch:Partial<MachineDraft>)=>setMachines(items=>items.map((item,i)=>i===index?{...item,...patch}:item));
 const save=async()=>{if(busy||!dirty)return;setBusy(true);setError('');try{const next=await api.savePreferences({machines:machines.map(({capabilitiesText,...machine})=>({...machine,capabilities:capabilitiesText.split(',').map(value=>value.trim()).filter(Boolean)})),planningPreferences:JSON.parse(storageForAccount(scope).getItem('todo-sticky-planning-preferences-v1')||'{}')},value.revision);onSaved(next);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 const Container=embedded?'section':'details';
 return <Container className="todo-port-settings">{!embedded&&<summary>{ui("Machines")}</summary>}
 {!machines.length&&<p className="settings-empty">{ui("No machines added.")}</p>}
 {machines.map((machine,index)=><div className="machine-card" key={index}>
 <div className="settings-machine-heading"><strong>{machine.name.trim()||ui("Machine {0}", [index+1])}</strong><button type="button" disabled={busy} onClick={()=>setMachines(items=>items.filter((_,i)=>i!==index))} aria-label={ui("Remove machine {0}", [(machine.name||index+1)])}>{ui("Remove")}</button></div>
 <label htmlFor={id+'-machine-name-'+index}>{ui("Name")}</label><input id={id+'-machine-name-'+index} value={machine.name} disabled={busy} onChange={event=>updateMachine(index,{name:event.target.value})}/>
 <label htmlFor={id+'-machine-type-'+index}>{ui("Type")}</label><select id={id+'-machine-type-'+index} value={machine.type} disabled={busy} onChange={event=>updateMachine(index,{type:event.target.value})}><option value="server">{ui("Server")}</option><option value="workstation">{ui("Workstation")}</option></select>
 <label htmlFor={id+'-machine-specs-'+index}>{ui("Specifications (optional)")}</label><input id={id+'-machine-specs-'+index} value={machine.specs||''} disabled={busy} onChange={event=>updateMachine(index,{specs:event.target.value})} placeholder={ui("For example, 64 GB RAM")}/>
 <label htmlFor={id+'-machine-capabilities-'+index}>{ui("Capabilities (comma separated)")}</label><input id={id+'-machine-capabilities-'+index} value={machine.capabilitiesText} disabled={busy} onChange={event=>updateMachine(index,{capabilitiesText:event.target.value})}/>
 </div>)}
 <div className="settings-machine-actions"><button type="button" disabled={busy} onClick={()=>setMachines(items=>[...items,{name:'',type:'server',specs:'',capabilities:[],capabilitiesText:''}])}>{ui("Add machine")}</button>
 <button type="button" disabled={busy||!dirty} onClick={()=>void save()}>{busy?ui("Saving…"):ui("Save machines")}</button></div>
 {error&&<p role="alert">{error}</p>}</Container>;
}
