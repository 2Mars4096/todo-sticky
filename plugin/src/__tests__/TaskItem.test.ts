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
it('retains keyboard title editing and exposes explicit Diane action without Focus controls',async()=>{const p=props();await act(async()=>root.render(h(TaskItem,p)));const title=host.querySelector<HTMLElement>('.task-text')!;await act(async()=>{title.focus();});expect(host.textContent).toContain('Run in Diane');expect(host.querySelector('[title="Focus"]')).toBeNull();await act(async()=>title.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));const input=host.querySelector<HTMLTextAreaElement>('[aria-label="Edit title: Imported task"]')!;expect(input).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(input,'Revised\nwith detail');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true})));expect(p.onTextChange).toHaveBeenCalledWith('Revised\nwith detail');});
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

async function changeText(value:string) {
 const input=host.querySelector<HTMLTextAreaElement>('textarea')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});
 return input;
}
it('edits with one click and cancels by keyboard or button without saving on internal blur',async()=>{
 const p=props();await act(async()=>root.render(h(TaskItem,p)));
 await act(async()=>host.querySelector<HTMLElement>('.task-text')!.click());
 let input=await changeText('Unsaved paragraph');
 const cancel=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Cancel')!;
 await act(async()=>cancel.focus());expect(p.onTextChange).not.toHaveBeenCalled();
 await act(async()=>cancel.click());expect(p.onTextChange).not.toHaveBeenCalled();
 expect(host.querySelector('.task-text')?.textContent).toBe('Imported task');
 await act(async()=>host.querySelector<HTMLElement>('.task-text')!.click());input=await changeText('Another draft');
 await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 expect(p.onTextChange).not.toHaveBeenCalled();
});
it('saves once when leaving the editor and never turns an empty edit into deletion',async()=>{
 const p=props();await act(async()=>root.render(h(TaskItem,p)));
 await act(async()=>host.querySelector<HTMLElement>('.task-text')!.click());await changeText('Paragraph one\nParagraph two');
 const outside=document.createElement('button');document.body.append(outside);
 await act(async()=>outside.focus());expect(p.onTextChange).toHaveBeenCalledExactlyOnceWith('Paragraph one\nParagraph two');
 await act(async()=>host.querySelector<HTMLElement>('.task-text')!.click());await changeText('   ');
 const save=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Save')!;expect(save.disabled).toBe(true);
 await act(async()=>outside.focus());expect(p.onTextChange).toHaveBeenCalledTimes(1);expect(p.onDelete).not.toHaveBeenCalled();outside.remove();
});
it('leaves Enter and IME confirmation to paragraph editing',async()=>{
 const p=props();await act(async()=>root.render(h(TaskItem,p)));await act(async()=>host.querySelector<HTMLElement>('.task-text')!.click());
 const input=await changeText('Draft');
 for(const options of [{key:'Enter'},{key:'Enter',ctrlKey:true,isComposing:true}]) {
 const event=new KeyboardEvent('keydown',{...options,bubbles:true,cancelable:true});await act(async()=>input.dispatchEvent(event));expect(event.defaultPrevented).toBe(false);
 }
 expect(p.onTextChange).not.toHaveBeenCalled();expect(host.querySelector('textarea')).toBe(input);
});

it('keeps management hidden while editing, opens it only with ellipsis, and preserves its draft on close',async()=>{
 const p={...props(),finish:{doneWhen:'Existing outcome'},onUpdateFinish:vi.fn(),onReview:vi.fn()};await act(async()=>root.render(h(TaskItem,p)));
 const panel=host.querySelector<HTMLElement>('.task-details-panel')!,more=host.querySelector<HTMLButtonElement>('.task-more-button')!;
 expect(panel.hidden).toBe(true);await act(async()=>host.querySelector<HTMLElement>('.task-text')!.click());expect(panel.hidden).toBe(true);
 await act(async()=>more.click());expect(panel.hidden).toBe(false);expect(more.getAttribute('aria-expanded')).toBe('true');
 expect(panel.querySelector('[aria-label="Add step"]')).toBeTruthy();expect(host.querySelectorAll('.task-more-button')).toHaveLength(1);
 await act(async()=>more.click());expect(panel.hidden).toBe(true);expect(host.querySelector('.task-details-panel')).toBe(panel);
 await act(async()=>more.click());await act(async()=>panel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));expect(panel.hidden).toBe(true);expect(document.activeElement).toBe(more);
});
it('opens only one task details panel at a time',async()=>{
 const a=props(),b={...props(),id:'second',text:'Second task'};await act(async()=>root.render(h('div',null,h(TaskItem,a),h(TaskItem,b))));const buttons=host.querySelectorAll<HTMLButtonElement>('.task-more-button'),panels=host.querySelectorAll<HTMLElement>('.task-details-panel');
 await act(async()=>buttons[0].click());expect(panels[0].hidden).toBe(false);await act(async()=>buttons[1].click());expect(panels[0].hidden).toBe(true);expect(panels[1].hidden).toBe(false);
});

it('defers pointer focus until the details click lands so editor blur cannot move its target',async()=>{
 await act(async()=>root.render(h(TaskItem,props())));await act(async()=>host.querySelector<HTMLElement>('.task-text')!.click());const input=host.querySelector('textarea')!,more=host.querySelector<HTMLButtonElement>('.task-more-button')!;
 const down=new PointerEvent('pointerdown',{button:0,bubbles:true,cancelable:true});await act(async()=>more.dispatchEvent(down));expect(down.defaultPrevented).toBe(true);expect(document.activeElement).toBe(input);
 await act(async()=>more.click());expect(host.querySelector<HTMLElement>('.task-details-panel')!.hidden).toBe(false);expect(document.activeElement).toBe(more);
});
