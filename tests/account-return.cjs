const assert = require('node:assert/strict')
const fs = require('node:fs')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const source = fs.readFileSync('backend/signin.js', 'utf8').replace(/^import .*$/gm, '')
const user = { email: 'person@example.test', getIdToken: async () => 'fixture-token' }
async function setup({ target = 'app', failed = false, failureStatus = 500, cleanupFails = false, cleanupHangs = false, blocked = false, google } = {}) {
  const nodes = Object.fromEntries(['signin', 'status', 'error', 'return'].map(id => [id, { hidden: id === 'return', disabled: false, textContent: '' }]))
  const jumps = [], requests = []
  const state = { failed, popups: 0, provider: null, reloads: 0, events: {} }
  const params = new URLSearchParams({ sessionId: 's'.repeat(43), challenge: 'c'.repeat(43) })
  if (target !== null) params.set('returnTo', target)
  const environment = {
    URLSearchParams, location: { hash: '#' + params }, history: { replaceState() { environment.location.hash = '' } },
    document: { getElementById: id => nodes[id] },
    window: { addEventListener(name, handler) { state.events[name] = handler }, location: { reload() { state.reloads++ }, assign(url) { if (blocked) throw Error('User gesture required'); jumps.push(url) } } },
    initializeApp: () => ({}), getAuth: () => ({}), inMemoryPersistence: {}, setPersistence: async () => {},
    GoogleAuthProvider: class { setCustomParameters(value) { state.provider = value } },
    signInWithPopup: async () => { state.popups++; return google ? await google() : { user } },
    signOut: async () => { if (cleanupFails) throw Error('Cleanup failure'); if (cleanupHangs) await new Promise(() => {}) },
    fetch: async (path, options) => {
      if (path === '/v1/config') return { json: async () => ({ firebase: {} }) }
      requests.push({ path, options })
      return { ok: !state.failed, status: state.failed ? failureStatus : 200, json: async () => ({ detail: 'Confirmation failed' }) }
    },
  }
  await new AsyncFunction('env', `const {${Object.keys(environment).join(',')}} = env; ${source}`)(environment)
  assert.equal(state.popups, 0, 'Page load must not start Google sign-in')
  assert.equal(requests.length, 0, 'Page load must not link any account')
  return { nodes, jumps, requests, state, location: environment.location, click: () => nodes.signin.onclick() }
}
;(async () => {
  for (const options of [{}, { cleanupFails: true }, { cleanupHangs: true }]) {
    const rig = await setup(options)
    await rig.click()
    assert.equal(rig.requests.length, 1, 'One click plus Google success must finish the handoff without a second confirmation')
    assert.equal(rig.requests[0].path, '/v1/auth/complete')
    assert.deepEqual(JSON.parse(rig.requests[0].options.body), { sessionId: 's'.repeat(43), challenge: 'c'.repeat(43) })
    assert.deepEqual(rig.state.provider, { prompt: 'select_account' })
    assert.deepEqual(rig.jumps, ['todo-sticky://account-return'])
    assert.equal(rig.nodes.return.hidden, false)
    assert.equal(rig.nodes.return.href, 'todo-sticky://account-return')
    assert.equal(rig.nodes.signin.hidden, true)
    await rig.click()
    assert.equal(rig.requests.length, 1, 'Completed handoff must not be submitted again')
  }
  const reused = await setup()
  reused.state.events.hashchange()
  assert.equal(reused.state.reloads, 0, 'Clearing the fragment must not reload')
  reused.location.hash = '#sessionId=new-request'
  reused.state.events.hashchange()
  assert.equal(reused.state.reloads, 1, 'A new app request in the same tab must discard the old challenge')
  let releaseGoogle
  const waiting = await setup({ google: () => new Promise(resolve => { releaseGoogle = resolve }) })
  const pending = waiting.click()
  await waiting.click()
  assert.equal(waiting.state.popups, 1, 'Duplicate clicks must not open another Google request')
  assert.equal(waiting.requests.length, 0, 'No handoff before Google succeeds')
  releaseGoogle({ user }); await pending
  assert.equal(waiting.requests.length, 1)
  const cancelled = await setup({ google: () => Promise.reject({ code: 'auth/popup-closed-by-user' }) })
  await cancelled.click()
  assert.equal(cancelled.requests.length, 0)
  assert.equal(cancelled.nodes.signin.disabled, false)
  assert.equal(cancelled.nodes.error.textContent, 'Sign-in cancelled.')
  const blocked = await setup({ blocked: true }); await blocked.click()
  assert.equal(blocked.nodes.return.hidden, false)
  assert.equal(blocked.nodes.error.textContent, '')
  for (const failureStatus of [500, 403]) {
    const failed = await setup({ failed: true, failureStatus }); await failed.click()
    assert.equal(failed.jumps.length, 0)
    assert.equal(failed.nodes.return.hidden, true)
    assert.equal(failed.nodes.signin.disabled, false)
    assert.equal(failed.nodes.error.textContent, 'Confirmation failed')
    assert.equal(failed.nodes.signin.textContent, failureStatus === 403 ? 'Continue with Google' : 'Retry connection')
    failed.state.failed = false; await failed.click()
    assert.equal(failed.requests.length, 2)
    assert.equal(failed.state.popups, failureStatus === 403 ? 2 : 1)
    assert.equal(failed.jumps.length, 1)
  }
  for (const target of [null, 'https://evil.example/', 'todo-sticky://other']) {
    const legacy = await setup({ target }); await legacy.click()
    assert.deepEqual(legacy.jumps, [])
    assert.equal(legacy.nodes.return.hidden, true)
    assert.match(legacy.nodes.status.textContent, /Switch back/)
  }
  console.log('Passed single-action Google completion, explicit chooser, no premature handoff, retries/cancellation, cleanup independence and safe native return')
})().catch(error => { console.error(error); process.exit(1) })
