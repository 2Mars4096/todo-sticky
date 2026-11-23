import { ui } from '../interfaceLocale'
import { waitForPendingWrites } from '../api'
import { WorkspaceAssignments } from './WorkspaceAssignments'
import { useEffect, useRef, useState } from 'react'
import { DIANE_SHARED_ORIGIN } from '../cloudAccount'
import type { useCloudSync } from '../hooks/useCloudSync'
import '../styles/cloud-account.css'
import { SyncProgressView } from './SyncProgressView'
import { ConflictReview } from './ConflictReview'
import { SuiteLink } from './SuiteLink'

export type CloudAccount = ReturnType<typeof useCloudSync>
export function AccountPanel({ account, flush = waitForPendingWrites }: { account: CloudAccount; flush?: () => Promise<void> }) {
  const shared = account.server === DIANE_SHARED_ORIGIN
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
      <div><h3 id="account-heading">{account.user?.displayName || (shared ? ui("pipedreams account") : ui("Account"))}</h3>{account.user?.email && <p className="cloud-email">{account.user.email}</p>}</div>
      {account.user && <button type="button" className="cloud-quiet" disabled={account.busy} onClick={() => { void account.logout() }}>{ui("Sign out")}</button>}
    </header>
    {account.user ? <>
      {account.auth && account.server === DIANE_SHARED_ORIGIN && <WorkspaceAssignments key={account.user.uid} auth={account.auth} user={account.user} flush={flush}/>}
      <div className="cloud-sync-controls">
        <button type="button" className="cloud-primary" onClick={() => { void account.sync() }} disabled={account.busy}>{account.busy && !account.background ? ui("Syncing…") : ui("Sync")}</button>
      </div>
      {account.busy && !account.background && account.progress ? <SyncProgressView progress={account.progress} /> : <p role="status" className="cloud-sync-status">{account.message}</p>}
      {account.lastSynced && <time className="cloud-last-sync" title={new Date(account.lastSynced).toLocaleString()}>{ui("Checked {0}", [new Date(account.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })])}</time>}
      <div className="cloud-review-launchers"><button ref={reviewButton} type="button" className={account.conflicts.length ? 'cloud-review-needed' : 'cloud-quiet'} onClick={() => setReview('pending')}>{ui("Needs review") + " "}<span>{account.conflicts.length}</span></button><button type="button" className="cloud-quiet" onClick={() => setReview('history')}>{ui("Recovery backups") + " "}<span>{account.recovery.length}</span></button></div>
    </> : <div className="cloud-login-actions"><button type="button" className="cloud-primary" onClick={() => { void account.login() }} disabled={!account.connected || account.signingIn}>{account.signingIn
      ? shared ? ui("Waiting for sign-in…") : ui("Waiting for Google…")
      : shared ? ui("Continue with pipedreams") : ui("Continue with Google")}</button>{account.signingIn && <button type="button" className="cloud-quiet" onClick={account.cancelSignIn}>{ui("Cancel")}</button>}</div>}
    {shared && <p><SuiteLink href="https://pipedreams.work/account">{ui("Manage sign-in methods")}</SuiteLink></p>}
    {account.error && <p role="alert" className="settings-error">{account.error}</p>}
    <details open={!account.server || undefined} className="cloud-connection">
      <summary>{ui("Connection")}</summary>
      <label htmlFor="cloud-url">{ui("Service URL")}</label>
      <div className="cloud-connection-form"><input id="cloud-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" disabled={account.busy || account.signingIn || Boolean(account.user)} /><button type="button" disabled={!url || account.busy || account.signingIn || Boolean(account.user)} onClick={() => account.configure(url)}>{ui("Connect")}</button></div>
    </details>
  </section>
}
