export interface SyncProgress {
  stage: string
  detail: string | null
  completed: number
  total: number | null
  startedAt: number
  updatedAt: number
}
export function syncRecordLabel(key: string): string {
  return key.startsWith('day:') ? key.slice(4) : key === 'goals' ? 'Goals and routines' : 'Focus session'
}
export function nextSyncProgress(previous: SyncProgress | null, stage: string, update: Partial<SyncProgress> = {}, now = Date.now()): SyncProgress {
  return { completed: 0, total: null, startedAt: now, ...previous, stage, detail: null, ...update, updatedAt: now }
}
// WebKit can stop animation frames while hidden. Rendering must not hold a write lock forever.
export function yieldSyncUi(): Promise<void> {
  return new Promise(resolve => {
    let frame: number | undefined
    const finish = () => { clearTimeout(timer); if (frame !== undefined) cancelAnimationFrame(frame); resolve() }
    const timer = setTimeout(finish, document.visibilityState === 'hidden' ? 0 : 100)
    if (document.visibilityState !== 'hidden') frame = requestAnimationFrame(finish)
  })
}
