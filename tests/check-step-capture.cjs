const assert = require('node:assert/strict')
const {launch, testUrl, seedBridge, screenshot} = require('./helpers/browser-fixture.cjs')

async function check(browser, width, nativeBridge, reducedMotion) {
  const context = await browser.newContext({viewport: {width, height: 800}, reducedMotion, locale: 'en-US'})
  try {
    if (nativeBridge) await context.addInitScript(seedBridge)
    const page = await context.newPage()
    await page.goto(testUrl)
    const name = 'Prepare local review'
    const capture = page.getByRole('textbox', {name: /^New (top-level )?task$/}).first()
    await capture.fill(name)
    await capture.press('Control+Enter')
    const title = page.getByRole('button', {name, exact: true})
    await title.click()
    const field = page.getByRole('textbox', {name: `New step for ${name}`})
    await field.fill('資料')
    await field.dispatchEvent('compositionstart')
    const add = page.locator('.task-step-composer').getByRole('button', {name: 'Add step', exact: true})
    assert(await add.isDisabled())
    await field.press('Control+Enter')
    assert.equal(await field.inputValue(), '資料')
    await field.dispatchEvent('compositionend')
    await field.fill('資料\n\nCheck totals')
    await add.click()
    assert(await field.evaluate(el => el === document.activeElement))
    assert.equal(await field.inputValue(), '')
    await page.keyboard.insertText('Second step')
    await field.press('Control+Enter')
    await field.press('Control+Enter')
    assert(await field.evaluate(el => el === document.activeElement))
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await screenshot(page, `step-capture-${nativeBridge ? 'mac-bridge' : 'browser'}-${width}`)
    // Wait for the notebook's ordinary asynchronous persistence before reopening.
    if (nativeBridge) {
      await page.waitForFunction(title => window.__review.sections[window.__review.today].find(t => t.text === title)?.subtasks.length === 2, name)
    } else {
      await page.waitForFunction(async title => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('dockit-notebook-v1')
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        try {
          const days = await new Promise((resolve, reject) => {
            const request = db.transaction('days').objectStore('days').getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          return days.flat().find(task => task.text === title)?.subtasks.length === 2
        } finally { db.close() }
      }, name)
    }
    await page.reload()
    await page.getByRole('button', {name: new RegExp(`Show steps for ${name}`)}).click()
    for (const text of ['資料 Check totals', 'Second step']) {
      const child = page.getByRole('button', {name: text, exact: true})
      await child.waitFor()
      assert.equal(await child.count(), 1)
    }
    console.log(`${nativeBridge ? 'Mac bridge' : 'Browser notebook'} ${width}px ${reducedMotion}: repeated steps persisted, focus and composition preserved.`)
  } finally { await context.close() }
}

;(async () => {
  const browser = await launch()
  try {
    for (const width of [360, 1100]) {
      for (const nativeBridge of [false, true]) {
        await check(browser, width, nativeBridge, width === 360 ? 'reduce' : 'no-preference')
      }
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
