import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { invoke } from '@tauri-apps/api/core'
import { api, waitForPendingWrites } from '../api'
import { connectAccount, googleSignIn, requestJson, signOut, type Auth, type User } from '../cloudAccount'
import { canonical, reconcile, syncServerUrl, validateRecords, type CloudRecord, type SyncAction, type SyncBaseline, type SyncPayload } from '../cloudSync'
import type { GoalItem, StarFocusMissionRecord, Task } from '../types'

const SERVER_KEY = 'todo-sticky-cloud-server-v1'
const OWNER_KEY = 'todo-sticky-cloud-owner-v1'
interface Metadata {
  enabled: boolean
  baseline: Record<string, SyncBaseline>
  pending: Record<string, { mutationId: string; fingerprint: string; expectedRevision: number }>
  conflicts: { key: string; local: SyncPayload; remote: CloudRecord | null; at: string }[]
}
interface Hooks {
  kbPath: string
  ready: boolean
  blocked: boolean
  changeKey: string
  flush: () => Promise<void>
  reload: () => Promise<unknown>
  goals: { targets: GoalItem[]; recurring: GoalItem[] }
  missions: StarFocusMissionRecord[]
  applyGoals: (value: { targets: GoalItem[]; recurring: GoalItem[] }) => void | Promise<void>
  applyMission: (value: StarFocusMissionRecord | null, id: string) => Promise<void>
}
function stored(key: string): string { try { return localStorage.getItem(key) ?? '' } catch { return '' } }
function metadata(key: string): Metadata {
  const raw = localStorage.getItem(key)
  if (!raw) return { enabled: false, baseline: {}, pending: {}, conflicts: [] }
  const value = JSON.parse(raw)
  if (!value || typeof value.enabled !== 'boolean' || !value.baseline || !value.pending || !Array.isArray(value.conflicts)) throw new Error('Sync metadata needs recovery. Local tasks have not been changed.')
  return value
}
function baseline(record: CloudRecord): SyncBaseline {
  return { revision: record.revision, payload: record.payload, deleted: record.deleted }
}

