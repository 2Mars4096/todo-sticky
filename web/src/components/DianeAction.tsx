import { open as chooseDirectory } from '@tauri-apps/plugin-dialog'
import { suggestDianeSetup } from '../dianePreparation'
import { suggestWorkspace } from '../dianeWorkspace'
import { createPortal } from 'react-dom'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { dianeRequest, readDianeReceipts, statusLabels, type DianeDispatch, type DianeProjects, type DianeReceipt, type DianeResult } from '../diane'

const STORAGE = 'sticky-todo-diane-v1'
type Entries = Record<string, DianeReceipt>
interface Context {
  entries: Entries
  connected: boolean
  date: string
  projects: DianeProjects['projects']
  chooseFolder: () => Promise<DianeProjects['projects'][number] | undefined>
  storageError: string
  busy: Set<string>
  keyFor: (id: string, sourceDate?: string) => string
  run: (key: string, text: string, parent: string, steps: string[], projectId: string) => Promise<void>
  action: (key: string, action: 'open' | 'stop' | 'retry') => Promise<void>
}
const DianeContext = createContext<Context | null>(null)

export function DianeProvider({ enabled = false, children, date, kbPath }: { enabled?: boolean; children: ReactNode; date: string; kbPath: string }) {
  return enabled ? <ConnectedDianeProvider date={date} kbPath={kbPath}>{children}</ConnectedDianeProvider> : <DianeContext.Provider value={null}>{children}</DianeContext.Provider>
}

function ConnectedDianeProvider({ children, date, kbPath }: { children: ReactNode; date: string; kbPath: string }) {
  const [entries, setEntries] = useState<Entries>({})
  const saved = useRef<Entries>({})
  const [storageError, setStorageError] = useState('Loading Diane links')
  const [projects, setProjects] = useState<DianeProjects>()
  const locks = useRef(new Set<string>())
  const [busy, setBusy] = useState(new Set<string>())
  const chooseFolder = async () => {
    if (!projects) return
    const root = await chooseDirectory({directory:true,multiple:false,title:'Choose Diane workspace'})
    if(typeof root !== 'string')return
    const known=projects?.projects.find(p=>p.root.replace(/\/$/,'')===root.replace(/\/$/,''))
    if(known)return known
    const data=await dianeRequest<DianeProjects>('choose-project',undefined,{root})
    setProjects(data)
    const selected=data.projects.find(p=>p.id===data.selected_project_id)||data.projects.find(p=>p.root.replace(/\/$/,'')===root.replace(/\/$/,''))
    if(!selected)throw Error('Open this folder in Diane, then choose it here.')
    return selected
  }
  const persist = (next: Entries) => {
    try { localStorage.setItem(STORAGE, JSON.stringify(next)) }
    catch { setStorageError('Cannot save Diane links. Free local storage before dispatching.'); throw Error('Cannot save Diane links') }
    saved.current = next
    setEntries(next)
  }
  const update = (key: string, value: DianeReceipt) => persist({ ...saved.current, [key]: value })
  useEffect(() => {
    let disposed = false
    try {
      const parsed = readDianeReceipts(localStorage.getItem(STORAGE))
      saved.current = parsed; setEntries(parsed); setStorageError('')
    } catch {
      setStorageError('Saved Diane links could not be read. Todo remains available; open Diane for existing sessions.')
      return // Preserve unreadable receipts; never replace them with an empty poll result.
    }
    const poll = async () => {
      try { const data = await dianeRequest<DianeProjects>('projects'); if (!disposed) setProjects(data) }
      catch (error) {
        if (!disposed) {
          setProjects(undefined)
          try { persist(Object.fromEntries(Object.entries(saved.current).map(([key, receipt]) => [key, locks.current.has(key) ? receipt : { ...receipt, error: String(error) }]))) } catch { /* Keep saved links. */ }
        }
        return
      }
      for (const [key, receipt] of Object.entries(saved.current)) {
        if (disposed || locks.current.has(key)) continue
        try {
          const result = await dianeRequest<DianeResult>('status', receipt.request.request_id)
          if (!disposed && !locks.current.has(key)) update(key, { ...saved.current[key], result, error: undefined, checkedAt: new Date().toISOString() })
        } catch (error) {
          if (!disposed && !locks.current.has(key)) {
            try { update(key, { ...saved.current[key], error: String(error) }) } catch { /* Keep the existing link in memory. */ }
          }
        }
      }
    }
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => { await poll(); if (!disposed) timer = setTimeout(tick, 5000) }
    void tick()
    return () => { disposed = true; clearTimeout(timer) }
  }, [])

  const exclusive = async (key: string, work: () => Promise<void>) => {
    if (locks.current.has(key)) return
    locks.current.add(key); setBusy(new Set(locks.current))
    try { await work() }
    catch (error) {
      const receipt = saved.current[key]
      if (receipt) { try { update(key, { ...receipt, error: String(error) }) } catch { /* Storage message is already visible. */ } }
    } finally { locks.current.delete(key); setBusy(new Set(locks.current)) }
  }
  const send = async (key: string) => {
    const receipt = saved.current[key]
    const result = await dianeRequest<DianeResult>('dispatch', undefined, receipt.request)
    update(key, { ...receipt, result, error: undefined, checkedAt: new Date().toISOString() })
  }
  const run = (key: string, text: string, parent: string, steps: string[], projectId: string) => exclusive(key, async () => {
    const project=projects?.projects.find(item=>item.id===projectId)
    if (saved.current[key] || storageError || !project?.root) return
    const request: DianeDispatch = { request_id: crypto.randomUUID(), task_key: key, text, parent, steps, project_id: project.id }
    update(key, { request }) // Durable before any network mutation; retries use this exact snapshot.
    await send(key)
  })
  const action = (key: string, action: 'open' | 'stop' | 'retry') => exclusive(key, async () => {
    if (!projects) return
    const receipt = saved.current[key]
    if (action === 'retry') { await send(key); return }
    const result = await dianeRequest<DianeResult>(action, receipt.request.request_id)
    if (action === 'stop') update(key, { ...receipt, result, error: undefined, checkedAt: new Date().toISOString() })
  })
  return <DianeContext.Provider value={{ entries, date, connected: Boolean(projects), projects:projects?.projects??[], chooseFolder, storageError, busy, keyFor: (id, sourceDate) => `${kbPath}|${sourceDate ?? date}|${id}`, run, action }}>{children}</DianeContext.Provider>
}

