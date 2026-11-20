const { execFileSync, spawn } = require('node:child_process')
const os = require('node:os')

const fs = require('node:fs')
const path = require('node:path')

const env = { ...process.env }
if (env.CI && env.CI !== 'true' && env.CI !== 'false') {
  env.CI = 'true'
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const args = ['tauri', 'build', ...process.argv.slice(2)]

// Bundle a native helper on local Mac builds. Cross-target builds supply a matching helper explicitly.
if (process.platform === 'darwin') {
  const candidates = env.FLAMESHOT_APP ? [path.resolve(env.FLAMESHOT_APP)] : [
    '/Applications/Dockit.app/Contents/Helpers/Flameshot.app',
    '/Applications/Sticky Todo.app/Contents/Helpers/Flameshot.app',
  ]
  const targetSpecified = args.some(arg => arg === '-t' || arg.startsWith('--target'))
  let helper = candidates.find(app => fs.existsSync(path.join(app, 'Contents/MacOS/flameshot')))
  if (env.FLAMESHOT_APP && !helper) throw new Error('FLAMESHOT_APP must point to a built Flameshot.app')
  const macOS = {}
  const profile = path.join(os.homedir(), 'Library/Application Support/Sticky Todo Signing')
  if (!env.CI && !env.APPLE_SIGNING_IDENTITY && fs.existsSync(profile)) {
    const identity = fs.readFileSync(path.join(profile, 'identity.sha1'), 'utf8').trim()
    if (!/^[0-9A-F]{40}$/i.test(identity)) throw new Error('Invalid local signing identity')
    const keychain = path.join(profile, 'signing.keychain-db')
    const secret = execFileSync('/usr/bin/security', ['find-generic-password', '-a', os.userInfo().username,
      '-s', 'com.todo-sticky.local-signing.keychain', '-w', path.join(os.homedir(), 'Library/Keychains/login.keychain-db')], { encoding: 'utf8' }).trim()
    // Keep the generated unlock secret off the command line and out of build logs.
    if (!/^[a-zA-Z0-9_-]+$/.test(secret) || /["\\\r\n]/.test(keychain)) throw new Error('Invalid signing keychain configuration')
    execFileSync('/usr/bin/security', ['-i'], {
      input: `unlock-keychain -p "${secret}" "${keychain}"\n`, stdio: ['pipe', 'ignore', 'ignore'],
    })
    macOS.signingIdentity = identity
    if (helper && (env.FLAMESHOT_APP || !targetSpecified)) {
      const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'sticky-signed-helper-'))
      process.on('exit', () => fs.rmSync(staging, { recursive: true, force: true }))
      const staged = path.join(staging, 'Flameshot.app')
      execFileSync('/usr/bin/ditto', [helper, staged])
      execFileSync('/usr/bin/codesign', ['--force', '--timestamp=none', '--keychain', keychain, '--sign', identity, staged])
      execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', staged])
      helper = staged
    }
  }
  if (helper && (env.FLAMESHOT_APP || !targetSpecified)) macOS.files = { 'Helpers/Flameshot.app': helper }
  if (Object.keys(macOS).length) args.push('--config', JSON.stringify({ bundle: { macOS } }))
}

const child = spawn(command, args, {
  env,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
