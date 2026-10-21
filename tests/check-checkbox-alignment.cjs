const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl } = require('./helpers/browser-fixture.cjs')
;(async () => {
  const browser = await launch()
  try {
    const page = await browser.newPage({ viewport:{width:460,height:640} })
    await page.addInitScript(seedBridge)
    await page.goto(testUrl)
    await page.getByRole('button',{name:'Show steps for Share the first usable todo-sticky release. 1 of 3 done',exact:true}).click()
    for (const width of [340,460]) {
      await page.setViewportSize({width,height:640})
      const metrics = await page.locator('.task-item:not(.other-date)').evaluateAll(rows => rows.map(row => {
        const check=row.querySelector('.task-checkbox'), title=row.querySelector('.task-title-line')
        const square=getComputedStyle(check,'::before'), text=getComputedStyle(title)
        const a=check.getBoundingClientRect(), b=title.getBoundingClientRect()
        return {size:parseFloat(square.height),font:parseFloat(text.fontSize),hit:a.width,background:getComputedStyle(check).backgroundColor,delta:Math.abs(a.y+a.height/2-(b.y+parseFloat(text.lineHeight)/2))}
      }))
      assert.ok(metrics.some(item=>item.font===13))
      for (const item of metrics) {assert.equal(item.size,item.font);assert.equal(item.hit,24);assert.equal(item.background,'rgba(0, 0, 0, 0)');assert.ok(item.delta<1)}
    }
    const check=page.getByRole('button',{name:'Book a dentist appointment. Status todo. Change status',exact:true})
    // Outer click target remains interactive beyond the smaller painted square.
    await check.click({position:{x:2,y:12}})
    await page.getByRole('button',{name:'Book a dentist appointment. Status done. Change status',exact:true}).waitFor()
    await page.screenshot({path:'/private/tmp/todo-checkbox-alignment.png'})
    console.log('PASS matching checkbox/title sizes and first-line centering for roots/steps at 340/460px, with working 24px click targets')
  } finally { await browser.close() }
})().catch(error=>{console.error(error);process.exit(1)})