export function useCloudSync(hooks: Hooks) {
  const hooksRef = useRef(hooks); hooksRef.current = hooks
  const [server, setServer] = useState(() => stored(SERVER_KEY) || import.meta.env.VITE_SYNC_SERVER_URL || '')
  const [auth, setAuth] = useState<Auth | null>(null)
  const [connectAttempt, setConnectAttempt] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [applying, setApplying] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('Sync is optional. Your notes work offline.')
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<SyncAction[]>([])
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const running = useRef(false)
  const signInController = useRef<AbortController | null>(null)
  const epoch = useRef(0)
  const key = auth && user ? `todo-sticky-cloud-v1:${auth.app.options.projectId}:${user.uid}:${server}:${hooks.kbPath}` : ''
  const owner = auth && user ? `${auth.app.options.projectId}:${user.uid}` : ''
  const keyRef = useRef(key); keyRef.current = key

  useEffect(() => {
    epoch.current++
    let disposed = false
    let unsubscribe: (() => void) | undefined
    setAuth(null); setUser(null); setEnabled(false); setConflicts([])
    if (server) void connectAccount(server).then(result => {
      if (disposed) return
      setAuth(result)
      unsubscribe = onAuthStateChanged(result, value => { epoch.current++; setUser(value) })
    }).catch(cause => { if (!disposed) setError(cause.message) })
    return () => { disposed = true; unsubscribe?.(); signInController.current?.abort() }
  }, [server, connectAttempt])

  useEffect(() => {
    epoch.current++
    setConflicts([])
    if (!key) { setEnabled(false); return }
    try { setEnabled(metadata(key).enabled) } catch (cause) { setError(String(cause)); setEnabled(false) }
  }, [key])

  const configure = useCallback((value: string) => {
    try {
      if (running.current || signingIn) throw new Error('Wait for the current account operation to finish.')
      const url = syncServerUrl(value)
      localStorage.setItem(SERVER_KEY, url)
      setServer(url); setConnectAttempt(value => value + 1); setError(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }, [signingIn])

  const login = useCallback(async () => {
    if (!auth || signingIn) return
    setSigningIn(true); setError(null); setMessage('Confirm your Google account in the browser.')
    const controller = new AbortController(); signInController.current = controller
    try { await googleSignIn(server, auth, controller.signal); setMessage('Signed in. Enable sync when you are ready to link these notes.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setSigningIn(false); signInController.current = null }
  }, [auth, signingIn, server])

  const logout = useCallback(async () => {
    if (!auth || running.current) return
    signInController.current?.abort()
    try {
      if (key) { const meta = metadata(key); meta.enabled = false; localStorage.setItem(key, JSON.stringify(meta)) }
      await signOut(auth); setEnabled(false); setMessage('Signed out. Local notes remain on this device; syncing is paused.')
    } catch (cause) { setError(String(cause)) }
  }, [auth, key])

  const toggleEnabled = useCallback((value: boolean) => {
    if (!key || !owner || running.current) return
    try {
      const linked = localStorage.getItem(OWNER_KEY)
      if (value && linked && linked !== owner) throw new Error('These local notes belong to another account. Sign in with the original account, or use a separate app data profile.')
      // Bind before storing enablement; a failed write must never leave an unbound upload.
      if (value) localStorage.setItem(OWNER_KEY, owner)
      const meta = metadata(key); meta.enabled = value
      localStorage.setItem(key, JSON.stringify(meta)); setEnabled(value); setError(null)
      setMessage(value ? 'Sync enabled for this task folder.' : 'Sync paused. Local notes remain available.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }, [key, owner])

  const snapshot = useCallback(async () => {
    await hooksRef.current.flush(); await waitForPendingWrites()
    const data = await api.extractTaskApi({ all: true, canonicalDates: true })
    const local: Record<string, SyncPayload> = Object.fromEntries(data.dates.map(day => ['day:' + day.date, { date: day.date, tasks: day.tasks }]))
    local.goals = { targets: hooksRef.current.goals.targets, recurring: hooksRef.current.goals.recurring }
    for (const mission of hooksRef.current.missions) local['focus:' + mission.id] = { ...mission }
    return local
  }, [])

  const synchronize = useCallback(async (resolution?: { key: string; choice: 'local' | 'cloud' }) => {
    if (!user || !auth || !enabled || !key || running.current || !hooksRef.current.ready) return
    if (hooksRef.current.blocked) { setMessage('Sync will resume after the current task operation.'); return }
    running.current = true; setBusy(true); setError(null)
    const generation = epoch.current
    const assertCurrent = () => { if (generation !== epoch.current || keyRef.current !== key || auth.currentUser?.uid !== user.uid) throw new Error('Account or task folder changed; sync stopped safely.') }
    let pulled = false
    try {
      if (localStorage.getItem(OWNER_KEY) !== owner) throw new Error('Enable sync to link these notes to this account.')
      const meta = metadata(key)
      const persist = () => { assertCurrent(); localStorage.setItem(key, JSON.stringify(meta)) }
      const token = await user.getIdToken()
      assertCurrent()
      const nativeKbPath = await invoke<string>('cloud_task_folder')
      const local = await snapshot()
      const cloud: CloudRecord[] = []
      let cursor: string | null = null
      const cursors = new Set<string>()
      do {
        const page = await requestJson(server, '/v1/sync' + (cursor ? '?after=' + encodeURIComponent(cursor) : ''), {}, token)
        assertCurrent()
        if (page.schemaVersion !== 1) throw new Error('The sync service version is incompatible.')
        cloud.push(...validateRecords(page.records))
        cursor = page.nextCursor ?? null
        if (cursor && (typeof cursor !== 'string' || cursors.has(cursor))) throw new Error('The sync service returned an invalid page cursor.')
        if (cursor) cursors.add(cursor)
      } while (cursor)
      validateRecords(cloud)
      const actions = reconcile(local, cloud, meta.baseline)
      // Finish all HTTP writes before local changes lock the editor.
      actions.sort((a, b) => Number(a.kind === 'pull') - Number(b.kind === 'pull'))
      const unresolved: SyncAction[] = []
      for (const action of actions) {
        assertCurrent()
        if (action.kind === 'conflict' && resolution?.key === action.key) {
          // Preserve both choices before explicit resolution changes either side.
          meta.conflicts.push({ key: action.key, local: action.local, remote: action.remote, at: new Date().toISOString() })
          persist()
          action.kind = resolution.choice === 'local' ? 'push' : 'pull'
        }
        if (action.kind === 'conflict') { unresolved.push(action); continue }
        if (action.kind === 'ack') {
          if (action.remote) meta.baseline[action.key] = baseline(action.remote)
          delete meta.pending[action.key]; persist(); continue
        }
        if (action.kind === 'push') {
          const fingerprint = canonical(action.local)
          const revision = action.remote?.revision ?? 0
          let pending = meta.pending[action.key]
          if (!pending || pending.fingerprint !== fingerprint || pending.expectedRevision !== revision) {
            pending = { mutationId: crypto.randomUUID(), fingerprint, expectedRevision: revision }
            meta.pending[action.key] = pending; persist()
          }
          const result = await requestJson(server, '/v1/sync/' + encodeURIComponent(action.key), {
            method: 'PUT', body: JSON.stringify({ expectedRevision: revision, mutationId: pending.mutationId, deleted: action.local === null, payload: action.local }),
          }, token)
          assertCurrent()
          const record = validateRecords([result])[0]
          if (record.key !== action.key || canonical(record.payload) !== fingerprint) throw new Error('The sync acknowledgement did not match the saved record.')
          meta.baseline[action.key] = baseline(record); delete meta.pending[action.key]; persist()
          continue
        }
        // Only the short local-apply phase locks interaction. Never lock during HTTP requests.
        setApplying(true)
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        const latest = await snapshot()
        assertCurrent()
        if (canonical(latest[action.key] ?? null) !== canonical(action.local)) throw new Error('You edited this note during sync. Your edits are safe; sync again to reconcile them.')
        const value = action.remote?.deleted ? null : action.remote?.payload ?? null
        if (action.key.startsWith('day:')) {
          const date = action.key.slice(4)
          await invoke('cloud_apply_day', { date, tasks: value === null ? [] : value.tasks, expectedTasks: action.local?.tasks ?? [], expectedKbPath: nativeKbPath })
          pulled = true
        } else if (action.key === 'goals') {
          await hooksRef.current.applyGoals(value as unknown as Hooks['goals'] ?? { targets: [], recurring: [] })
        } else await hooksRef.current.applyMission(value as unknown as StarFocusMissionRecord | null, action.key.slice(6))
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        await waitForPendingWrites()
        if (action.remote) meta.baseline[action.key] = baseline(action.remote)
        else delete meta.baseline[action.key]
        persist()
        if (pulled) { await hooksRef.current.reload(); pulled = false }
        setApplying(false)
      }
      assertCurrent()
      setConflicts(unresolved)
      setLastSynced(new Date().toISOString())
      setMessage(unresolved.length ? `${unresolved.length} ${unresolved.length === 1 ? 'record needs' : 'records need'} your choice. Both versions are preserved.` : 'Up to date across your devices.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setMessage('Local notes are safe. Retry sync when ready.') }
    finally {
      // Reload even after a later failure, so the editor never holds a stale pre-pull snapshot.
      try { if (pulled) await hooksRef.current.reload() } catch (cause) { setError(String(cause)) }
      setApplying(false); setBusy(false); running.current = false
    }
  }, [user, auth, enabled, key, owner, server, snapshot])

  const exportRecovery = useCallback(() => {
    try {
      if (!key) return
      const copies = metadata(key).conflicts
      const blob = new Blob([JSON.stringify({ schemaVersion: 1, savedAt: new Date().toISOString(), conflicts: copies }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = 'sticky-todo-sync-recovery.json'
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) { setError(String(cause)) }
  }, [key])

  const syncRef = useRef(synchronize); syncRef.current = synchronize
  useEffect(() => {
    if (!enabled || !hooks.ready || hooks.blocked) return
    const timeout = setTimeout(() => { void syncRef.current() }, 1800)
    return () => clearTimeout(timeout)
  }, [enabled, hooks.ready, hooks.blocked, hooks.changeKey, key])
  useEffect(() => {
    if (!enabled) return
    const refresh = () => { if (document.visibilityState !== 'hidden' && !document.querySelector('input:focus,textarea:focus,[contenteditable=true]:focus')) void syncRef.current() }
    const timer = setInterval(refresh, 60_000)
    window.addEventListener('online', refresh); window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh) }
  }, [enabled])

  return { server, configure, user, connected: Boolean(auth), busy, applying, signingIn, enabled, message, error, conflicts, lastSynced, login, logout, toggleEnabled, exportRecovery,
    cancelSignIn: () => signInController.current?.abort(), sync: () => synchronize(), resolve: (key: string, choice: 'local' | 'cloud') => synchronize({ key, choice }) }
}
