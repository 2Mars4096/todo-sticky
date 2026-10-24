import { useEffect, useState } from 'react'
import type { useCloudSync } from '../hooks/useCloudSync'
import '../styles/cloud-account.css'

export type CloudAccount = ReturnType<typeof useCloudSync>
export function AccountPanel({ account }: { account: CloudAccount }) {
  const [url, setUrl] = useState(account.server)
  useEffect(() => setUrl(account.server), [account.server])
  return <section className="settings-section cloud-account" aria-labelledby="account-heading">
    <h3 className="section-title" id="account-heading">Your account</h3>
    <p className="settings-description">Keep tasks, outcomes, goals, routines and completed focus sessions together across desktop and Android.</p>
    <details open={!account.server || undefined} className="settings-details">
      <summary>Sync service</summary>
      <label htmlFor="cloud-url">Your Google Cloud service URL</label>
      <input id="cloud-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://sticky-sync-…run.app" disabled={account.busy || account.signingIn || Boolean(account.user)} />
      <button type="button" onClick={() => account.configure(url)} disabled={!url || account.busy || account.signingIn || Boolean(account.user)}>Connect service</button>
      <p className="hint">Use the service deployed for your Firebase project. Google sign-in opens in your browser.</p>
    </details>
    {account.user ? <>
      <p className="cloud-identity"><strong>{account.user.displayName || 'Google account'}</strong><span>{account.user.email}</span></p>
      <label className="diane-credentials-choice"><input type="checkbox" checked={account.enabled} onChange={event => account.toggleEnabled(event.target.checked)} disabled={account.busy} /> Sync this task folder</label>
      <p className="hint">Enabling sync links this device’s notes to this account. API keys, machine paths and active timers stay on the device. Sign-out keeps local notes.</p>
      <div className="cloud-actions"><button type="button" onClick={() => { void account.sync() }} disabled={!account.enabled || account.busy}>{account.busy ? 'Syncing…' : 'Sync now'}</button><button type="button" onClick={() => { void account.logout() }} disabled={account.busy}>Sign out</button></div>
      <button type="button" onClick={account.exportRecovery}>Export conflict recovery history</button>
    </> : <div className="cloud-actions"><button type="button" className="primary" onClick={() => { void account.login() }} disabled={!account.connected || account.signingIn}>{account.signingIn ? 'Waiting for Google…' : 'Continue with Google'}</button>{account.signingIn && <button type="button" onClick={account.cancelSignIn}>Cancel sign-in</button>}</div>}
    <p role="status" className="settings-status">{account.message}</p>
    {account.lastSynced && <p className="hint">Last checked {new Date(account.lastSynced).toLocaleString()}</p>}
    {account.error && <p role="alert" className="settings-error">{account.error}</p>}
    {account.conflicts.map(conflict => <article key={conflict.key} className="cloud-conflict">
      <h4>{conflict.key.startsWith('day:') ? conflict.key.slice(4) : conflict.key === 'goals' ? 'Goals and routines' : 'Focus session'}</h4>
      <p>Changed on both devices. Review the versions, then choose which to continue with. Both are saved in local recovery history before a choice is applied.</p>
      <details><summary>This device</summary><pre>{JSON.stringify(conflict.local, null, 2)}</pre></details>
      <details><summary>Cloud</summary><pre>{JSON.stringify(conflict.remote?.payload ?? null, null, 2)}</pre></details>
      <div className="cloud-actions"><button type="button" disabled={account.busy} onClick={() => { void account.resolve(conflict.key, 'local') }}>Keep this device</button><button type="button" disabled={account.busy} onClick={() => { void account.resolve(conflict.key, 'cloud') }}>Use cloud version</button></div>
    </article>)}
  </section>
}
