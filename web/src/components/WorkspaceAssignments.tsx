import { ui } from '../interfaceLocale'
import { AssignmentEntry } from '../assignmentEntry'
import { useContext, useEffect, useRef, useState } from 'react'
import { archiveRows } from '../taskArchive'
import { SuiteLink } from './SuiteLink'
import type { Auth, User } from '../cloudAccount'
import { DIANE_SHARED_ORIGIN, assertSharedNotebookOwner, requestJson } from '../cloudAccount'
import { api } from '../api'
import { canonical } from '../cloudSync'
import { assignmentReceipt, assignmentTaskSelection, chooseWorkspace, editorWorkspaces, selectedWorkspace, taskAssignment, type Membership } from '../suiteWorkspace'
import type { ExtractedTaskDate } from '../types'

export function WorkspaceAssignments({auth, user, flush}: {auth: Auth; user: User; flush: () => Promise<void>}) {
  const entry = useContext(AssignmentEntry)
  const [open, setOpen] = useState(Boolean(entry?.requested))
  const [members, setMembers] = useState<Membership[]>([])
  const [days, setDays] = useState<ExtractedTaskDate[]>([])
  const [workspace, setWorkspace] = useState(() => { try { return selectedWorkspace(user.uid) } catch { return '' } })
  const [selectionInvalid, setSelectionInvalid] = useState(false)
  const [taskKey, setTaskKey] = useState('')
  const [member, setMember] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const locked = useRef(false)
  const [receipt, setReceipt] = useState<ReturnType<typeof assignmentReceipt>>()
  const sectionView = useRef<HTMLDetailsElement>(null)
  useEffect(() => { if (entry?.requested) setOpen(true) }, [entry?.requested])
  useEffect(() => {
    if (loaded && entry?.requested) {
      sectionView.current?.scrollIntoView({block: 'nearest'})
      sectionView.current?.focus({preventScroll: true})
    }
  }, [loaded, entry?.requested])
  const receiptView = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (receipt) receiptView.current?.focus()
  },[receipt])
  const [attempt, setAttempt] = useState(0)
  const request = async (path: string, options: RequestInit = {}) => {
    assertSharedNotebookOwner(auth, user)
    const token = await user.getIdToken()
    assertSharedNotebookOwner(auth, user)
    const value = await requestJson(DIANE_SHARED_ORIGIN, path, options, token)
    assertSharedNotebookOwner(auth, user)
    return value
  }
  useEffect(() => {
    if (!open) return
    let disposed = false
    setBusy(true); setNotice(''); setReceipt(undefined); setMember(''); setMembers([]); setDays([]); setLoaded(false); setTaskKey('')
    try { setWorkspace(selectedWorkspace(user.uid)); setSelectionInvalid(false) }
    catch (error) { setWorkspace(''); setSelectionInvalid(true); setNotice(String(error)) }
    Promise.all([editorWorkspaces(request), flush().then(() => api.extractTaskApi({all:true,canonicalDates:true}))])
      .then(([rows, history]) => { if (!disposed) { setMembers(rows); setDays(history.dates); setTaskKey(assignmentTaskSelection(archiveRows(history.dates).map(row => row.date + ':' + row.task.id), entry?.requested)); setLoaded(true) } })
      .catch(error => { if (!disposed) setNotice(String(error.message || error)) })
      .finally(() => { if (!disposed) setBusy(false) })
    return () => { disposed = true }
  }, [open, attempt, auth, user, flush,entry?.requested])
  const tasks = archiveRows(days).map(row => ({...row,key:row.date + ':' + row.task.id}))
  const selected = tasks.find(item => item.key === taskKey)
  const eligible = members.some(row => row.id === workspace)
  async function assign(statusOnly = false) {
    if (!selected || !eligible || busy || locked.current) return
    locked.current = true
    setBusy(true); setNotice(''); setReceipt(undefined)
    try {
      await flush()
      const history = await api.extractTaskApi({date: selected.date, canonicalDates: true})
      const latest = archiveRows(history.dates).find(row => row.date === selected.date && row.task.id === selected.task.id)?.task
      if (!latest || canonical(latest) !== canonical(selected.task)) throw Error(ui("This task changed. Refresh and select it again."))
      const draft = await taskAssignment(user.uid, workspace, selected.date, selected.task, member.trim())
      if (selectedWorkspace(user.uid) !== workspace) throw Error(ui("Workspace changed. Select your task again."))
      const response = statusOnly ? await request(draft.path + '/' + draft.id + '/receipt')
        : await request(draft.path, {method:'POST', body:JSON.stringify(draft.body)})
      if (selectedWorkspace(user.uid) !== workspace) throw Error(ui("Workspace changed. Check status in the original workspace."))
      setReceipt(assignmentReceipt(response,draft.id,workspace))
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)) }
    finally { locked.current = false; setBusy(false) }
  }
  return <details ref={sectionView} tabIndex={-1} open={open} className="cloud-connection" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary className="assignment-summary">{ui("Assign in Shiprite")}{workspace && <span> · {members.find(row => row.id === workspace)?.name || workspace}</span>}</summary>
    <div className="assignment-fields">
    {selectionInvalid && <button type="button" disabled={busy} onClick={() => {
      try { chooseWorkspace(user.uid, ''); setWorkspace(''); setSelectionInvalid(false); setNotice('') }
      catch (error) { setNotice(String(error)) }
    }}>{ui("Clear selection")}</button>}
    {(members.length > 0 || workspace) && <label className="cloud-review-select">{ui("Workspace for assignments and AI usage")}<select disabled={busy} value={workspace} onChange={e => {
      try { chooseWorkspace(user.uid, e.target.value); setWorkspace(e.target.value); setTaskKey(assignmentTaskSelection(tasks.map(row => row.key), entry?.requested)); setReceipt(undefined); setMember(''); setNotice('') }
      catch (error) { setNotice(String(error)) }
    }}>
      <option value="">{ui("Personal account")}</option>
      {workspace && !eligible && <option value={workspace} disabled>{ui("{0} (check access)", [workspace])}</option>}
      {members.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
    </select></label>}
    {loaded && !members.length && <p className="cloud-sync-status">{ui("You need editor access to a workspace to assign tasks.")}</p>}
    {eligible && loaded && !tasks.length && <p className="cloud-sync-status">{ui("Add a task to your notebook to assign it.")}</p>}
    {eligible && tasks.length > 0 && <>{tasks.length > 1 || !selected ? <label className="cloud-review-select">{ui("Task and steps")}<select value={taskKey} disabled={busy} onChange={e => { setTaskKey(e.target.value); setReceipt(undefined); setNotice('') }}>
      <option value="">{ui("Choose task")}</option>{tasks.map(row => <option key={row.key} value={row.key}>{row.date} · {row.task.text}</option>)}
    </select></label> : null}
    {selected && <div className="assignment-preview">
      <div>{selected.task.text}</div>
      {selected.task.subtasks.length > 0 && <details><summary>{ui("Included steps")}</summary><StepList items={selected.task.subtasks}/></details>}
      <small>{ui("Visible to members of {0}. {1}", [members.find(row => row.id === workspace)?.name, member.trim() ? ui("The recipient needs editor access.") : ui("Any editor can start this assignment.")])}</small>
    </div>}
    <label className="cloud-review-select">{ui("Assignee UID (optional)")}<input maxLength={128} value={member} disabled={busy} onChange={e => { setMember(e.target.value); setReceipt(undefined); setNotice('') }}/></label>
    <div className="assignment-actions"><button type="button" className="cloud-primary" disabled={busy || !selected} onClick={() => void assign()}>{ui("Assign in Shiprite")}</button>
      <button type="button" className="cloud-quiet" disabled={busy || !selected} onClick={() => void assign(true)}>{ui("Check status")}</button></div></>}
    {receipt && <div className="assignment-receipt" ref={receiptView} tabIndex={-1} role="status"><strong>{ui(receipt.label)}</strong> <span>{ui("Revision {0}", [receipt.revision])}</span>
      <SuiteLink destination="shiprite" href={receipt.url}>{ui("Open in Shiprite")}</SuiteLink></div>}
    <button type="button" className="cloud-quiet" disabled={busy} onClick={() => setAttempt(n => n + 1)}>{ui("Refresh workspaces")}</button>
    </div>
    {notice && <p role="status">{notice}</p>}
  </details>
}

function StepList({items}: {items: ExtractedTaskDate['tasks']}) {
  return <ul>{items.map(task => <li key={task.id}>{task.text}{task.subtasks.length > 0 && <StepList items={task.subtasks}/>}</li>)}</ul>
}
