import {useState,useId,type ReactNode} from 'react';
import {Settings2,ArrowUpRight} from 'lucide-react';
export function TodoSettings({machines,backups}:{machines:ReactNode;backups:ReactNode}) {
 const [section,setSection]=useState<'machines'|'backups'>('machines'),id=useId();
 return <details className="todo-settings-panel"><summary><Settings2 size={16} aria-hidden="true"/>Settings</summary>
  <div className="todo-settings-content">
   <nav aria-label="Todo settings" className="todo-settings-nav">
    <button type="button" aria-pressed={section==='machines'} aria-controls={id+'-machines'} onClick={()=>setSection('machines')}>Machines</button>
    <button type="button" aria-pressed={section==='backups'} aria-controls={id+'-backups'} onClick={()=>setSection('backups')}>Backups</button>
    <button type="button" className="todo-settings-ai" onClick={()=>window.dispatchEvent(new CustomEvent('diane:plugin-settings',{detail:{section:'ai'}}))}>AI settings<ArrowUpRight size={14} aria-hidden="true"/></button>
   </nav>
   <div id={id+'-machines'} hidden={section!=='machines'}>{machines}</div>
   <div id={id+'-backups'} hidden={section!=='backups'}>{backups}</div>
  </div>
 </details>;
}
