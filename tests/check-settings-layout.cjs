const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl } = require('./helpers/browser-fixture.cjs')
;(async () => {
  const browser = await launch()
  try {
    const page = await browser.newPage()
    await page.addInitScript(seedBridge)
    await page.goto(testUrl)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
    for (const [width, height] of [[340, 440], [460, 640], [1000, 800]]) {
      await page.setViewportSize({ width, height })
      let initial
      for (const label of ['Storage', 'AI', 'Integrations', 'Updates']) {
        await dialog.getByRole('button', { name: label, exact: true }).click()
        const metrics = await dialog.evaluate(panel => {
          const box = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom, right:r.right } }
          const nav = panel.querySelector('.settings-section-nav')
          return { panel:box(panel), footer:box(panel.querySelector('.btn-row')), tabs:[...nav.children].map(box), nav:box(nav), overflow:nav.scrollWidth>nav.clientWidth }
        })
        if (!initial) initial = metrics
        assert.deepEqual(metrics.panel, initial.panel)
        assert.deepEqual(metrics.footer, initial.footer)
        assert.ok(metrics.tabs.every(tab => Math.abs(tab.y - metrics.tabs[0].y) < 1))
        assert.equal(metrics.overflow, false)
        assert.ok(metrics.panel.y >= 0 && metrics.panel.bottom <= height)
        if (label === 'AI') {
          await dialog.getByText('Model and connection options', { exact:true }).click()
          assert.deepEqual(await dialog.boundingBox(), {x:initial.panel.x,y:initial.panel.y,width:initial.panel.width,height:initial.panel.height})
          await dialog.getByText('Model and connection options', { exact:true }).click()
        }
      }
    }
    await page.setViewportSize({width:460,height:640})
    await dialog.getByRole('button',{name:'AI',exact:true}).click()
    await page.screenshot({path:'/private/tmp/todo-settings-stable.png'})
    console.log('PASS single-row Settings navigation and invariant panel/footer geometry across four sections at 340, 460 and 1000px; expanded AI options remain inside fixed bounds')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
