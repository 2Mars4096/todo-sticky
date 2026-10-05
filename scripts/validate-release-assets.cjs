const assert = require('node:assert/strict')
const fs = require('node:fs')
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const release = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))
assert.equal(release.tagName, `v${manifest.version}`)
const base = `https://github.com/2Mars4096/todo-sticky/releases/download/${release.tagName}/`
for (const entry of Object.values(manifest.platforms)) {
  // Draft downloads use temporary untagged-* URLs until publication. Validate
  // their uploaded names against the final URL, then check real URLs afterward.
  const assets = release.assets.filter(asset => base + asset.name === entry.url)
  assert.equal(assets.length, 1, `Missing or ambiguous updater asset: ${entry.url}`)
  const asset = assets[0]
  assert.equal(asset.state, 'uploaded')
  assert.ok(asset.size > 0)
  assert.ok(release.assets.some(item => item.name === `${asset.name}.sig` && item.state === 'uploaded' && item.size > 0))
  if (!release.isDraft) assert.equal(asset.url, entry.url, 'Published updater URL mismatch')
}
console.log(`Verified ${release.isDraft ? 'draft asset names' : 'published asset URLs'} for ${release.tagName}`)
