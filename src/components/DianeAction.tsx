import { createPortal } from 'react-dom'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { dianeRequest, readDianeReceipts, statusLabels, type DianeDispatch, type DianeProjects, type DianeReceipt, type DianeResult } from '../diane'

const STORAGE = 'sticky-todo-diane-v1'
type Entries = Record<string, DianeReceipt>
interface Context {
  entries: Entries
  project?: DianeProjects['projects'][number]
  storageError: string
  busy: Set<string>
  keyFor: (id: string) => string
  run: (key: string, text: string, parent: string, steps: string[]) => Promise<void>
  action: (key: string, action: 'open' | 'stop' | 'retry') => Promise<void>
}
const DianeContext = createContext<Context | null>(null)

export function DianeProvider({ children, date, kbPath }: { children: ReactNode; date: string; kbPath: string }) {
  const [entries, setEntries] = useState<Entries>({})
  const saved = useRef<Entries>({})
  const [storageError, setStorageError] = useState('Loading Diane links')
  const [projects, setProjects] = useState<DianeProjects>()
  const locks = useRef(new Set<string>())
  const [busy, setBusy] = useState(new Set<string>())
  const project = projects?.projects.find(item => item.id === projects.active_project_id)
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
  const run = (key: string, text: string, parent: string, steps: string[]) => exclusive(key, async () => {
    if (saved.current[key] || storageError || !project?.root) return
    const request: DianeDispatch = { request_id: crypto.randomUUID(), task_key: key, text, parent, steps, project_id: project.id }
    update(key, { request }) // Durable before any network mutation; retries use this exact snapshot.
    await send(key)
  })
  const action = (key: string, action: 'open' | 'stop' | 'retry') => exclusive(key, async () => {
    const receipt = saved.current[key]
    if (action === 'retry') { await send(key); return }
    const result = await dianeRequest<DianeResult>(action, receipt.request.request_id)
    if (action === 'stop') update(key, { ...receipt, result, error: undefined, checkedAt: new Date().toISOString() })
  })
  return <DianeContext.Provider value={{ entries, project, storageError, busy, keyFor: id => `${kbPath}|${date}|${id}`, run, action }}>{children}</DianeContext.Provider>
}

export function DianeAction({ id, text, parent = '', steps = [] }: { id: string; text: string; parent?: string; steps?: string[] }) {
  const context = useContext(DianeContext)
  const [expanded, setExpanded] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  useEffect(() => {
    if (!expanded) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setExpanded(false) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [expanded])
  if (!context) return null
  const key = context.keyFor(id), receipt = context.entries[key], busy = context.busy.has(key)
  const result = receipt?.result
  const unavailable = Boolean(receipt?.error)
  const state = unavailable ? 'unavailable' : result?.status || (receipt ? 'queued' : 'new')
  const label = unavailable ? 'Status unavailable' : result?.stopping ? 'Stopping' : result ? statusLabels[result.status] : receipt ? 'Sending to Diane' : 'Run in Diane'
  const title = receipt ? `${label}. Open details for ${text}` : context.storageError || (context.project?.root ? `Run in Diane · ${context.project.name}` : 'Open Diane and select a project folder')
  return <span ref={root} className="diane-action-wrap" onKeyDown={event => { if (event.key === 'Escape') { setExpanded(false); root.current?.querySelector('button')?.focus() } }}>
    <button type="button" className="task-action diane-action" title={title} aria-label={title}
      aria-expanded={receipt ? expanded : undefined} disabled={!receipt && (busy || Boolean(context.storageError) || !context.project?.root)}
      onClick={() => { if (receipt) { const rect = root.current!.getBoundingClientRect(); setPosition({ top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 260)), left: Math.max(12, Math.min(rect.right - 280, window.innerWidth - 292)) }); setExpanded(value => !value) } else void context.run(key, text, parent, steps) }}>
      <svg className={`diane-dot diane-${state}`} viewBox="0 0 16 16" aria-hidden="true">
        {state === 'new' ? <path d="m5 3 8 5-8 5z"/> : state === 'attention' ? <path d="m8 2 6 6-6 6-6-6z"/> : state === 'stopped' ? <rect x="4" y="4" width="8" height="8" rx="1"/> : <circle cx="8" cy="8" r="5"/>}
        {state === 'ready' && <path className="diane-mark" d="m5 8 2 2 4-4"/>}
        {state === 'failed' && <path className="diane-mark" d="m6 6 4 4m0-4-4 4"/>}
        {state === 'unavailable' && <path d="M6 8h4"/>}
      </svg>
    </button>
    {expanded && receipt && createPortal(<span ref={panel} style={position} className="diane-details" role="group" aria-label="Diane task details">
      <strong>{label}</strong>
      {result && <span>{result.project_name}</span>}
      <span>{receipt.error || result?.summary || 'Waiting for Diane to acknowledge this request.'}</span>
      {unavailable && receipt.checkedAt && <small>Last checked {new Date(receipt.checkedAt).toLocaleString()}</small>}
      {result?.artifacts.map((artifact, index) => <span key={index}>{String(artifact.path || artifact.title || artifact.name || 'Artifact available in Diane')}</span>)}
      <span className="diane-detail-actions">
        <button type="button" disabled={busy || !result} onClick={() => void context.action(key, 'open')}>Open in Diane</button>
        {(!result || unavailable) && <button type="button" disabled={busy} onClick={() => void context.action(key, 'retry')}>Reconnect</button>}
        {result && ['queued', 'running'].includes(result.status) && <button type="button" disabled={busy || result.stopping} onClick={() => void context.action(key, 'stop')}>{result.stopping ? 'Stopping…' : 'Stop'}</button>}
      </span>
    </span>, document.body)}
  </span>
}
