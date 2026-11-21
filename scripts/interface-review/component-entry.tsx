import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {GoalsSidebar} from 'review-components/GoalsSidebar';
import {DeadlineBadge} from 'review-components/TaskFinish';
import {ProjectPage} from 'review-components/ProjectPage';
import {ArchivePage} from 'review-components/ArchivePage';
import {AlbumRecommendations} from 'review-components/AlbumRecommendations';
import {ScheduleView} from 'review-components/ScheduleView';
import 'review-styles/sticky.css';
import 'review-styles/project-planning.css';
import 'review-styles/workflow.css';
import {setup} from 'review-initialize';
const q=new URLSearchParams(location.search),tag=q.get('language')||'en';document.documentElement.lang=tag;localStorage.setItem('pipedreams.displayLanguage',tag);
const state=q.get('state')||'project',noop=()=>{},empty=async()=>{},day='2026-11-21';
const id='fixture-project',description='Fixture project description';
const task={id:'review-parent',text:'Fixture linked work',status:'todo',subtasks:[],goalId:id,...(state==='search-deadline'?{finish:{by:'2026-12-03'}}:{})};
const actions=[{text:'Fixture estimated daily task',date:day,minutes:25}];
const initial={id,text:description,done:state==='closed-project',plan:[{id:'fixture-step',text:'Fixture project step'}]};
async function main(){
 await setup({id,description,task,actions,day,many:state.endsWith('-many')});
 function View(){
  const [goal,save]=useState(initial);
  if(state.startsWith('corrected-')){
   const n=Number(state.slice(-1)), items=Array.from({length:Math.max(1,n)},(_,i)=>({id:'fixture-'+i,text:'Synthetic '+i,done:n===0}));
   return <><GoalsSidebar collapsed={false} targets={items} recurring={items} onToggleCollapse={noop} onAddGoal={noop} onUpdateGoal={noop} onDeleteGoal={noop} onToggleGoal={noop}/>
    <div data-badges>{['2026-12-12','2026-11-21','2026-11-20','2026-11-19'].map(date=><DeadlineBadge key={date} by={date} closed={false} onClick={noop}/>)}
      <DeadlineBadge by="2026-12-12" closed={true} onClick={noop}/></div></>
  }
  if(state==='albums'||state==='albums-loading'||state==='albums-empty')return <AlbumRecommendations loading={state==='albums-loading'} result={state==='albums'?{summary:'Fixture selection',albums:[{title:'Fixture album',artist:'Fixture artist',year:'2026',genre:'Fixture genre',fit:'Fixture reason',bestFor:'Fixture task'}]}:null} providerLabel="Fixture provider" onClose={noop} onRegenerate={noop}/>;
  if(state.startsWith('search')||state.startsWith('progress'))return <ArchivePage goals={[goal]} folder={location.search.includes("embedded")?"synthetic-scope":"Browser notebook"} mode={state.startsWith('progress')?'progress':'search'} date={day} missions={[]} flush={empty} onBack={noop} onOpen={empty}/>;
  if(state==='plan')return <ScheduleView date={day} tasks={[{...task,todaySubtasks:[],otherSubtasks:[]}]} tasksLoading={false} machines={[]} onApply={noop} onClose={noop}/>;
  return <ProjectPage goalId={state==='missing-project'?'absent':id} goals={[goal]} folder={location.search.includes("embedded")?"synthetic-scope":"Browser notebook"} flush={empty} getGoal={key=>key===id?goal:undefined} saveGoal={(_,next)=>save(next)} reloadTasks={empty} onWriting={noop} registerLeaveGuard={noop} onBack={noop} onOpen={empty}/>;
 }
 createRoot(document.querySelector('#mount')!).render(<main id="review-ready"><View/></main>);
}
void main();
