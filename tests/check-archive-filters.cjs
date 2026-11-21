const assert = require('node:assert/strict')
const {launch, seedBridge, testUrl} = require('./helpers/browser-fixture.cjs')

async function check(browser, width) {
  const page = await browser.newPage({viewport:{width,height:780}, locale:'en-US', hasTouch:width<440})
  try {
    await page.addInitScript(seedBridge)
    await page.addInitScript(() => {
      const goal = {id:'long-filter',text:'Research project ' + 'review timetable '.repeat(30),done:false}
      localStorage.setItem('todo-sticky-goals-v1',JSON.stringify({sidebarCollapsed:true,targets:[goal],recurring:[]}))
    })
    await page.goto(testUrl)
    await page.getByRole('button',{name:'Search tasks',exact:true}).click()
    const controls = page.locator('.archive-controls')
    const query = controls.getByRole('searchbox')
    const project = controls.getByRole('combobox',{name:'Project filter'})
    const status = controls.getByRole('combobox',{name:'Task status filter'})
    await project.selectOption('long-filter')
    await query.fill('missing fixture')
    await status.selectOption('done')
    const reset = page.getByRole('button',{name:'Reset filters'})
    await reset.waitFor()
    const overflow = await controls.evaluate(el=>el.scrollWidth-el.clientWidth)
    assert(overflow <= 1, 'Long project names must fit inside the actual filter group')
    if (width<440) {
      assert.equal((await project.boundingBox()).height,44)
      assert.equal((await project.boundingBox()).y,(await status.boundingBox()).y)
    }
    await reset.click()
    assert.equal(await project.inputValue(),'')
    assert.equal(await status.inputValue(),'all')
    assert.equal(await query.inputValue(),'')
    assert(await query.evaluate(el=>el===document.activeElement))
    await page.locator('.archive-results button').first().waitFor()
    assert.equal(await reset.count(),0)
    await page.keyboard.press('Escape')
    await page.getByRole('button',{name:'Progress',exact:true}).click()
    const date = controls.getByLabel('Progress date')
    await date.fill('2001-11-05')
    await status.selectOption('stopped')
    await reset.click()
    assert.equal(await date.inputValue(),'2001-11-05')
    assert(await date.evaluate(el=>el===document.activeElement))
    await page.getByText('No tasks on these dates.').waitFor()
  } finally { await page.close() }
}
;(async()=>{
  const browser=await launch()
  try {
    for (const width of [320,390,460,1100]) await check(browser,width)
    console.log('Archive filter containment, narrow grouping and reset focus passed at four widths.')
  } finally { await browser.close() }
})().catch(error=>{console.error(error);process.exitCode=1})
