const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl, screenshot } = require('./helpers/browser-fixture.cjs')
async function drag(page, source, target, cancel = false) {
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.evaluate(() => new Promise(requestAnimationFrame))
  await target.scrollIntoViewIfNeeded()
  const to = await target.boundingBox()
  await page.mouse.move(to.x + Math.min(15, to.width / 2), to.y + 2, { steps: 16 })
  if (cancel) await page.keyboard.press('Escape')
  await page.mouse.up()
}
;(async () => {
  const browser = await launch()
  try {
    for (const size of [{width:340,height:440},{width:460,height:640},{width:1000,height:760}]) {
      const context = await browser.newContext({ viewport:size, reducedMotion:'reduce' })
      await context.addInitScript(seedBridge)
      const page = await context.newPage()
      const errors = []; page.on('pageerror', e => errors.push(String(e)))
      await page.goto(testUrl)
      await page.getByRole('button', { name:'Settings', exact:true }).click()
      await page.getByRole('button', { name:'Style', exact:true }).click()
      for (const [material,label] of [['paper','Paper'],['frosted','Frosted glass'],['liquid','Liquid glass']]) {
        const choice = page.getByRole('button', { name:new RegExp(`^${label}`) })
        await choice.click()
        assert.equal(await choice.getAttribute('aria-pressed'), 'true')
        assert.equal(await page.locator('.app-shell').getAttribute('data-material'),material)
        await screenshot(page, `material-${material}-settings-${size.width}`)
        await page.getByRole('button', {name:'Close settings', exact:true}).click()
        await screenshot(page, `material-${material}-note-${size.width}`)
        await page.getByRole('button', { name:size.width <= 760 ? 'Goals' : 'Open goals', exact:true }).click()
        const surfaces = await page.evaluate(() => ({
          note:getComputedStyle(document.querySelector('.app-shell')).backgroundImage,
          goals:getComputedStyle(document.querySelector('.goals-sidebar')).backgroundImage,
        }))
        if(material !== 'paper') assert.equal(surfaces.goals,surfaces.note,'Goals must use the selected material in both compact and wide layouts')
        else assert.match(surfaces.goals,/linear-gradient/)
        await screenshot(page, `material-${material}-goals-${size.width}`)
        await page.getByRole('button', {name:'Close goals',exact:true}).click()

        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true)
        await page.reload()
        await page.locator('.app-shell').waitFor()
        assert.equal(await page.locator('.app-shell').getAttribute('data-material'),material)
        await page.getByRole('button', {name:'Settings',exact:true}).click()
        await page.getByRole('button', {name:'Style',exact:true}).click()
      }
      await page.getByRole('button', {name:'Close settings',exact:true}).click()
      // Short fixture leaves the boundary visible in the minimum-sized window.
      await page.evaluate(() => {
        const s=window.__review
        s.sections[s.today]=[s.sections[s.today][1]]
        const old=s.sections[s.yesterday][0]
        old.finish={doneWhen:'Keep the full result',by:s.today}
        old.subtasks=[{id:'keep-step',text:'Keep this done step',status:'done',subtasks:[]}]
        localStorage.setItem('todo-sticky-test-fixture-v1',JSON.stringify({sections:s.sections,settings:s.settings}))
        localStorage.setItem('todo-sticky-carried-open-v1','true')
      })
      await page.reload()
      const handle = text => page.getByRole('button',{name:`Reorder ${text}`,exact:true})
      const original = await page.evaluate(() => structuredClone(window.__review.sections[window.__review.yesterday][0]))
      const todayHandle=handle('Book a dentist appointment')
      const earlierHandle=handle('Decide which prototype to continue')
      await drag(page,earlierHandle,todayHandle,true)
      await page.waitForTimeout(350)
      assert.equal(await page.evaluate(() => window.__review.sections[window.__review.today].length),1)
      await drag(page,earlierHandle,todayHandle)
      await page.waitForFunction(() => window.__review.sections[window.__review.today][0]?.id==='prototype')
      const result=await page.evaluate(() => ({today:window.__review.sections[window.__review.today],old:window.__review.sections[window.__review.yesterday]}))
      assert.deepEqual(result.today[0],original)
      assert.equal(result.old.length,0)
      await page.reload(); await handle('Decide which prototype to continue').waitFor()
      assert.equal(await page.locator('[data-reorder-id="prototype"]').count(),1)
      // Empty Today has a stable drop surface, and moving via the handle's
      // keyboard interaction is available to people who cannot pointer-drag.
      await page.evaluate(() => {
        const s=window.__review
        s.sections[s.today]=[]
        localStorage.setItem('todo-sticky-test-fixture-v1',JSON.stringify({sections:s.sections,settings:s.settings}))
      })
      await page.reload()
      await drag(page,handle('Clarify the project landing page promise'),page.locator('.today-drop-zone'))
      await page.waitForFunction(() => window.__review.sections[window.__review.today][0]?.id==='landing')
      assert.equal(await page.locator('.today-drop-zone').count(),0)
      await page.reload()
      assert.equal(await page.evaluate(() => window.__review.sections[window.__review.older].length),0)
      assert.deepEqual(errors,[])
      await context.close()
    }
    const context=await browser.newContext({viewport:{width:460,height:640}})
    await context.addInitScript(seedBridge)
    const page=await context.newPage(); await page.goto(testUrl)
    await page.getByRole('button',{name:/Earlier tasks/}).click()
    await page.getByRole('button',{name:'Reorder Decide which prototype to continue',exact:true}).focus()
    await page.keyboard.press('ArrowUp')
    await page.waitForFunction(() => window.__review.sections[window.__review.today].some(t=>t.id==='prototype'))
    await page.getByRole('button',{name:'Clarify the project landing page promise',exact:true}).click()
    await page.getByRole('button',{name:'Move Clarify the project landing page promise to today',exact:true}).click()
    await page.waitForFunction(() => window.__review.sections[window.__review.today].some(t=>t.id==='landing'))
    await context.close()
    console.log('PASS earlier-to-Today pointer, empty destination, Escape, keyboard and move button; tree/metadata/reload; three persistent materials at 340/460/1000px')
  } finally { await browser.close() }
})().catch(error => { console.error(error);process.exitCode=1 })
