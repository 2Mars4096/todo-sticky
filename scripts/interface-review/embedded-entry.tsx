import React from 'react';
import {createRoot} from 'react-dom/client';
import TodoPort from '../../plugin/dist/index.js';
import '../../plugin/dist/index.css';
import {setTestScope,pluginApi} from '../../plugin/dev/test-host-sdk/client';
import {TodoSettings} from '../../plugin/src/TodoSettings';
import {BackupTools} from '../../plugin/src/BackupTools';
import {PlanningSettings} from '../../plugin/src/PlanningSettings';
import {TodoDocument} from '../../plugin/src/TodoDocument';
import {TaskEditorBridge} from '../../plugin/src/TaskEditor';
import {TaskExecution} from '../../plugin/src/TaskExecution';

const query=new URLSearchParams(location.search), state=query.get('state')||'panel',tag=query.get('language')||'en';
document.documentElement.lang=tag;
const scope='synthetic-scope';setTestScope(state==='disconnected'?'':scope);
const noop=()=>{},empty=async()=>{},record={plugin_id:'todo',record_type:'task',record_id:'review-parent',revision:1,title:'Fixture note · 草稿',text:'Fixture note · 草稿',status:'todo',tags:[],attachments:[],relationships:[],extensions:{},created_at:'2026-11-21',updated_at:'2026-11-21'};
Object.assign(pluginApi,{settings:async()=>({enabled:true}),list:async()=>({items:[record]}),projects:async()=>[],workflows:async()=>({items:[]}),preparation:async()=>null,refreshPreparations:async()=>({items:[]}),workflow:async()=>null,export:async()=>({records:[]})});
const prefs={revision:1,machines:[],planningPreferences:{}};
const snapshot={path:'weekly/fixture.md',document:'fixture',content:'## Fixture\nFixture note · 草稿',normalized:'## Fixture\nFixture note · 草稿',revision:'1',projection:{token:'fixture',links:{},created:[],removed:[],initial:false},tasks:[],pending:state==='document-pending'};
const host={list:async()=>({documents:[snapshot.path]}),read:async()=>snapshot,preview:async(v:any)=>({...snapshot,content:v.content}),save:empty,reviewAgain:empty,recover:async()=>({...snapshot,expected:'1'})};
function DocEditor({content,onChange}:any){return <textarea aria-label="Fixture document editor" value={content} onChange={e=>onChange(e.target.value)}/>}
function Surface(){
 if(state.startsWith('document-'))return <TodoDocument scope={scope} host={state==='document-unavailable'?undefined:host} editor={DocEditor} onClose={noop} onSaved={empty}/>;
 if(state.startsWith('settings-'))return <TodoSettings machines={<PlanningSettings embedded scope={scope} value={prefs} onSaved={noop}/>} backups={<BackupTools embedded scope={scope} flush={empty} onChanged={empty} onOpenProject={noop} onPreferences={noop}/>}/>;
 if(state==='task-editor')return <TaskEditorBridge scope={scope} taskId={record.record_id} content={record.text} readOnly={false} onChange={noop} editor={DocEditor}/>;
 if(state==='task-execution')return <TaskExecution task={record as any} active={false} enabled={false}/>;
 return <TodoPort active={true} documentHost={host as any} documentEditor={DocEditor}/>;
}
createRoot(document.getElementById('mount')!).render(<main id="review-ready"><Surface/></main>);
