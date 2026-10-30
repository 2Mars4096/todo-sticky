import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'
import { getAuth, GoogleAuthProvider, signInWithPopup, inMemoryPersistence, setPersistence, signOut } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'

const params = new URLSearchParams(location.hash.slice(1))
const sessionId = params.get('sessionId')
const challenge = params.get('challenge')
const nativeReturn = params.get('returnTo') === 'app'
const returnUrl = 'todo-sticky://account-return'
// Fragments never reach HTTP access logs; clear them once captured.
history.replaceState(null, '', '/signin')
// A browser can reuse this tab for a new app request via hash-only navigation.
// Reload its fresh fragment rather than keeping the previous verifier challenge.
window.addEventListener('hashchange', () => {
  if (location.hash) window.location.reload()
})
const button = document.getElementById('signin')
const status = document.getElementById('status')
const error = document.getElementById('error')
const returnLink = document.getElementById('return')
let auth, signedIn
try {
  if (![sessionId, challenge].every(value => /^[A-Za-z0-9_-]{43}$/.test(value || ''))) throw new Error('Open Account settings in Sticky Todo and start a new sign-in.')
  const response = await fetch('/v1/config')
  const { firebase } = await response.json()
  auth = getAuth(initializeApp(firebase))
  await setPersistence(auth, inMemoryPersistence)
} catch (cause) { error.textContent = cause.message; button.disabled = true }

let connecting = false, completed = false
button.onclick = async () => {
  if (connecting || completed) return
  connecting = true
  button.disabled = true
  error.textContent = ''
  try {
    if (!signedIn) {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      signedIn = (await signInWithPopup(auth, provider)).user
    }
    // The user's Google selection completes this explicit sign-in action.
    // Do not stop here and ask them to confirm the same account again.
    status.textContent = 'Finishing sign-in…'
    button.textContent = 'Connecting…'
    const token = await signedIn.getIdToken()
    const response = await fetch('/v1/auth/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId, challenge }),
    })
    if (!response.ok) {
      const body = await response.json()
      // A rejected/expired identity needs another Google selection, not a loop.
      if (response.status === 401 || response.status === 403) signedIn = null
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Could not finish sign-in. Try again.')
    }
    completed = true
    button.hidden = true
    // Cleanup must neither block return nor report an accepted handoff as failed.
    void signOut(auth).catch(() => {})
    if (nativeReturn) {
      status.textContent = 'Google sign-in complete. Finishing in Sticky Todo…'
      returnLink.href = returnUrl
      returnLink.hidden = false
      try { window.location.assign(returnUrl) } catch (_) {}
    } else {
      status.textContent = 'Google sign-in complete. Switch back to Sticky Todo.'
    }
  } catch (cause) {
    status.textContent = ''
    error.textContent = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(cause.code)
      ? 'Sign-in cancelled.' : cause.message
    button.textContent = signedIn ? 'Retry connection' : 'Continue with Google'
    button.disabled = false
  } finally {
    connecting = false
  }
}
