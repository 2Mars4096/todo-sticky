const assert = require('node:assert/strict')
const fs = require('node:fs')
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const version = require('../package.json').version
assert.equal(manifest.version.replace(/^v/, ''), version, 'Updater version must match package.json')
assert.ok(!Number.isNaN(Date.parse(manifest.pub_date)), 'Publication date is required')
for (const platform of ['darwin-aarch64', 'darwin-x86_64', 'linux-x86_64', 'windows-x86_64']) {
  const entry = manifest.platforms[platform]
  assert.ok(entry?.signature?.trim(), `Missing signature: ${platform}`)
  const url = new URL(entry.url)
  assert.equal(url.origin, 'https://github.com')
  assert.ok(url.pathname.startsWith(`/2Mars4096/todo-sticky/releases/download/v${version}/`), `Wrong release URL: ${platform}`)
}
console.log(`Verified updater manifest for ${version} on all four targets`)
