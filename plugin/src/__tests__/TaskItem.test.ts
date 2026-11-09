// @vitest-environment happy-dom
import {act,createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../TaskDianeAction',()=>({TaskDianeAction:()=>h('button',null,'Run in Diane')}));
import {TodoPortContext} from '../TodoPortContext';
import {TaskItem} from '../components/TaskItem';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});globalThis.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}} as any;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.restoreAllMocks();});
const props=()=>({id:'task',text:'Imported task',status:'todo' as const,moveTargetLabel:'tomorrow',onToggle:vi.fn(),onDelete:vi.fn(),onPush:vi.fn(),onTextChange:vi.fn(),onAddSubtask:vi.fn()});
it('retains keyboard title editing and exposes explicit Diane action without Focus controls',async()=>{const p=props();await act(async()=>root.render(h(TaskItem,p)));const title=host.querySelector<HTMLElement>('.task-text')!;await act(async()=>{title.click();});expect(host.textContent).toContain('Run in Diane');expect(host.querySelector('[title="Focus"]')).toBeNull();await act(async()=>title.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));const input=host.querySelector<HTMLTextAreaElement>('[aria-label="Edit title: Imported task"]')!;expect(input).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(input,'Revised\nwith detail');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true})));expect(p.onTextChange).toHaveBeenCalledWith('Revised\nwith detail');});
it('keeps historical steps read-only with their source date',async()=>{const p=props();await act(async()=>root.render(h(TaskItem,{...p,isOtherDate:true,isSubtask:true,sourceDate:'2026-11-08'})));expect(host.querySelector<HTMLButtonElement>('.task-checkbox')?.disabled).toBe(true);expect(host.querySelector('.task-text')?.getAttribute('role')).toBeNull();expect(host.textContent).not.toContain('Run in Diane');});

it('does not reselect a dismissed handoff when unchanged step arrays refresh',async()=>{
 const p=props(),selection={recordId:'task',requestId:'open-once'},context={scope:'owner',active:true,enabled:true,flush:async()=>{},selection};
 const render=()=>root.render(h(TodoPortContext.Provider,{value:context},h(TaskItem,{...p,todaySubtasks:[]})));
 await act(async()=>render());expect(host.querySelector('.task-selected')).toBeTruthy();
 const title=host.querySelector<HTMLElement>('.task-text')!,outside=document.createElement('button');document.body.append(outside);
 await act(async()=>title.focus());await act(async()=>outside.focus());
 expect(host.querySelector('.task-selected')).toBeNull();
 await act(async()=>render());expect(host.querySelector('.task-selected')).toBeNull();outside.remove();
});
