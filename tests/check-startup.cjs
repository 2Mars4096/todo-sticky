const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl } = require('./helpers/browser-fixture.cjs')

;(async () => {
  const browser = await launch()
  try {
    const page = await browser.newPage({ viewport: { width: 460, height: 640 } })
    await page.addInitScript(seedBridge)
    await page.addInitScript(() => {
      window.__launchSignals = []
      const invoke = window.__TAURI_INTERNALS__.invoke
      window.__TAURI_INTERNALS__.invoke = async (command, args) => {
        if (command === 'frontend_ready') {
          const shell = document.querySelector('.app-shell')
          window.__launchSignals.push({ shell: !!shell, compact: shell?.classList.contains('is-compact'), boot: !!document.querySelector('#boot-surface'), buttons: [...document.querySelectorAll('.action-bar > button')].map(button => button.textContent.trim()) })
          return
        }
        // Optional native services must not hold the window invisible.
        if (command === 'get_star_focus_state' || command === 'get_settings') return new Promise(() => {})
        return invoke(command, args)
      }
    })
    await page.route('**/assets/index-*.js', async route => {
      await new Promise(resolve => setTimeout(resolve, 350))
      await route.continue()
    })
    await page.goto(testUrl, { waitUntil: 'commit' })
    assert.equal(await page.evaluate(() => window.__launchSignals.length), 0)
    await page.waitForFunction(() => window.__launchSignals.length === 1)
    const [signal] = await page.evaluate(() => window.__launchSignals)
    assert.equal(signal.shell, true)
    assert.equal(signal.compact, true)
    assert.equal(signal.boot, false)
    assert.ok(signal.buttons.includes('Plan'))
    await page.waitForTimeout(250)
    assert.equal(await page.evaluate(() => window.__launchSignals.length), 1)
    await page.close()

    const broken = await browser.newPage()
    await broken.addInitScript(seedBridge)
    await broken.route('**/assets/index-*.js', route => route.abort())
    await broken.goto(testUrl)
    assert.equal(await broken.locator('#boot-surface').count(), 1)
    assert.equal(await broken.evaluate(() => window.__review.calls.some(call => call.cmd === 'frontend_ready')), false)
    await broken.close()
    console.log('PASS: delayed startup reveals committed compact shell once; stalled optional services do not block readiness; missing module leaves native fallback in control')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
