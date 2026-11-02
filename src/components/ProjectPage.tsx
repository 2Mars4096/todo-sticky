import { useEffect, useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import { api } from '../api'
import { aiErrorMessage } from '../aiErrors'
import { readTaskArchive } from '../taskArchiveReader'
import { archiveRows, type ArchiveRow } from '../taskArchive'
import { canonical } from '../cloudSync'
import { beginProjectOperation, discardProjectOperation, pendingProject, resumeProjectOperation } from '../projectStorage'
import { linkedStepRows, newProjectId, parseProjectActions, projectFingerprint, projectProgress, projectUnits, removeStepOperation, reviseProjectTask, scheduledOperation, validateGoalPlan, validateProjectActions, validateProjectWindow, type ProjectAction, type ProjectOperation, type ProjectWindow } from '../projectPlanning'
import type { ExtractedTaskDate, GoalItem } from '../types'
import '../styles/project-planning.css'
interface Props {
  goalId: string
  goals: GoalItem[]
  folder: string
  flush: () => Promise<void>
  getGoal: (id:string)=>GoalItem|undefined
  saveGoal: (before:GoalItem,after:GoalItem)=>void
  reloadTasks: () => Promise<void>
  onBack: () => void
  onOpen: (row:ArchiveRow)=>Promise<void>
  onWriting: (busy:boolean)=>void
  registerLeaveGuard: (guard:(()=>boolean)|null)=>void
}
const today = () => format(new Date(),'yyyy-MM-dd')
export function ProjectPage({goalId,goals,folder,flush,getGoal,saveGoal,reloadTasks,onBack,onOpen,onWriting,registerLeaveGuard}:Props) {
  const goal=goals.find(goal=>goal.id===goalId)
  const [dates,setDates]=useState<ExtractedTaskDate[]>([])
  const [loadFailed,setLoadFailed]=useState(false)
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const [writing,setWriting]=useState(false)
  const [revision,setRevision]=useState(0),[pending,setPending]=useState<ProjectOperation|null>(null)
  const [text,setText]=useState(''),[selected,setSelected]=useState<string[]>([]),[date,setDate]=useState(today)
  const [remove,setRemove]=useState<string|null>(null)
  const [leaveBlocked,setLeaveBlocked]=useState(false)
  const editInput=useRef<HTMLTextAreaElement>(null)
  const editFocus=useRef('description'),restoreFocus=useRef(false)
  const [edit,setEdit]=useState<{kind:'description'|'step'|'task';id?:string;row?:ArchiveRow;date?:string;before:GoalItem;text:string;original:string}|null>(null)
  const [mode,setMode]=useState<'steps'|'schedule'|null>(null)
  const [window,setWindow]=useState<ProjectWindow>(()=>({from:today(),until:format(addDays(new Date(),6),'yyyy-MM-dd'),minutesPerDay:60,weekdaysOnly:false}))
  const [proposal,setProposal]=useState<{mode:'steps'|'schedule';stamp:string;window:ProjectWindow;actions:ProjectAction[]}|null>(null)
  const [limit,setLimit]=useState(40)
  const alive=useRef(true),actionLock=useRef(false),heading=useRef<HTMLHeadingElement>(null),resultHeading=useRef<HTMLHeadingElement>(null)
  const latest=useRef({flush,getGoal,saveGoal,reloadTasks,onWriting});latest.current={flush,getGoal,saveGoal,reloadTasks,onWriting}
  const canLeave=()=>{if(pending||!goal)return true;if(edit&&(edit.text!==edit.original||edit.date!==edit.row?.date)){setLeaveBlocked(true);editInput.current?.focus();return false}return true}
  useEffect(()=>{registerLeaveGuard(canLeave);return()=>registerLeaveGuard(null)},[edit,pending,goal,registerLeaveGuard])
  useEffect(()=>{alive.current=true;heading.current?.focus();return()=>{alive.current=false}},[])
  useEffect(()=>{
    let cancelled=false
    setLoading(true);setLoadFailed(false);setError('')
    void (async()=>{
      try {
        setPending(pendingProject(folder))
        await latest.current.flush()
        const data=await readTaskArchive(folder)
        if(data.unavailableFiles?.length)throw new Error('Some task dates are unavailable. Retry after they are downloaded.')
        if(!cancelled)setDates(data.dates)
      } catch(cause){if(!cancelled){setLoadFailed(true);setError(aiErrorMessage(cause,'Could not load project work.'))}}
      finally{if(!cancelled)setLoading(false)}
    })()
    return()=>{cancelled=true}
  },[folder,revision])
  useEffect(()=>{if(proposal){resultHeading.current?.scrollIntoView({block:'start'});resultHeading.current?.focus({preventScroll:true})}},[Boolean(proposal)])
  const rows=archiveRows(dates,goals),progress=goal?projectProgress(goal,rows):null
  const work=projectUnits(rows,goalId)
  const stale=proposal && goal && (proposal.stamp!==projectFingerprint(goal,dates) || proposal.mode==='schedule' && canonical(proposal.window)!==canonical(window))
  const disabled=busy||loading||!goal||goal.done||Boolean(pending)||loadFailed
  const editingNow=Boolean(edit)
  const fail=(cause:unknown)=>setError(aiErrorMessage(cause,'Could not save this change.'))
  useEffect(()=>{if(!edit&&!busy&&!loading&&restoreFocus.current){restoreFocus.current=false;requestAnimationFrame(()=>{(document.querySelector<HTMLElement>(`[data-project-edit="${CSS.escape(editFocus.current)}"]`)??heading.current)?.focus()})}},[edit,busy,loading])
  const refresh=()=>{setLoading(true);setRevision(value=>value+1);setProposal(null)}
  const fresh=async()=>{
    await latest.current.flush()
    const data=await readTaskArchive(folder)
    if(data.unavailableFiles?.length)throw new Error('Some task dates are unavailable. No new tasks were scheduled.')
    return data.dates
  }
  const run=async(action:()=>Promise<void>,write=true)=>{
    if(actionLock.current)return
    actionLock.current=true;setBusy(true);setWriting(write);setError('');if(write)latest.current.onWriting(true)
    try{await action()}catch(cause){if(alive.current)fail(cause)}
    finally{actionLock.current=false;if(write)latest.current.onWriting(false);if(alive.current){setBusy(false);setWriting(false);try{setPending(pendingProject(folder))}catch(cause){fail(cause)}}}
  }
  const commit=async(operation:ProjectOperation)=>{
    beginProjectOperation(operation)
    await resumeProjectOperation(folder,latest.current.getGoal,latest.current.saveGoal)
    await latest.current.reloadTasks()
    if(alive.current){setSelected([]);setRemove(null);setProposal(null);setMode(null);refresh()}
  }
  const startEdit=(kind:'description'|'step'|'task',value:string,id?:string,row?:ArchiveRow)=>{
    if(!goal||disabled)return
    if(!canLeave())return
    setLeaveBlocked(false)
    editFocus.current=kind==='task'?`task:${row!.date}:${row!.task.id}`:kind==='step'?`step:${id}`:'description'
    setEdit({kind,id,row,date:row?.date,before:goal,text:value,original:value});setError('')
  }
  const cancelEdit=()=>{restoreFocus.current=true;setEdit(null);setLeaveBlocked(false);setError('');if(error)refresh()}
  const saveEdit=()=>run(async()=>{
    if(!edit)return
    const current=getGoal(goalId)
    if(!current||current.done||canonical(current)!==canonical(edit.before))throw new Error('The project changed while you were editing. Cancel and reopen the editor to see the latest version.')
    if(edit.kind==='description')saveGoal(edit.before,{...current,text:edit.text.trim()})
    else {
      const source=await fresh()
      if(canonical(getGoal(goalId))!==canonical(edit.before))throw new Error('The project changed. Cancel and reopen this edit.')
      if(edit.kind==='step'){
        if(linkedStepRows(current,edit.id!,archiveRows(source,goals)).length)throw new Error('This step was scheduled while you were editing. Open its daily task to revise it.')
        if(!current.plan?.some(step=>step.id===edit.id))throw new Error('This step was removed.')
        saveGoal(edit.before,{...current,plan:current.plan.map(step=>step.id===edit.id?{...step,text:edit.text.trim()}:step)})
      } else await commit(reviseProjectTask(folder,current,source,edit.row!,edit.text,edit.date))
    }
    if(alive.current){if(edit.kind==='task')editFocus.current=`task:${edit.date}:${edit.row!.task.id}`;restoreFocus.current=true;setEdit(null);setLeaveBlocked(false);setError('')}
  })
  const editor=(label:string)=><div className="project-inline-editor">
    <textarea ref={editInput} autoFocus aria-label={label} value={edit?.text??''} disabled={busy||Boolean(pending)} onChange={event=>setEdit(current=>current?{...current,text:event.target.value}:null)}
      onKeyDown={event=>{if(event.nativeEvent.isComposing||pending)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelEdit()}else if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();void saveEdit()}}}/>
    {edit?.kind==='task'&&!edit.row?.parents.length&&<label className="project-edit-date">Work date<input type="date" aria-label="Work date" value={edit.date} disabled={busy||Boolean(pending)} onChange={event=>setEdit(current=>current?{...current,date:event.target.value}:null)}/></label>}
    {leaveBlocked&&<p className="project-edit-notice" role="status">Save or cancel this edit first.</p>}
    <div className="project-editor-actions"><button disabled={busy||Boolean(pending)||!edit?.text.trim()} onClick={()=>void saveEdit()}>Save</button><button disabled={busy||Boolean(pending)} onClick={cancelEdit}>Cancel</button></div>
  </div>
  const leave=()=>{if(canLeave())onBack()}
  const addSteps=(texts:string[],expected=goal)=>{
    if(!expected)return
    if(texts.some(value=>!value.trim()||value.length>5000))throw new Error('Each step needs 1–5,000 characters.')
    const known=new Set(expected.plan?.map(step=>step.text.trim())??[])
    const additions=texts.map(value=>value.trim()).filter(value=>{if(!value||known.has(value))return false;known.add(value);return true})
      .map(value=>({id:newProjectId(),text:value}))
    const after={...expected,plan:[...(expected.plan??[]),...additions]}
    validateGoalPlan(after.plan);saveGoal(expected,after)
  }
  const suggest=(kind:'steps'|'schedule')=>run(async()=>{
    const source=await fresh(),current=getGoal(goalId)
    if(!current||current.done)throw new Error('Reopen this project before planning.')
    if(kind==='schedule')validateProjectWindow(window)
    const stamp=projectFingerprint(current,source),sourceRows=archiveRows(source,goals)
    const relevant=sourceRows.filter(row=>(row.goalId===current.id&&row.parentGoalId!==current.id)||(kind==='schedule'&&!row.parents.length&&row.date>=window.from&&row.date<=window.until))
    const raw=await api.llmProjectPlan({mode:kind,goal:current,window,tasks:relevant.slice(0,500).map(row=>({date:row.date,text:row.task.text,status:row.task.status,finish:row.task.finish,goalId:row.goalId})),contextTruncated:relevant.length>500,scheduledStepIds:(current.plan??[]).filter(step=>linkedStepRows(current,step.id,sourceRows).length).map(step=>step.id)})
    if(!alive.current)return
    if(canonical(getGoal(goalId))!==canonical(current))throw new Error('The project changed. Generate a fresh proposal.')
    let actions:ProjectAction[]
    if(kind==='steps'){
      const steps=(raw as {steps?:unknown})?.steps
      if(!Array.isArray(steps)||!steps.length||steps.length>30||steps.some(step=>typeof step!=='string'||!step.trim()||step.length>5000))throw new Error('The provider returned no usable steps.')
      actions=steps.map(step=>({id:newProjectId(),text:step,date:today(),minutes:30}))
    }else{actions=parseProjectActions(raw);validateProjectActions(actions,current,sourceRows,window)}
    setDates(source);setMode(kind);setProposal({mode:kind,stamp,window:{...window},actions})
  },false)
  const applyProposal=()=>run(async()=>{
    if(!proposal)return
    const source=await fresh(),current=getGoal(goalId)
    if(!current||current.done||projectFingerprint(current,source)!==proposal.stamp || proposal.mode==='schedule' && canonical(window)!==canonical(proposal.window))throw new Error('Project or daily work changed. Generate a fresh proposal.')
    if(proposal.mode==='steps'){addSteps(proposal.actions.map(action=>action.text),current);setProposal(null);setMode(null)}
    else{validateProjectActions(proposal.actions,current,archiveRows(source,goals),proposal.window);await commit(scheduledOperation(folder,current,source,proposal.actions))}
  })
  return <section className="archive-page project-page" aria-label="Project" onKeyDown={event=>{if(event.key==='Escape'&&!writing){event.stopPropagation();if(pending){leave()}else if(edit){cancelEdit()}else if(proposal){setProposal(null)}else if(mode)setMode(null);else leave()}}}>
    <header className="archive-heading"><button disabled={writing} onClick={leave}>‹ Goals</button><h2 ref={heading} tabIndex={-1}>{goal?.text.split('\n')[0]||'Project'}</h2>
      <button disabled={busy||loading||editingNow} onClick={refresh} title="Refresh project" aria-label="Refresh project">↻</button></header>
    <div className="archive-scroll project-body">
      {!goal?<p>This project was removed.</p>:<>
        {edit?.kind==='description'?editor('Project title and description')
          :<div className="project-description"><p>{goal.text.split('\n')[0].length>45 ? goal.text : goal.text.split('\n').slice(1).join('\n')}</p><button disabled={disabled} onClick={()=>startEdit('description',goal.text)} data-project-edit="description" aria-label="Edit project description" title="Edit project">✎</button></div>}
        {loading&&<p role="status">Loading project…</p>}
        {error&&<p className="workflow-error" role="alert">{error}</p>}
        {pending&&<div className="project-recovery"><p>Pending save for {pending.after.text.split('\n')[0]}. Saved tasks and steps will remain.</p>
          <button disabled={busy} onClick={()=>void run(async()=>{await resumeProjectOperation(folder,getGoal,saveGoal);await reloadTasks();setEdit(null);setLeaveBlocked(false);setMode(null);setSelected([]);setRemove(null);refresh()})}>Retry save</button>
          <button disabled={busy} onClick={()=>{discardProjectOperation(folder);setPending(null);setEdit(null);setLeaveBlocked(false);refresh()}}>Discard remaining</button></div>}
        {goal.done&&<p>Project completed. Reopen it in Goals to edit.</p>}
        {!mode&&<>
          <div className="project-toolbar"><span>{progress?.completed}/{progress?.total} steps</span><button disabled={disabled||editingNow} onClick={()=>void suggest('steps')}>Suggest steps</button><button disabled={disabled||editingNow} onClick={()=>{setMode('schedule');setProposal(null)}}>Plan across days</button></div>
          <form className="project-add" onSubmit={event=>{event.preventDefault();try{addSteps([text]);setText('');setError('')}catch(cause){fail(cause)}}}>
            <textarea rows={1} aria-label="New project step" placeholder="Add a step" disabled={disabled||editingNow} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(!event.nativeEvent.isComposing&&event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();event.currentTarget.form?.requestSubmit()}}}/>
            <button disabled={disabled||editingNow||!text.trim()}>Add</button>
          </form>
          <ul className="project-steps">{progress?.steps.map(({step,work:linked,done})=><li key={step.id}>
            <div className="project-step-line"><input type="checkbox" aria-label={`${linked.length?(done?'Completed':'Scheduled'):'Schedule'} ${linked.length===1?linked[0].task.text:step.text}`} checked={linked.length?done:selected.includes(step.id)} disabled={disabled||editingNow||Boolean(linked.length)} onChange={event=>setSelected(ids=>event.target.checked?[...ids,step.id]:ids.filter(id=>id!==step.id))}/>
              {edit?.kind==='step'&&edit.id===step.id?editor('Edit project step'):<span className={done?'project-done':''}>{linked.length===1?linked[0].task.text:step.text}</span>}
              {!linked.length&&!(edit?.kind==='step'&&edit.id===step.id)&&<button disabled={disabled} data-project-edit={`step:${step.id}`} aria-label={`Edit ${step.text}`} title="Edit step" onClick={()=>startEdit('step',step.text,step.id)}>✎</button>}
              <button disabled={disabled||editingNow} title="Remove step" aria-label={`Remove ${linked.length===1?linked[0].task.text:step.text}`} onClick={()=>setRemove(step.id)}>×</button>
            </div>
            {linked.map(row=><div className="project-scheduled-row" key={`${row.date}:${row.task.id}`}>
              {edit?.kind==='task'&&edit.row?.date===row.date&&edit.row.task.id===row.task.id?editor('Edit scheduled task'):<>
                {linked.length>1&&<span className="project-fragment-text">{row.task.text}</span>}
                <button className="project-work-link" disabled={busy||editingNow} onClick={()=>void onOpen(row).catch(fail)}>{row.date} · {row.task.status==='done'?'Completed':row.task.status==='stopped'?'Stopped':'Open task'}</button>
                <button disabled={disabled} title="Edit scheduled task" data-project-edit={`task:${row.date}:${row.task.id}`} aria-label={`Edit scheduled task ${row.task.text} on ${row.date}`} onClick={()=>startEdit('task',row.task.text,undefined,row)}>✎</button>
              </>}
            </div>)}
            {remove===step.id&&<div className="project-remove"><p>Remove this step? Its daily tasks stay in the project.</p><button disabled={busy} onClick={()=>void run(async()=>{const source=await fresh();const current=getGoal(goalId);if(!current||canonical(current)!==canonical(goal))throw new Error('The project changed. Refresh before removing this step.');await commit(removeStepOperation(folder,current,source,step.id))})}>Remove step</button><button onClick={()=>setRemove(null)}>Keep</button></div>}
          </li>)}</ul>
          {work.length>0&&<details className="project-linked"><summary>Daily work ({work.length})</summary><ul className="archive-results">{work.slice(0,limit).map(row=><li key={`${row.date}:${row.task.id}`}><button disabled={busy||editingNow} onClick={()=>void onOpen(row).catch(fail)}><span>{row.task.text}</span><span className="archive-meta">{row.date} · {row.task.status==='done'?'Completed':row.task.status==='stopped'?'Stopped':'Open'}</span></button></li>)}</ul>{work.length>limit&&<button onClick={()=>setLimit(value=>value+40)}>Show more</button>}</details>}
        </>}
        {mode==='schedule'&&<>
          <div className="project-toolbar"><button disabled={busy} onClick={()=>{setMode(null);setProposal(null)}}>‹ Steps</button></div>
          <div className="project-window"><label>From<input type="date" value={window.from} disabled={busy} onChange={event=>setWindow({...window,from:event.target.value})}/></label><label>Until<input type="date" value={window.until} disabled={busy} onChange={event=>setWindow({...window,until:event.target.value})}/></label>
            <label>Project time<select value={window.minutesPerDay} disabled={busy} onChange={event=>setWindow({...window,minutesPerDay:Number(event.target.value)})}>{[15,30,60,90,120,180,240,480].map(n=><option key={n} value={n}>{n} min/day</option>)}</select></label>
            <label className="project-weekdays"><input type="checkbox" checked={window.weekdaysOnly} disabled={busy} onChange={event=>setWindow({...window,weekdaysOnly:event.target.checked})}/>Weekdays only</label></div>
          <button disabled={busy||loading||Boolean(pending)} onClick={()=>void suggest('schedule')}>{proposal?'Generate again':'Generate proposal'}</button>
        </>}
        {busy&&<p role="status">Working…</p>}
        {proposal&&<section className="project-proposal"><h3 ref={resultHeading} tabIndex={-1}>Proposed {proposal.mode==='steps'?'steps':'tasks'}</h3>
          {proposal.actions.map((action,index)=><div className="project-proposal-row" key={action.id}><textarea aria-label={`Proposed task ${index+1}`} value={action.text} disabled={busy} onChange={event=>setProposal({...proposal,actions:proposal.actions.map(item=>item.id===action.id?{...item,text:event.target.value}:item)})}/>
            {proposal.mode==='schedule'&&<div className="project-proposal-fields"><label>Date<input type="date" value={action.date} disabled={busy} onChange={event=>setProposal({...proposal,actions:proposal.actions.map(item=>item.id===action.id?{...item,date:event.target.value}:item)})}/></label><label>Minutes<input type="number" min={5} max={window.minutesPerDay} value={action.minutes} disabled={busy} onChange={event=>setProposal({...proposal,actions:proposal.actions.map(item=>item.id===action.id?{...item,minutes:Number(event.target.value)}:item)})}/></label></div>}
            <button disabled={busy} aria-label={`Remove proposed task ${index+1}`} onClick={()=>setProposal({...proposal,actions:proposal.actions.filter(item=>item.id!==action.id)})}>Remove</button></div>)}
          {stale&&<p role="status" className="workflow-error">Project or planning details changed. Generate a fresh proposal.</p>}
        </section>}
      </>}
    </div>
    {goal&&<footer className="project-footer">
      {proposal?<><button disabled={busy} onClick={()=>{setProposal(null);setMode(null)}}>Discard</button><button disabled={busy||Boolean(stale)||!proposal.actions.length} onClick={()=>void applyProposal()}>{proposal.mode==='steps'?'Add steps':'Add to daily tasks'}</button></>
        :!mode&&selected.length>0?<><input type="date" aria-label="Schedule date" value={date} disabled={busy} onChange={event=>setDate(event.target.value)}/><button disabled={disabled||editingNow} onClick={()=>void run(async()=>{const source=await fresh(),current=getGoal(goalId);if(!current||canonical(current)!==canonical(goal))throw new Error('The project changed. Select steps again.');const actions=selected.map(id=>{const step=current.plan?.find(step=>step.id===id);if(!step)throw new Error('A selected step was removed.');return {id,stepId:id,text:step.text,date,minutes:30}});validateProjectActions(actions,current,archiveRows(source,goals));await commit(scheduledOperation(folder,current,source,actions))})}>Add to daily tasks ({selected.length})</button></>:null}
    </footer>}
  </section>
}
