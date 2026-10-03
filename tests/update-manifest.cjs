const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sticky-release-test-'))
try {
  for (const [runner,name] of [['macos-latest','Sticky Todo.app.tar.gz'],['ubuntu-22.04','sticky_2.1.0_amd64.AppImage'],['windows-latest','Sticky Todo_2.1.0_x64-setup.exe']]) {
    const dir=path.join(root,'in',runner,'release','bundle');fs.mkdirSync(dir,{recursive:true})
    fs.writeFileSync(path.join(dir,name),'fixture');fs.writeFileSync(path.join(dir,name+'.sig'),'signature-fixture')
  }
  let result=spawnSync(process.execPath,['scripts/prepare-update-release.cjs',path.join(root,'in'),path.join(root,'out')],{encoding:'utf8'})
  assert.equal(result.status,0,result.stderr)
  result=spawnSync(process.execPath,['scripts/validate-update-manifest.cjs',path.join(root,'out','latest.json')],{encoding:'utf8'})
  assert.equal(result.status,0,result.stderr)
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'out','latest.json')))
  assert.equal(manifest.platforms['darwin-aarch64'].url,manifest.platforms['darwin-x86_64'].url)
  assert.ok(manifest.platforms['darwin-aarch64'].url.includes('Sticky%20Todo.app.tar.gz'))
  fs.unlinkSync(path.join(root,'in','windows-latest','release','bundle','Sticky Todo_2.1.0_x64-setup.exe.sig'))
  result=spawnSync(process.execPath,['scripts/prepare-update-release.cjs',path.join(root,'in'),path.join(root,'bad')],{encoding:'utf8'})
  assert.notEqual(result.status,0)
  manifest.platforms['linux-x86_64'].url='https://example.org/fake.AppImage'
  fs.writeFileSync(path.join(root,'out','latest.json'),JSON.stringify(manifest))
  result=spawnSync(process.execPath,['scripts/validate-update-manifest.cjs',path.join(root,'out','latest.json')],{encoding:'utf8'})
  assert.notEqual(result.status,0)
  console.log('Passed release manifest checks: platform coverage, universal Mac mapping, URL encoding, missing signatures, and foreign URL rejection')
} finally { fs.rmSync(root,{recursive:true,force:true}) }
