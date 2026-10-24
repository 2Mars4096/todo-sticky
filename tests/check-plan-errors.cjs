const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl } = require('./helpers/browser-fixture.cjs')

;(async () => {
  const browser = await launch()
  try {
    const context = await browser.newContext({ viewport: { width: 460, height: 720 } })
    await context.addInitScript(seedBridge)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    await page.goto(testUrl)
    await page.getByRole('button', { name: 'Plan', exact: true }).click()
    await page.evaluate(() => {
      const invoke = window.__TAURI_INTERNALS__.invoke
      window.__TAURI_INTERNALS__.invoke = async (command, args) => {
        if (command === 'llm_schedule') throw 'API error: the selected model is unavailable'
        return invoke(command, args)
      }
    })
    await page.getByRole('button', { name: 'Generate proposal', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'API error: the selected model is unavailable' }).waitFor()
    assert.equal(await page.getByText('Check AI assistance in Settings', { exact: false }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Apply plan', exact: true }).isDisabled(), true)
    assert.equal(await page.evaluate(() => window.__review.writes.length), 0)
    await page.getByRole('button', { name: 'Close day plan', exact: true }).click()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('button', { name: 'AI', exact: true }).click()
    await page.getByLabel('Todo API key', { exact: true }).fill('synthetic-new-key')
    await page.getByRole('button', { name: 'Test connection', exact: true }).click()
    await page.getByText('Connected. Save to use these settings.', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.log('Passed planning native-string errors, no failed-plan mutation and unsaved connection-test UI checks')
  } finally {
    await browser.close()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
