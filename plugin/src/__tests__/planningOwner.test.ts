// @vitest-environment happy-dom
import {act,createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({scope:'owner-a',owners:[] as string[],schedule:vi.fn()}));
vi.mock('@diane/plugin-sdk/client',()=>({pluginScope:()=>mock.scope}));
vi.mock('../api',()=>({createTodoApi:(scope:string)=>{mock.owners.push(scope);return {llmSchedule:mock.schedule};}}));
import {ScheduleView} from '../components/ScheduleView';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear();mock.scope='owner-a';mock.owners=[];mock.schedule.mockRejectedValue(Error('Account changed'));host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();mock.schedule.mockReset();});
it('keeps a late original-owner plan action out of the new owner’s preference namespace',async()=>{
 await act(async()=>root.render(h(ScheduleView,{date:'2026-11-09',tasks:[{id:'a',text:'Draft report',status:'todo',todaySubtasks:[],otherSubtasks:[]}],tasksLoading:false,machines:[],onApply:vi.fn(),onClose:vi.fn()})));
 mock.scope='owner-b';
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(mock.owners).toEqual(['owner-a']);
 expect(localStorage.getItem('diane.todoPort.v1:owner-a:todo-sticky-planning-preferences-v1')).not.toBeNull();
 expect(localStorage.getItem('diane.todoPort.v1:owner-b:todo-sticky-planning-preferences-v1')).toBeNull();
});
