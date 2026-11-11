// @vitest-environment happy-dom
import {act, createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {applyStepsWithUndo,proposedSteps} from '../stepProposal';
import {restoreTaskChange} from '../taskHistory';
import {StepProposalContext,TaskStepProposal} from '../TaskStepProposal';
import type {AggregatedTask} from '../types';

const task:AggregatedTask={id:'a',text:'Prepare report',status:'todo',todaySubtasks:[{id:'old',text:'Read sources',status:'todo',subtasks:[]}],otherSubtasks:[]};
it('keeps suggestions concise and deduplicates against existing work',()=>{
 expect(proposedSteps([{text:' Read sources '},{text:'Write draft'},{text:'write draft'}],['Read sources'])).toEqual(['Write draft']);
 expect(()=>proposedSteps(Array.from({length:9},()=>({text:'Too many'})),[])).toThrow('eight');
});
it('undo removes only unchanged generated steps and preserves later user work',()=>{
 let serial=0;const changed=applyStepsWithUndo([task],'2026-11-10','a',['Draft','Verify'],()=>`new-${serial++}`)!;
 const after={...changed.tasks[0],todaySubtasks:[...changed.tasks[0].todaySubtasks.map(step=>step.id==='new-0'?{...step,text:'User refined draft'}:step),{id:'manual',text:'Extra requirement',status:'todo' as const,subtasks:[]}]};
 const restored=restoreTaskChange([after],changed.undo);
 expect(restored[0].todaySubtasks.map(step=>step.text)).toEqual(['Read sources','User refined draft','Extra requirement']);
 expect(task.todaySubtasks).toHaveLength(1);
});
it('renders an editable proposal without applying it and disables stale acceptance',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const apply=vi.fn(),dismiss=vi.fn(),value={proposal:{taskId:'a',title:'Prepare report',date:'2026-11-10',taskKey:'original',steps:['Draft']},stale:false,busy:false,edit:vi.fn(),remove:vi.fn(),apply,dismiss};
 try{
  await act(async()=>root.render(h(StepProposalContext.Provider,{value},h(TaskStepProposal,{taskId:'a'}))));
  expect(apply).not.toHaveBeenCalled();expect(host.querySelector('textarea')?.value).toBe('Draft');
  await act(async()=>root.render(h(StepProposalContext.Provider,{value:{...value,stale:true}},h(TaskStepProposal,{taskId:'a'}))));
  const add=[...host.querySelectorAll('button')].find(button=>button.textContent==='Add steps')!;
  expect(add.disabled).toBe(true);expect(host.textContent).toContain('Task changed');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Cancel')!.click());expect(dismiss).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());host.remove();}
});
