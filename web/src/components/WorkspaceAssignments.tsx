import { useEffect, useState } from 'react'
import type { Auth, User } from '../cloudAccount'
import { DIANE_SHARED_ORIGIN, assertSharedNotebookOwner, requestJson } from '../cloudAccount'
import { api } from '../api'
import { canonical } from '../cloudSync'
import { chooseWorkspace, editorWorkspaces, selectedWorkspace, taskAssignment, type Membership } from '../suiteWorkspace'
import type { ExtractedTaskDate } from '../types'

export function WorkspaceAssignments({auth, user, flush}: {auth: Auth; user: User; flush: () => Promise<void>}) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Membership[]>([])
  const [days, setDays] = useState<ExtractedTaskDate[]>([])
  const [workspace, setWorkspace] = useState('')
  const [taskKey, setTaskKey] = useState('')
  const [member, setMember] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
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
    setBusy(true); setNotice(''); setMembers([]); setDays([]); setLoaded(false); setTaskKey('')
    try { setWorkspace(selectedWorkspace(user.uid)) }
    catch (error) { setWorkspace(''); setNotice(String(error)) }
    Promise.all([editorWorkspaces(request), flush().then(() => api.extractTaskApi({all:true,canonicalDates:true}))])
      .then(([rows, history]) => { if (!disposed) { setMembers(rows); setDays(history.dates); setLoaded(true) } })
      .catch(error => { if (!disposed) setNotice(String(error.message || error)) })
      .finally(() => { if (!disposed) setBusy(false) })
    return () => { disposed = true }
  }, [open, attempt, auth, user, flush])
  const tasks = days.flatMap(day => day.tasks.map(task => ({date:day.date,task,key:day.date + ':' + task.id}))).reverse()
  const selected = tasks.find(item => item.key === taskKey)
  const eligible = members.some(row => row.id === workspace)
  async function assign() {
    if (!selected || !eligible || busy) return
    setBusy(true); setNotice('')
    try {
      await flush()
      const history = await api.extractTaskApi({date: selected.date, canonicalDates: true})
      const latest = history.dates.find(day => day.date === selected.date)?.tasks.find(task => task.id === selected.task.id)
      if (!latest || canonical(latest) !== canonical(selected.task)) throw Error('This task changed. Refresh and select it again.')
      const draft = await taskAssignment(user.uid, workspace, selected.date, selected.task, member.trim())
      const receipt = await request(draft.path, {method:'PUT', body:JSON.stringify(draft.body)})
      if (receipt?.id !== draft.id || receipt?.workspaceId !== workspace) throw Error('Could not confirm the assignment. Retry with the same task.')
      setNotice('Assigned in Shiprite.')
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(false) }
  }
  return <details className="cloud-connection" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Workspace assignments</summary>
    <div className="assignment-fields">
    <label className="cloud-review-select">Workspace for assignments and AI usage<select disabled={busy} value={workspace} onChange={e => {
      try { chooseWorkspace(user.uid, e.target.value); setWorkspace(e.target.value); setMember(''); setNotice('') }
      catch (error) { setNotice(String(error)) }
    }}>
      <option value="">Personal account</option>
      {workspace && !eligible && <option value={workspace} disabled>{workspace} (check access)</option>}
      {members.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
    </select></label>
    {loaded && !members.length && <p className="cloud-sync-status">You need editor access to a workspace to assign tasks.</p>}
    {eligible && loaded && !tasks.length && <p className="cloud-sync-status">Add a task to your notebook to assign it.</p>}
    {eligible && tasks.length > 0 && <><label className="cloud-review-select">Task and steps<select value={taskKey} disabled={busy} onChange={e => setTaskKey(e.target.value)}>
      <option value="">Choose task</option>{tasks.map(row => <option key={row.key} value={row.key}>{row.date} · {row.task.text}</option>)}
    </select></label>
    <label className="cloud-review-select">Assignee UID (optional)<input maxLength={128} value={member} disabled={busy} onChange={e => setMember(e.target.value)}/></label>
    <button type="button" className="cloud-primary" disabled={busy || !selected} onClick={() => void assign()}>Assign in Shiprite</button></>}
    <button type="button" className="cloud-quiet" disabled={busy} onClick={() => setAttempt(n => n + 1)}>Refresh workspaces</button>
    </div>
    {notice && <p role="status">{notice}</p>}
  </details>
}
