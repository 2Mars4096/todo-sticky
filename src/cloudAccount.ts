import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app'
import { getAuth, setPersistence, indexedDBLocalPersistence, signInWithCustomToken, signOut, type Auth, type User } from 'firebase/auth'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { syncServerUrl } from './cloudSync'

export async function requestJson(origin: string, path: string, options: RequestInit = {}, token?: string): Promise<any> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  options.signal?.addEventListener('abort', cancel, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(origin + path, {
      ...options, signal: controller.signal, redirect: 'error', credentials: 'omit',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const message = typeof body?.detail === 'string' ? body.detail : response.status === 409 ? 'This record changed on another device. Sync again to review the conflict.' : `Sync request failed (${response.status}).`
      throw new Error(message)
    }
    return body
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel) }
}

export async function connectAccount(origin: string): Promise<Auth> {
  origin = syncServerUrl(origin)
  const config = await requestJson(origin, '/v1/config')
  const firebase = config.firebase as FirebaseOptions
  if (config.schemaVersion !== 1 || !firebase?.apiKey || !firebase.authDomain || !firebase.projectId || !firebase.appId) throw new Error('The account service needs its Firebase web configuration before sign-in is available.')
  const name = 'sticky-' + firebase.projectId
  const app = getApps().find(item => item.name === name) ?? initializeApp(firebase, name)
  const auth = getAuth(app)
  await setPersistence(auth, indexedDBLocalPersistence)
  await auth.authStateReady()
  return auth
}

function randomCode(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function googleSignIn(origin: string, auth: Auth, signal: AbortSignal): Promise<User> {
  const verifier = randomCode()
  const sessionId = randomCode()
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const url = `${origin}/signin#${new URLSearchParams({ sessionId, challenge })}`
  if (isTauri()) await invoke('open_account_sign_in', { url })
  else window.open(url, '_blank', 'noopener,noreferrer')
  const expires = Date.now() + 5 * 60_000
  while (Date.now() < expires && !signal.aborted) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (signal.aborted) break
    let result
    try { result = await requestJson(origin, '/v1/auth/exchange', { method: 'POST', body: JSON.stringify({ sessionId, verifier }), signal }) }
    catch (cause) { if (signal.aborted) break; throw cause }
    if (result.customToken) {
      if (signal.aborted) break
      const credential = await signInWithCustomToken(auth, result.customToken)
      if (signal.aborted) { await signOut(auth); break }
      return credential.user
    }
  }
  throw new Error(signal.aborted ? 'Sign-in cancelled.' : 'Sign-in expired. Try again.')
}

export { signOut }
export type { User, Auth }