export function DianeAction({ id, text, sourceDate, parent = '', steps = [] }: { id: string; sourceDate?: string; text: string; parent?: string; steps?: string[] }) {
  const context = useContext(DianeContext)
  const [expanded, setExpanded] = useState(false)
  const [selectedProject,setSelectedProject]=useState<string|null>(null)
  const [folderError,setFolderError]=useState('')
  const [choosing,setChoosing]=useState(false)
  const [setupContext, setSetupContext] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [review, setReview] = useState(false)
  const generation = useRef(0)
  const edited = useRef(0)
  const taskSnapshot = JSON.stringify([id, text, sourceDate, parent, steps])
  useEffect(() => {
    generation.current++; edited.current++
    setPreparing(false); setReview(false); setSetupContext(''); setSelectedProject(null); setFolderError('')
    return () => { generation.current++ }
  }, [taskSnapshot])
  const suggestSetup = async () => {
    if (!context?.connected || preparing) return
    const token = ++generation.current, version = edited.current
    setPreparing(true); setFolderError(''); setReview(false)
    try {
      const suggestion = await suggestDianeSetup({ id, date: sourceDate ?? context.date, text, parent, steps, projects: context.projects })
      if (token !== generation.current || version !== edited.current) return
      setSelectedProject(suggestion.project_id ?? ''); setSetupContext(suggestion.context)
      if (!suggestion.project_id) setFolderError(suggestion.reason || 'Choose a workspace.')
    } catch (error) { if (token === generation.current) setFolderError(String(error)) }
    finally { if (token === generation.current) setPreparing(false) }
  }
  const root = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  useEffect(() => {
    if (!expanded) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setExpanded(false) }
    document.addEventListener('pointerdown', dismiss)
    const timer=setTimeout(()=>panel.current?.querySelector<HTMLElement>('select,button')?.focus(),0)
    return () => {clearTimeout(timer);document.removeEventListener('pointerdown', dismiss)}
  }, [expanded])
  if (!context) return <span className="diane-action-wrap" title="Enable the local Diane connection in Settings → Integrations">
    <button type="button" className="task-action diane-action" disabled aria-label="Push to Diane · Connection disabled">
      <svg className="diane-dot diane-new" viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5z"/></svg>
    </button>
  </span>
  const key = context.keyFor(id, sourceDate), receipt = context.entries[key], busy = context.busy.has(key)
  const result = receipt?.result
  const unavailable = Boolean(receipt?.error)
  const state = unavailable ? 'unavailable' : result?.status || (receipt ? 'queued' : 'new')
  const label = unavailable ? 'Status unavailable' : result?.stopping ? 'Stopping' : result ? statusLabels[result.status] : receipt ? 'Sending to Diane' : 'Run in Diane'
  const suggested=suggestWorkspace(context.projects,[text,parent,...steps].join('\n'))
  const projectId=selectedProject??suggested?.id??''
  const project=context.projects.find(item=>item.id===projectId)
  const title = !receipt && !context.connected ? 'Push to Diane · Local Diane is not connected' : receipt ? `${label}. Open details for ${text}` : `Push to Diane · ${project?.name||'Choose workspace'}`
  return <span ref={root} className="diane-action-wrap" title={title} onKeyDown={event => { if (event.key === 'Escape') { setExpanded(false); root.current?.querySelector('button')?.focus() } }}>
    <button type="button" className="task-action diane-action" title={title} aria-label={title}
      aria-expanded={expanded} aria-haspopup="dialog" disabled={busy || (!receipt && !context.connected) || (!receipt && Boolean(context.storageError))}
      onClick={() => { const rect = root.current!.getBoundingClientRect(); setPosition({ top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 300)), left: Math.max(12, Math.min(rect.right - 300, window.innerWidth - 312)) }); if (!expanded && !receipt && selectedProject === null && !setupContext) void suggestSetup(); setExpanded(value => !value) }}>
      <svg className={`diane-dot diane-${state}`} viewBox="0 0 16 16" aria-hidden="true">
        {state === 'new' ? <path d="m5 3 8 5-8 5z"/> : state === 'attention' ? <path d="m8 2 6 6-6 6-6-6z"/> : state === 'stopped' ? <rect x="4" y="4" width="8" height="8" rx="1"/> : <circle cx="8" cy="8" r="5"/>}
        {state === 'ready' && <path className="diane-mark" d="m5 8 2 2 4-4"/>}
        {state === 'failed' && <path className="diane-mark" d="m6 6 4 4m0-4-4 4"/>}
        {state === 'unavailable' && <path d="M6 8h4"/>}
      </svg>
    </button>
    {expanded && createPortal(<span ref={panel} style={position} className="diane-details" role="dialog" aria-label="Diane task details">
      <button className="diane-detail-close" aria-label="Close Diane details" onClick={()=>{setExpanded(false);root.current?.querySelector('button')?.focus()}}>×</button>
      {!receipt ? <>
        <strong>{review ? 'Review session' : 'Set up session'}</strong>
        {review ? <>
          <span>{text}</span>
          <span>{project?.name}</span><small className="diane-workspace-path">{project?.root}</small>
          {setupContext && <span className="diane-setup-context">{setupContext}</span>}
          {parent && <span>Parent: {parent}</span>}
          {steps.length > 0 && <span className="diane-setup-context">{steps.join('\n')}</span>}
          <span className="diane-detail-actions">
            <button onClick={()=>setReview(false)}>Edit setup</button>
            <button disabled={busy||!context.connected||!project||Boolean(context.storageError)||text.length+setupContext.length+12>20000}
              onClick={()=>void context.run(key, setupContext.trim() ? text+'\n\nContext\n'+setupContext.trim() : text, parent, steps, projectId)}>Start session</button>
          </span>
        </> : <>
          <label>Workspace<select aria-label="Diane workspace" value={projectId} onChange={event=>{edited.current++;setSelectedProject(event.target.value)}}><option value="">Choose workspace</option>{context.projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {project&&<small className="diane-workspace-path">{project.root}</small>}
          <label>Context<textarea aria-label="Session context" rows={4} maxLength={4000} value={setupContext} onChange={event=>{edited.current++;setSetupContext(event.target.value)}}/></label>
          <span className="diane-detail-actions">
            <button disabled={choosing || !context.connected} onClick={()=>{edited.current++;setChoosing(true);setFolderError('');void context.chooseFolder().then(value=>{if(value)setSelectedProject(value.id)}).catch(e=>setFolderError(String(e))).finally(()=>setChoosing(false))}}>{choosing?'Choosing…':'Choose folder…'}</button>
            <button disabled={preparing||!context.connected} onClick={()=>void suggestSetup()}>{preparing?'Suggesting…':'Suggest setup'}</button>
            <button disabled={busy||preparing||!context.connected||!project||Boolean(context.storageError)} onClick={()=>setReview(true)}>Review</button>
          </span>
        </>}
        {(context.storageError||folderError)&&<span role="alert">{context.storageError||folderError}</span>}
      </> : <>
      <strong>{label}</strong>
      {result && <span>{result.project_name}</span>}
      <span>{receipt.error || result?.summary || 'Waiting for Diane to acknowledge this request.'}</span>
      {unavailable && receipt.checkedAt && <small>Last checked {new Date(receipt.checkedAt).toLocaleString()}</small>}
      {result?.artifacts.map((artifact, index) => <span key={index}>{String(artifact.path || artifact.title || artifact.name || 'Artifact available in Diane')}</span>)}
      <span className="diane-detail-actions">
        <button type="button" disabled={busy || !context.connected || !result} onClick={() => void context.action(key, 'open')}>Open in Diane</button>
        {(!result || unavailable) && <button type="button" disabled={busy || !context.connected} onClick={() => void context.action(key, 'retry')}>Reconnect</button>}
        {result && ['queued', 'running'].includes(result.status) && <button type="button" disabled={busy || !context.connected || result.stopping} onClick={() => void context.action(key, 'stop')}>{result.stopping ? 'Stopping…' : 'Stop'}</button>}
      </span>
      </>}
    </span>, document.body)}
  </span>
}
