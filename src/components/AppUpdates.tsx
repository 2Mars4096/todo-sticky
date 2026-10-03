import type { UpdateState } from '../appUpdates'
import { updateIsBusy } from '../appUpdates'

interface Props {
  currentVersion: string
  state: UpdateState
  blockedReason?: string
  onCheck: () => void
  onInstall: () => void
  onRestart: () => void
}

export function AppUpdates({ currentVersion, state, blockedReason, onCheck, onInstall, onRestart }: Props) {
  const busy = updateIsBusy(state.phase)
  const progress = state.total ? Math.min(100, Math.round((state.downloaded ?? 0) / state.total * 100)) : undefined
  const status = {
    idle: '', checking: 'Checking for updates…', current: 'You’re up to date.',
    available: `Version ${state.version} is available.`, downloading: 'Downloading update…',
    installing: 'Installing update…', installed: `Version ${state.version} installed. Restart to finish.`,
    restarting: 'Restarting…', error: 'Update failed. Check your connection and try again.',
  }[state.phase]

  return (
    <section className="settings-section app-updates" aria-labelledby="app-updates-title">
      <div className="section-title" id="app-updates-title">Updates</div>
      <p className="hint">Sticky Todo {currentVersion || '…'}</p>
      <div className="test-row">
        {state.phase === 'available' ? (
          <button onClick={onInstall} disabled={Boolean(blockedReason)}>Download and install</button>
        ) : state.phase === 'installed' ? (
          <button onClick={onRestart} disabled={Boolean(blockedReason)}>Restart now</button>
        ) : (
          <button onClick={onCheck} disabled={busy}>{busy ? 'Please wait…' : 'Check for updates'}</button>
        )}
        <span role="status">{status}</span>
      </div>
      {state.phase === 'downloading' && <progress aria-label="Update download" max={100} value={progress} />}
      {blockedReason && ['available', 'installed'].includes(state.phase) && <p className="hint">{blockedReason}</p>}
      {state.error && <p className="update-error" role="alert">{state.error}</p>}
      {state.notes && state.phase === 'available' && (
        <details><summary>What’s new</summary><p className="update-notes">{state.notes}</p></details>
      )}
    </section>
  )
}
