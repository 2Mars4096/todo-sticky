import { useEffect, useState } from 'react'
import type { SyncProgress } from '../syncProgress'

export function SyncProgressView({ progress }: { progress: SyncProgress }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const seconds = Math.max(0, Math.floor((now - progress.startedAt) / 1000))
  const idle = Math.max(0, Math.floor((now - progress.updatedAt) / 1000))
  return <div className="cloud-sync-progress">
    <p role="status">{progress.stage}{progress.detail && <> · {progress.detail}</>}</p>
    <progress aria-label="Sync progress" max={Math.max(1, progress.total ?? 1)} value={progress.total === null ? undefined : progress.completed} />
    <div className="cloud-sync-progress-meta">
      <span>{progress.total === null ? 'Preparing' : `${progress.completed} / ${progress.total}`}</span>
      <span>{seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`}</span>
    </div>
    {idle >= 15 && <p className="hint">Waiting for this step · {idle}s</p>}
  </div>
}
