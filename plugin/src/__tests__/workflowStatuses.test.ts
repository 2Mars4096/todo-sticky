// @vitest-environment happy-dom
import {act,createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({scope:'owner-a',statuses:vi.fn(),listeners:[] as Array<()=>void>}));
vi.mock('@diane/plugin-sdk/client',()=>({pluginScope:()=>mock.scope}));
vi.mock('@diane/plugin-sdk/records',()=>({subscribeToPluginChanges:(_plugin:string,listener:()=>void)=>{mock.listeners.push(listener);return()=>{};}}));
vi.mock('../api',()=>({createTodoApi:()=>({workflowStatuses:mock.statuses})}));
import {useTaskWorkflowStatuses} from '../hooks/useTaskWorkflowStatuses';
import {TaskWorkflowContext,TaskWorkflowStatus,type WorkflowStatuses} from '../TaskWorkflowStatus';
import type {AggregatedTask} from '../types';
import type {Workflow} from '@diane/plugin-sdk/client';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>,value:WorkflowStatuses;
const task=(id:string):AggregatedTask=>({id,text:id,status:'todo',todaySubtasks:[],otherSubtasks:[]});
const working={task_id:'a',workflow_id:'w',state:'running'} as Workflow;
function Harness({tasks=[task('a')],scope='owner-a',onRender}:{tasks?:AggregatedTask[];scope?:string;onRender?:(value:WorkflowStatuses)=>void}){value=useTaskWorkflowStatuses(scope,tasks,true);onRender?.(value);return h(TaskWorkflowContext.Provider,{value},h(TaskWorkflowStatus,{taskId:'a'}));}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.useFakeTimers();mock.scope='owner-a';mock.statuses.mockReset();mock.listeners=[];host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.useRealTimers();});
it('uses bounded batches in one polling loop and reports unavailable without claiming live work',async()=>{
 mock.statuses.mockImplementation(async(ids:string[])=>Object.fromEntries(ids.map(id=>[id,id==='a'?working:null])));
 await act(async()=>root.render(h(Harness,{tasks:[task('a'),...Array.from({length:100},(_,i)=>task('task-'+i))]})));
 expect(mock.statuses).toHaveBeenCalledTimes(2);expect(mock.statuses.mock.calls.map(call=>call[0].length)).toEqual([100,1]);
 expect(host.textContent).toBe('Working');
 mock.statuses.mockRejectedValue(Error('offline'));
 await act(async()=>vi.advanceTimersByTimeAsync(4000));
 expect(host.textContent).toBe('Status unavailable');expect(value.byId.a?.state).toBe('running');
});
it('coalesces duplicate refresh signals and fences late results after account change',async()=>{
 let settle!:(value:unknown)=>void;mock.statuses.mockReturnValue(new Promise(resolve=>settle=resolve));
 await act(async()=>root.render(h(Harness)));
 await act(async()=>{window.dispatchEvent(new Event('focus'));mock.listeners.forEach(listener=>listener());});
 expect(mock.statuses).toHaveBeenCalledTimes(1);
 mock.scope='owner-b';await act(async()=>settle({a:working}));expect(value.byId).toEqual({});expect(host.textContent).toBe('');
});
it('never renders the previous account status when the next account has the same task ID',async()=>{
 mock.statuses.mockResolvedValueOnce({a:working});
 await act(async()=>root.render(h(Harness)));
 expect(host.textContent).toBe('Working');
 let reject!:(error:Error)=>void;mock.statuses.mockReturnValueOnce(new Promise((_,fail)=>reject=fail));
 const rendered:WorkflowStatuses[]=[];mock.scope='owner-b';
 await act(async()=>root.render(h(Harness,{scope:'owner-b',onRender:status=>rendered.push(status)})));
 expect(rendered.length).toBeGreaterThan(0);expect(rendered.every(status=>Object.keys(status.byId).length===0&&!status.checkedAt)).toBe(true);
 expect(host.textContent).toBe('');
 await act(async()=>reject(Error('second account unavailable')));
 expect(value.unavailable).toBe(true);expect(value.byId).toEqual({});expect(value.checkedAt).toBeUndefined();expect(host.textContent).toBe('');
});
