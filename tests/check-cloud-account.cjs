const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl } = require('./helpers/browser-fixture.cjs')
;(async () => {
  const browser = await launch()
  try {
    const page = await browser.newPage({ viewport: { width: 340, height: 440 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(seedBridge)
    await page.route('https://sync.example.test/v1/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 1, firebase: {} }) }))
    await page.goto(testUrl)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
    await dialog.getByRole('button', { name: 'Account', exact: true }).click()
    await page.getByRole('heading', { name: 'Account' }).waitFor()
    const metrics = await dialog.evaluate(panel => {
      const nav = panel.querySelector('.settings-section-nav')
      return { fits: nav.scrollWidth <= nav.clientWidth + 1, panelFits: panel.getBoundingClientRect().bottom <= innerHeight }
    })
    assert.ok(metrics.fits, 'All six settings tabs fit the minimum desktop width')
    assert.ok(metrics.panelFits)
    await page.getByLabel('Service URL').fill('http://example.com')
    await page.getByRole('button', { name: 'Connect', exact: true }).click()
    await page.getByText('The sync service must use HTTPS.', { exact: true }).waitFor()
    await page.getByLabel('Service URL').fill('https://sync.example.test')
    await page.getByRole('button', { name: 'Connect', exact: true }).click()
    await page.getByText('The account service needs its Firebase web configuration before sign-in is available.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Continue with Google' }).isDisabled(), true)
    await page.getByRole('button', { name: 'Close settings' }).click()
    assert.ok(await page.getByText('Book a dentist appointment', { exact: true }).isVisible(), 'Cloud setup failure does not block local tasks')
    assert.deepEqual(errors, [])
    console.log('PASS account setup, origin validation, no-config state, 340px layout and standalone task containment')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
