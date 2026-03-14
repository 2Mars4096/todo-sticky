const { spawn } = require('node:child_process')

const env = { ...process.env }
if (env.CI && env.CI !== 'true' && env.CI !== 'false') {
  env.CI = 'true'
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const args = ['tauri', 'build', ...process.argv.slice(2)]

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
