import {api} from '../../web/src/api';
export async function setup({day,task,actions,many}:any){
 api.llmProjectPlan=async()=>({actions}) as any;
 await new Promise<void>(ok=>{const r=indexedDB.open('dockit-notebook-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('days');r.onsuccess=()=>{const db=r.result,tx=db.transaction('days','readwrite');tx.objectStore('days').put(many?[task,{...task,id:'review-second',text:'Fixture second record'}]:[task],day);tx.oncomplete=()=>{db.close();ok()}}});
}
