import { ui } from '../interfaceLocale'
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
    idle: '', checking: ui("Checking for updates…"), current: ui("You’re up to date."),
    available: `Version ${state.version} is available.`, downloading: ui("Downloading update…"),
    installing: ui("Installing update…"), installed: `Version ${state.version} installed. Restart to finish.`,
    restarting: 'Restarting…', error: ui("Update failed. Check your connection and try again."),
  }[state.phase]

  return (
    <section className="settings-section app-updates" aria-labelledby="app-updates-title">
      <div className="section-title" id="app-updates-title">{ui("Updates")}</div>
      <p className="hint">{ui("Dockit {0}", [currentVersion || '…'])}</p>
      <div className="test-row">
        {state.phase === 'available' ? (
          <button className="update-action" onClick={onInstall} disabled={Boolean(blockedReason)}><span className="update-dot" aria-hidden="true" />{ui("Download and install")}</button>
        ) : state.phase === 'installed' ? (
          <button className="update-action" onClick={onRestart} disabled={Boolean(blockedReason)}><span className="update-dot" aria-hidden="true" />{ui("Restart now")}</button>
        ) : (
          <button onClick={onCheck} disabled={busy}>{busy ? ui("Please wait…") : ui("Check for updates")}</button>
        )}
        <span role="status">{status}</span>
      </div>
      {state.phase === 'downloading' && <progress aria-label={ui("Update download")} max={100} value={progress} />}
      {blockedReason && ['available', 'installed'].includes(state.phase) && <p className="hint">{blockedReason}</p>}
      {state.error && <p className="update-error" role="alert">{state.error}</p>}
      {state.notes && state.phase === 'available' && (
        <details><summary>{ui("What’s new")}</summary><p className="update-notes">{state.notes}</p></details>
      )}
    </section>
  )
}
