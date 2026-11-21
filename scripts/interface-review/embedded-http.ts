export class ApiError extends Error {}
const task={id:'review-parent',text:'Fixture note · 草稿',status:'todo',todaySubtasks:[{id:'review-step',text:'Fixture step',status:'todo',subtasks:[]}],otherSubtasks:[]};
export async function requestJson(url:string){
 const command=url.split('/').at(-1);
 const fixture=(globalThis as any).projectReviewFixture;
 if(fixture){
   if(command==='goals')return {items:[{record_type:'goal',record_id:fixture.id,revision:1,text:fixture.description,title:fixture.description,extensions:{plan:[{id:'fixture-step',text:'Fixture project step'}]}}]};
   if(command==='extract')return {dates:[{date:fixture.day,tasks:fixture.many?[fixture.task,{...fixture.task,id:'review-second',text:'Fixture second record'}]:[fixture.task],filePath:'fixture.md',weekStart:'2026-11-16',revision:'1'}]};
   if(command==='ai')return {actions:fixture.actions};
 }

 if(command==='get_tasks')return {tasks:[task],filePath:'weekly/fixture.md',weekStart:'2026-11-16',revision:'1'};
 if(command==='preferences')return {revision:1,machines:[],planningPreferences:{}};
 if(command==='goals')return {items:[]};
 if(command==='extract')return {dates:[{date:'2026-11-21',tasks:[{id:'review-parent',text:task.text,status:'todo',subtasks:task.todaySubtasks}],filePath:'weekly/fixture.md',weekStart:'2026-11-16',revision:'1'}]};
 if(url.includes('meeting-monitor'))return {reviews:[],items:[],before:null,head:null};
 return {items:[],tasks:[],goals:[],targets:[],recurring:[]};
}
