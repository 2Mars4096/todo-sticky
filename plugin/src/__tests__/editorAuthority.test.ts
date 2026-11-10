// @vitest-environment happy-dom
import {act,createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('@diane/plugin-sdk/client',()=>({connectionScope:async()=> 'editor-owner',pluginScope:()=> 'editor-owner',pluginApi:{configure:vi.fn()}}));
vi.mock('@diane/plugin-sdk/http',()=>({requestJson:mock.request}));
vi.mock('@diane/plugin-sdk/records',()=>({subscribeToPluginChanges:()=>()=>{},PLUGIN_RECORD_CHANGE_KEY:'test-plugin-change'}));
import {useTasks} from '../hooks/useTasks';
import {createTodoApi} from '../api';
import type {Task} from '../types';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>,tasks:ReturnType<typeof useTasks>;
let server:{revision:string;tasks:Task[]},writes:string[],serial:number;
const task=(id:string,text=id):Task=>({id,text,status:'todo',subtasks:[]});
function Harness(){tasks=useTasks('2026-11-09',false);return h('div',null,tasks.tasks.map(row=>row.text).join(','));}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear();serial=1;writes=[];server={revision:'r1',tasks:[task('a','Original')]};
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 mock.request.mockImplementation(async(url:string,options:{body:string})=>{
  const payload=JSON.parse(options.body).payload;
  if(url.endsWith('/get_tasks'))return {tasks:server.tasks.map(({subtasks,...row})=>({...row,todaySubtasks:subtasks,otherSubtasks:[]})),filePath:'diane:2026-11-09',weekStart:'2026-11-09',revision:server.revision};
  if(url.endsWith('/extract'))return {dates:[{date:'2026-11-09',tasks:structuredClone(server.tasks),filePath:'diane:2026-11-09',weekStart:'2026-11-09',revision:server.revision}]};
  if(url.endsWith('/save_day')){writes.push(payload.expectedRevision);if(payload.expectedRevision!==server.revision)throw Error('409: This day changed in another window');server={revision:'r'+ ++serial,tasks:structuredClone(payload.tasks)};return {...server,ok:true};}
  throw Error('Unexpected '+url);
 });
});
afterEach(()=>{act(()=>root.unmount());host.remove();mock.request.mockReset();});
it('keeps actual hook edits at their loaded revision despite later passive reads',async()=>{
 await act(async()=>root.render(h(Harness)));
 server={revision:'r2',tasks:[task('a','Original'),task('b','Other window')]};serial=2;
 await createTodoApi('editor-owner').extractTaskApi({all:true});
 await createTodoApi('editor-owner').getTasks('2026-11-09');
 await act(async()=>{tasks.updateTaskText('a','My stale edit');await expect(tasks.flushPendingSave()).rejects.toThrow('409');});
 expect(writes).toEqual(['r1']);expect(server.tasks.map(row=>row.id)).toEqual(['a','b']);expect(tasks.saveError).not.toBeNull();expect(tasks.tasks[0].text).toBe('My stale edit');
});
it('advances authority only after the hook’s own acknowledged save',async()=>{
 await act(async()=>root.render(h(Harness)));
 await act(async()=>{tasks.updateTaskText('a','First edit');await tasks.flushPendingSave();});
 await act(async()=>{tasks.updateTaskText('a','Second edit');await tasks.flushPendingSave();});
 expect(writes).toEqual(['r1','r2']);expect(server.tasks[0].text).toBe('Second edit');
});
