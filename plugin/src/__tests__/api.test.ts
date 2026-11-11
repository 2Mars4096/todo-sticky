// @vitest-environment happy-dom
import {beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({scope:'owner-a',request:vi.fn()}));
vi.mock('@diane/plugin-sdk/client',()=>({connectionScope:async()=>mock.scope,pluginScope:()=>mock.scope,pluginApi:{configure:vi.fn()}}));
vi.mock('@diane/plugin-sdk/http',()=>({requestJson:mock.request}));
vi.mock('@diane/plugin-sdk/records',()=>({subscribeToPluginChanges:()=>()=>{},PLUGIN_RECORD_CHANGE_KEY:'test-plugin-change'}));
import {createTodoApi} from '../api';
beforeEach(()=>{mock.scope='owner-a';mock.request.mockReset();localStorage.clear();});
it('binds an adapter to its original owner before delayed calls',async()=>{const api=createTodoApi('owner-a');mock.scope='owner-b';await expect(api.taskRecord('one')).rejects.toThrow(/account changed/);expect(mock.request).not.toHaveBeenCalled();});
it('rejects late results after account switch',async()=>{let settle!:(value:unknown)=>void;mock.request.mockReturnValue(new Promise(resolve=>settle=resolve));const pending=createTodoApi('owner-a').taskRecord('one');await Promise.resolve();mock.scope='owner-b';settle({record_id:'one'});await expect(pending).rejects.toThrow(/account changed/);});
it('retains failed-write request identity while updating only acknowledged day revision',async()=>{const api=createTodoApi('owner-a');mock.request.mockResolvedValueOnce({date:'2026-11-09',tasks:[],filePath:'diane:2026-11-09',weekStart:'2026-11-09',revision:'r1'});await api.getTasks('2026-11-09');mock.request.mockRejectedValueOnce(Error('offline'));const input={filePath:'diane:2026-11-09',dateStr:'2026-11-09',tasks:[],expectedRevision:'r1'};await expect(api.saveTasks(input)).rejects.toThrow('offline');mock.request.mockResolvedValueOnce({revision:'r2',tasks:[],ok:true});await api.saveTasks(input);const first=JSON.parse(mock.request.mock.calls[1][1].body),retry=JSON.parse(mock.request.mock.calls[2][1].body);expect(first.request_id).toBe(retry.request_id);expect(retry.payload.expectedRevision).toBe('r1');expect(JSON.parse(localStorage.getItem('test-plugin-change')!).scope).toBe('owner-a');});

it('separates a new explicit AI action from an uncertain prior request',async()=>{const api=createTodoApi('owner-a');mock.request.mockRejectedValueOnce(Error('Uncertain provider outcome'));await expect(api.llmBreakdown({taskText:'Work',existingSubtasks:[]})).rejects.toThrow('Uncertain');mock.request.mockResolvedValueOnce({subtasks:[{text:'Read evidence'}]});await api.llmBreakdown({taskText:'Work',existingSubtasks:[]});const first=JSON.parse(mock.request.mock.calls[0][1].body),second=JSON.parse(mock.request.mock.calls[1][1].body);expect(first.request_id).not.toBe(second.request_id);expect(first.payload.intent_id).not.toBe(second.payload.intent_id);});
it('passes explicit canonical source revisions without changing older callers',async()=>{
 const api=createTodoApi('owner-a');mock.request.mockResolvedValue({subtasks:[]});
 const sources=[{record_type:'task',record_id:'a',revision:4}];
 await api.llmBreakdown({taskText:'Work',existingSubtasks:[]},sources);
 expect(JSON.parse(mock.request.mock.calls[0][1].body).payload.sources).toEqual(sources);
 await api.llmBreakdown({taskText:'Simple outcome',existingSubtasks:[],suggestFinish:true});
 expect(JSON.parse(mock.request.mock.calls[1][1].body).payload.sources).toBeUndefined();
});
it('refuses incomplete batch status instead of presenting an empty successful state',async()=>{
 mock.request.mockResolvedValue({workflows:{}});
 await expect(createTodoApi('owner-a').workflowStatuses(['a'])).rejects.toThrow('incomplete');
});

it('never takes save authority from a later passive history or project read',async()=>{
 const api=createTodoApi('owner-a');
 const a={id:'a',text:'A',status:'todo' as const,subtasks:[]},b={id:'b',text:'Added elsewhere',status:'todo' as const,subtasks:[]};
 let server={revision:'r1',tasks:[a]};
 const writes:string[]=[];
 mock.request.mockImplementation(async(url,options)=>{
  const payload=JSON.parse(options.body).payload;
  if(url.endsWith('/get_tasks'))return {tasks:server.tasks.map(({subtasks,...task})=>({...task,todaySubtasks:subtasks,otherSubtasks:[]})),filePath:'diane:2026-11-09',weekStart:'2026-11-09',revision:server.revision};
  if(url.endsWith('/extract'))return {dates:[{date:'2026-11-09',tasks:structuredClone(server.tasks),filePath:'diane:2026-11-09',weekStart:'2026-11-09',revision:server.revision}]};
  if(url.endsWith('/save_day')){writes.push(payload.expectedRevision);if(payload.expectedRevision!==server.revision)throw Error('409: This day changed in another window');server={revision:'r3',tasks:payload.tasks};return {...server,ok:true};}
  throw Error('Unexpected request');
 });
 const editable=await api.getTasks('2026-11-09');
 server={revision:'r2',tasks:[a,b]};
 await api.extractTaskApi({all:true});
 await createTodoApi('owner-a').getTasks('2026-11-09');
 await expect(api.saveTasks({filePath:editable.filePath,dateStr:'2026-11-09',tasks:[{...a,text:'Stale edit'}],expectedRevision:editable.revision})).rejects.toThrow('409');
 expect(writes).toEqual(['r1']);expect(server.tasks.map(task=>task.id)).toEqual(['a','b']);
});
