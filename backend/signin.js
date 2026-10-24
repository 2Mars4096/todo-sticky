import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'
import { getAuth, GoogleAuthProvider, signInWithPopup, inMemoryPersistence, setPersistence, signOut } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'

const params = new URLSearchParams(location.hash.slice(1))
const sessionId = params.get('sessionId')
const challenge = params.get('challenge')
// Fragments never reach HTTP access logs; clear them once captured.
history.replaceState(null, '', '/signin')
const button = document.getElementById('signin')
const status = document.getElementById('status')
const error = document.getElementById('error')
let auth, signedIn
try {
  if (![sessionId, challenge].every(value => /^[A-Za-z0-9_-]{43}$/.test(value || ''))) throw new Error('Open Account settings in Sticky Todo and start a new sign-in.')
  const response = await fetch('/v1/config')
  const { firebase } = await response.json()
  auth = getAuth(initializeApp(firebase))
  await setPersistence(auth, inMemoryPersistence)
} catch (cause) { error.textContent = cause.message; button.disabled = true }

button.onclick = async () => {
  button.disabled = true
  error.textContent = ''
  try {
    if (!signedIn) {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      signedIn = (await signInWithPopup(auth, provider)).user
      // Explicit confirmation prevents an unexpected Google account being silently linked.
      status.textContent = `Connect Sticky Todo as ${signedIn.email}?`
      button.textContent = 'Connect this account'
      button.disabled = false
      return
    }
    const token = await signedIn.getIdToken()
    const response = await fetch('/v1/auth/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId, challenge }),
    })
    if (!response.ok) { const body = await response.json(); throw new Error(typeof body.detail === 'string' ? body.detail : 'Could not complete sign-in. Try again from the app.') }
    status.textContent = 'Account connected. Return to Sticky Todo to enable sync.'
    button.textContent = 'Connected'
    await signOut(auth)
  } catch (cause) { error.textContent = cause.message; button.disabled = false }
}
