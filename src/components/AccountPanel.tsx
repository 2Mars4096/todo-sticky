import { useEffect, useRef, useState } from 'react'
import type { useCloudSync } from '../hooks/useCloudSync'
import '../styles/cloud-account.css'
import { SyncProgressView } from './SyncProgressView'
import { ConflictReview } from './ConflictReview'

export type CloudAccount = ReturnType<typeof useCloudSync>
export function AccountPanel({ account }: { account: CloudAccount }) {
  const [url, setUrl] = useState(account.server)
  const [review, setReview] = useState<'pending' | 'history' | null>(null)
  const reviewButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  useEffect(() => setUrl(account.server), [account.server])
  useEffect(() => { if (!review && restoreFocus.current) { reviewButton.current?.focus(); restoreFocus.current = false } }, [review])
  const back = () => { restoreFocus.current = true; setReview(null) }
  if (review) return <ConflictReview account={account} initialHistory={review === 'history'} onBack={back} />
  return <section className="settings-section cloud-account" aria-labelledby="account-heading">
    <header className="cloud-account-heading">
      <div><h3 id="account-heading">{account.user?.displayName || (account.user ? 'Google account' : 'Account')}</h3>{account.user?.email && <p className="cloud-email">{account.user.email}</p>}</div>
      {account.user && <button type="button" className="cloud-quiet" disabled={account.busy} onClick={() => { void account.logout() }}>Sign out</button>}
    </header>
    {account.user ? <>
      <div className="cloud-sync-controls">
        <label className="cloud-sync-toggle"><input type="checkbox" checked={account.enabled} onChange={event => account.toggleEnabled(event.target.checked)} disabled={account.busy} />Sync this folder</label>
        <button type="button" className="cloud-primary" onClick={() => { void account.sync() }} disabled={!account.enabled || account.busy}>{account.busy ? 'Syncing…' : 'Sync now'}</button>
      </div>
      {account.busy && account.progress ? <SyncProgressView progress={account.progress} /> : <p role="status" className="cloud-sync-status">{account.message}</p>}
      {account.lastSynced && <time className="cloud-last-sync" title={new Date(account.lastSynced).toLocaleString()}>Checked {new Date(account.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}
      <div className="cloud-review-launchers"><button ref={reviewButton} type="button" className={account.conflicts.length ? 'cloud-review-needed' : 'cloud-quiet'} onClick={() => setReview('pending')}>Conflicts <span>{account.conflicts.length}</span></button><button type="button" className="cloud-quiet" onClick={() => setReview('history')}>Saved copies <span>{account.recovery.length}</span></button></div>
    </> : <div className="cloud-login-actions"><button type="button" className="cloud-primary" onClick={() => { void account.login() }} disabled={!account.connected || account.signingIn}>{account.signingIn ? 'Waiting for Google…' : 'Continue with Google'}</button>{account.signingIn && <button type="button" className="cloud-quiet" onClick={account.cancelSignIn}>Cancel</button>}</div>}
    {account.error && <p role="alert" className="settings-error">{account.error}</p>}
    <details open={!account.server || undefined} className="cloud-connection">
      <summary>Connection</summary>
      <label htmlFor="cloud-url">Service URL</label>
      <div className="cloud-connection-form"><input id="cloud-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" disabled={account.busy || account.signingIn || Boolean(account.user)} /><button type="button" disabled={!url || account.busy || account.signingIn || Boolean(account.user)} onClick={() => account.configure(url)}>Connect</button></div>
    </details>
  </section>
}
