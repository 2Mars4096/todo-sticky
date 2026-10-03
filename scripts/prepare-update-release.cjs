const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const version = require('../package.json').version
const root = process.argv[2]
const output = process.argv[3]
if (!root || !output) throw new Error('Usage: node scripts/prepare-update-release.cjs <artifacts> <output>')
fs.mkdirSync(output, { recursive: true })
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(dir, entry.name)
    return entry.isDirectory() ? files(name) : [name]
  })
}
const platforms = {}
for (const [runner, suffix, targets] of [
  ['macos-latest', '.app.tar.gz', ['darwin-aarch64', 'darwin-x86_64']],
  ['ubuntu-22.04', '.AppImage', ['linux-x86_64']],
  ['windows-latest', '.exe', ['windows-x86_64']],
]) {
  const assets = files(path.join(root, runner)).filter(file => /\.(sig|tar\.gz|dmg|exe|msi|AppImage|deb|rpm)$/.test(file))
  const updates = assets.filter(file => file.endsWith(suffix) && fs.existsSync(`${file}.sig`))
  assert.equal(updates.length, 1, `Expected one signed updater archive for ${runner}`)
  for (const file of assets) {
    const dest = path.join(output, path.basename(file))
    if (fs.existsSync(dest)) assert.ok(fs.readFileSync(dest).equals(fs.readFileSync(file)), `Conflicting asset name: ${dest}`)
    else fs.copyFileSync(file, dest)
  }
  const update = updates[0]
  const entry = {
    signature: fs.readFileSync(`${update}.sig`, 'utf8').trim(),
    url: `https://github.com/2Mars4096/todo-sticky/releases/download/v${version}/${encodeURIComponent(path.basename(update))}`,
  }
  for (const target of targets) platforms[target] = entry
}
fs.writeFileSync(path.join(output, 'latest.json'), JSON.stringify({
  version,
  notes: `Sticky Todo ${version}. See the GitHub release for changes.`,
  pub_date: new Date().toISOString(),
  platforms,
}, null, 2) + '\n')
console.log(`Prepared signed release ${version}`)
