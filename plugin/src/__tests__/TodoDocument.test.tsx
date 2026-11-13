import {act,createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {setTestScope} from '../../dev/test-host-sdk/client';
import {TodoDocument,type TodoDocumentHost,type TodoDocumentEditorProps} from '../TodoDocument';
vi.mock('../TaskDianeAction',()=>({TaskDianeAction:({id}:{id:string})=>h('button',{'data-task':id},'Open session')}));
let container:HTMLDivElement,root:ReturnType<typeof createRoot>,received:TodoDocumentEditorProps;
const Editor=(props:TodoDocumentEditorProps)=>{received=props;return h('pre',null,props.content);};
const snapshot={path:'content/to-do/week/index.md',document:'binding',content:'## date\nTask',normalized:'## date\nTask',revision:'sha256:original',projection:{token:'records-1',links:{a:'canonical-a'},created:[],removed:[],initial:false},tasks:[{id:'a',line:2,task:{text:'Task',status:'todo'}}],pending:false};
let host:TodoDocumentHost;
beforeEach(()=>{localStorage.clear();setTestScope('alice');container=document.createElement('div');document.body.append(container);root=createRoot(container);host={list:vi.fn(async()=>({documents:[snapshot.path]})),read:vi.fn(async()=>snapshot),preview:vi.fn(async(value)=>({content:value.content,projection:snapshot.projection,tasks:snapshot.tasks})),save:vi.fn(async()=>({})),recover:vi.fn(),reviewAgain:vi.fn()};});
afterEach(()=>{act(()=>root.unmount());container.remove();});
async function mount(){await act(async()=>root.render(h(TodoDocument,{scope:'alice',host,editor:Editor,onClose:vi.fn(),onSaved:vi.fn(async()=>{})})));await act(async()=>{const select=container.querySelector('select')!;select.value=snapshot.path;select.dispatchEvent(new Event('change',{bubbles:true}));});}
async function click(label:string){await act(async()=>{[...container.querySelectorAll('button')].find(b=>b.textContent===label)!.click();});}
it('edits full document, previews explicitly, preserves identity and never dispatches on load/save',async()=>{await mount();expect(received.content).toBe(snapshot.content);expect(host.save).not.toHaveBeenCalled();await click('Line 2: Task · todo');expect(container.querySelector('[data-task="canonical-a"]')).toBeTruthy();act(()=>received.onChange('---\nmeta: kept\n---\nEntire document'));expect(container.querySelector('[data-task]')).toBeNull();await click('Review changes');expect(host.save).not.toHaveBeenCalled();await click('Save changes');expect(host.save).toHaveBeenCalledWith(expect.objectContaining({content:'---\nmeta: kept\n---\nEntire document',expected:'records-1',revision:'sha256:original'}));});
it('fences stale editor callbacks and owner switches',async()=>{await mount();const old=received.onChange;act(()=>received.onChange('new draft'));act(()=>old('stale'));expect(received.content).toBe('new draft');setTestScope('bob');act(()=>received.onChange('other owner'));expect(received.content).toBe('new draft');expect(host.save).not.toHaveBeenCalled();});
it('renders unsupported state without pretending to open files',async()=>{await act(async()=>root.render(h(TodoDocument,{scope:'alice',onClose:vi.fn(),onSaved:vi.fn()})));expect(container.textContent).toContain('does not support KB document editing');expect(host.list).not.toHaveBeenCalled();});

it('restores account-scoped drafts after remount and warns before unload',async()=>{
 await mount();act(()=>received.onChange('kept draft'));
 const unload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(unload);expect(unload.defaultPrevented).toBe(true);
 act(()=>root.unmount());root=createRoot(container);await mount();expect(received.content).toBe('kept draft');
 await click('Discard draft');act(()=>root.unmount());root=createRoot(container);await mount();expect(received.content).toBe(snapshot.content);
});
it('retains a recovered draft when the file revision changed without saving automatically',async()=>{
 await mount();act(()=>received.onChange('my edits'));act(()=>root.unmount());root=createRoot(container);
 host.read=vi.fn(async()=>({...snapshot,revision:'new',content:'external edits'}));await mount();
 expect(received.content).toBe('my edits');expect(container.textContent).toContain('file changed since this draft');expect(host.save).not.toHaveBeenCalled();
});

it('reopens normalized saved bytes without resurrecting the pre-save draft',async()=>{
 await mount();act(()=>received.onChange('new task without ID'));
 const normalized='new task <!-- sticky-todo:id=new -->';
 host.preview=vi.fn(async()=>({content:normalized,projection:snapshot.projection,tasks:[]}));
 host.save=vi.fn(async()=>{host.read=vi.fn(async()=>({...snapshot,content:normalized,revision:'saved'}));});
 await click('Review changes');await click('Save changes');
 expect(received.content).toBe(normalized);expect(localStorage.length).toBe(0);
});
