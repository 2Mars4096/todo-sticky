const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl, screenshot } = require('./helpers/browser-fixture.cjs')

const delay = page => page.waitForTimeout(400)
async function shellMetrics(page) {
  return page.evaluate(() => {
    const bounds = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
    const buttons = [...document.querySelectorAll('.action-bar > button, .provider-quick-control select')].filter(button => button.getClientRects().length)
    const boxes = buttons.map(button => ({ name: button.getAttribute('aria-label') || button.textContent.trim(), ...bounds(button) }))
    const overlap = boxes.some((a, i) => boxes.slice(i + 1).some(b => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1))
    return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
      center: bounds(document.querySelector('.sticky-container')),
      list: bounds(document.querySelector('.task-list')),
      composer: bounds(document.querySelector('.add-task')),
      boxes, overlap }
  })
}
async function assertDialogFocus(page, selector) {
  await page.waitForFunction(selector => document.querySelector(selector)?.contains(document.activeElement), selector, { timeout: 2000 })
  assert.equal(await page.evaluate(selector => document.querySelector(selector).contains(document.activeElement), selector), true)
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(i < 20 ? 'Tab' : 'Shift+Tab')
    assert.equal(await page.evaluate(selector => document.querySelector(selector).contains(document.activeElement), selector), true)
  }
}
async function capture(page, text) {
  await page.getByLabel('New task', { exact: true }).fill(text)
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
  await delay(page)
}
async function row(page, text) {
  const title = page.locator('.main-task .task-text').filter({ hasText: text }).first()
  await title.click()
  return title.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " task-entry ")][1]')
}
async function openPlan(page) {
  await page.getByRole('button', { name: 'Plan day', exact: true }).click()
  await page.getByRole('dialog', { name: 'Plan day' }).waitFor()
}
async function fixturePlan(page, blocks) {
  await page.evaluate(schedule => { window.__review.scheduleResult = { plan: 'A bounded proposed plan.', schedule } }, blocks)
}
const block = (action, time = '09:00', endTime = '09:30', taskId = 'figures') => ({ taskId, parentTask: 'Draft figures for the methods section', action, time, endTime, assignedTo: 'human' })

;(async () => {
  const browser = await launch()
  const page = await browser.newPage({ viewport: { width: 340, height: 440 }, timezoneId: 'Asia/Hong_Kong' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(seedBridge, { firstRun: true })
  const report = { sizes: [] }
  try {
    await page.goto(testUrl)
    await page.getByLabel('New task', { exact: true }).waitFor()
    await page.waitForFunction(() => window.__review?.calls.some(call => call.cmd === 'task_api_extract'))
    assert.equal(await page.getByRole('dialog').count(), 0, 'First launch begins with capture')
    await capture(page, 'First task without setup')
    assert.equal(await page.locator('.first-use-note').count(), 0)
    assert.equal(await page.evaluate(() => window.__review.calls.filter(call => call.cmd === 'llm_breakdown').length), 0)

    for (const size of [{ width: 340, height: 440 }, { width: 460, height: 640 }, { width: 1000, height: 760 }]) {
      await page.setViewportSize(size)
      await page.waitForTimeout(250)
      const metrics = await shellMetrics(page)
      assert.ok(metrics.documentWidth <= size.width)
      assert.equal(metrics.overlap, false)
      assert.ok(metrics.boxes.every(box => box.x >= 0 && box.right <= size.width && box.height >= 24 && box.width >= 24))
      assert.ok(metrics.composer.bottom < size.height)
      assert.ok(metrics.list.height >= 180)
      if (size.width <= 760) {
        assert.ok(metrics.center.width >= size.width - 4, 'Collapsed rails use no compact width')
        assert.equal(await page.getByLabel('Active AI provider').count(), 0)
        await page.getByRole('button', { name: 'Goals', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Focus', exact: true }).waitFor()
      }
      report.sizes.push(metrics)
      await screenshot(page, `shell-${size.width}`)
    }

    await page.getByRole('button', { name: 'Open goals', exact: true }).click()
    await page.getByRole('button', { name: 'Open Mission Control', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.mission-sidebar:not(.collapsed)')?.getBoundingClientRect().width >= 259)
    await page.waitForTimeout(250)
    report.wideExpanded = await shellMetrics(page)
    assert.equal(report.wideExpanded.overlap, false)
    assert.ok(report.wideExpanded.documentWidth <= 1000)
    assert.ok(report.wideExpanded.boxes.every(box => box.right <= report.wideExpanded.center.right && box.x >= report.wideExpanded.center.x))
    await screenshot(page, 'shell-wide-expanded')
    await page.getByRole('button', { name: 'Close goals', exact: true }).click()
    await page.getByRole('button', { name: 'Close Mission Control', exact: true }).click()

    await page.setViewportSize({ width: 340, height: 440 })
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor()
    await page.waitForTimeout(60)
    await assertDialogFocus(page, '.settings-refined')
    await page.getByRole('button', { name: 'AI assistance', exact: true }).click()
    assert.equal(await page.getByLabel('API base URL', { exact: true }).isVisible(), false)
    await page.getByText('Model and connection options', { exact: true }).click()
    assert.equal(await page.getByLabel('API base URL', { exact: true }).isVisible(), true)
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('button', { name: 'Settings', exact: true }).evaluate(node => node === document.activeElement), true)
    await page.getByRole('button', { name: 'Goals', exact: true }).click()
    await page.getByRole('heading', { name: 'Routines', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Close goals' }).click()

    // Deletion is reversible after disk save, without reverting unrelated work.
    const original = await page.evaluate(() => structuredClone(window.__review.sections[window.__review.today].find(task => task.id === 'release')))
    let selected = await row(page, 'Share the first usable todo-sticky release')
    await selected.getByRole('button', { name: /^More actions for/ }).click()
    await selected.getByRole('button', { name: /^Delete / }).click()
    await delay(page)
    await capture(page, 'Keep this later capture')
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await delay(page)
    const restored = await page.evaluate(() => window.__review.sections[window.__review.today])
    assert.deepEqual(restored.find(task => task.id === 'release'), original)
    assert.ok(restored.some(task => task.text === 'Keep this later capture'))

    // Failed writes stay visible, block date changes, and retry the latest memory.
    const dateBeforeFailure = await page.locator('.date-title-label').innerText()
    await page.evaluate(() => { window.__review.failSave = true })
    await capture(page, 'Recover this failed save')
    await page.locator('.task-save-error').waitFor()
    assert.equal(await page.evaluate(() => window.__review.sections[window.__review.today].some(task => task.text === 'Recover this failed save')), false)
    await page.getByRole('button', { name: 'Next day', exact: true }).click()
    assert.equal(await page.locator('.date-title-label').innerText(), dateBeforeFailure)
    await page.evaluate(() => { window.__review.failSave = false })
    await page.getByRole('button', { name: 'Retry save', exact: true }).click()
    await page.locator('.task-save-error').waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => window.__review.sections[window.__review.today].some(task => task.text === 'Recover this failed save')), true)
    await page.locator('.schedule-toast').click()

    const beforePlan = await page.evaluate(() => JSON.stringify(window.__review.sections))
    await openPlan(page)
    await page.waitForTimeout(50)
    await assertDialogFocus(page, '.day-plan-panel')
    await fixturePlan(page, [block('Second block', '10:00', '10:30'), block('First block', '09:00', '09:30')])
    await page.getByRole('button', { name: 'Generate proposal', exact: true }).click()
    await page.getByRole('button', { name: 'Apply plan', exact: true }).waitFor()
    await page.waitForFunction(() => document.querySelectorAll('.day-plan-timeline li').length === 2)
    assert.deepEqual(await page.locator('.day-plan-time').allTextContents(), ['09:00–09:30', '10:00–10:30'])
    assert.equal(await page.evaluate(() => JSON.stringify(window.__review.sections)), beforePlan)
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    assert.equal(await page.evaluate(() => JSON.stringify(window.__review.sections)), beforePlan)

    await openPlan(page)
    await fixturePlan(page, [block('Initial plan')])
    await page.getByRole('button', { name: 'Generate proposal', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.day-plan-timeline'))
    await page.getByRole('button', { name: 'Apply plan', exact: true }).click()
    await delay(page)
    const firstApplied = await page.evaluate(() => structuredClone(window.__review.sections[window.__review.today].find(task => task.id === 'figures')))
    assert.equal(firstApplied.subtasks.length, 3)
    assert.ok(firstApplied.subtasks[2].id.startsWith('plan_'))
    await openPlan(page)
    await fixturePlan(page, [block('Replacement plan', '11:00', '11:30')])
    await page.getByRole('button', { name: 'Generate proposal', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.day-plan-timeline'))
    await page.getByRole('button', { name: 'Apply plan', exact: true }).click()
    await delay(page)
    assert.equal(await page.evaluate(() => window.__review.sections[window.__review.today].find(task => task.id === 'figures').subtasks.length), 3)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await delay(page)
    assert.deepEqual(await page.evaluate(() => window.__review.sections[window.__review.today].find(task => task.id === 'figures')), firstApplied)

    // A native file refresh invalidates a preview rather than applying stale work.
    await openPlan(page)
    await fixturePlan(page, [block('Stale proposal')])
    await page.getByRole('button', { name: 'Generate proposal', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.day-plan-timeline'))
    await page.evaluate(() => {
      window.__review.sections[window.__review.today].push({ id: 'external', text: 'Changed outside the app', status: 'todo', subtasks: [] })
      window.__review.emitFileChanged()
    })
    await page.getByText('Tasks or planning details changed.', { exact: false }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Apply plan', exact: true }).isDisabled(), true)
    await page.getByRole('button', { name: 'Discard', exact: true }).click()

    // Selected date, available time and human-only machine list reach the bridge.
    await page.getByRole('button', { name: 'Next day', exact: true }).click()
    await page.waitForTimeout(150)
    await capture(page, 'A future task')
    const futureTask = await page.evaluate(() => Object.entries(window.__review.sections).flatMap(([date, tasks]) => tasks.map(task => ({ date, ...task }))).find(task => task.text === 'A future task'))
    await openPlan(page)
    await page.getByLabel('From', { exact: true }).fill('13:00')
    await page.getByLabel('Until', { exact: true }).fill('14:00')
    await fixturePlan(page, [{ ...block('Future work', '13:00', '13:30', futureTask.id), parentTask: futureTask.text }])
    await page.getByRole('button', { name: 'Generate proposal', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.day-plan-timeline'))
    const sent = await page.evaluate(() => window.__review.calls.filter(call => call.cmd === 'llm_schedule').at(-1).args)
    assert.equal(sent.dateStr, futureTask.date)
    assert.equal(sent.availableStart, '13:00')
    assert.equal(sent.availableEnd, '14:00')
    assert.deepEqual(sent.machines, [])
    await page.getByRole('button', { name: 'Discard', exact: true }).click()

    // Delayed responses after dismissal/date change are abandoned.
    await page.evaluate(() => { window.__review.scheduleDelayMs = 500 })
    await openPlan(page)
    await fixturePlan(page, [{ ...block('Discarded late work', '09:00', '09:30', futureTask.id), parentTask: futureTask.text }])
    await page.getByRole('button', { name: 'Generate proposal', exact: true }).click()
    await page.getByRole('button', { name: 'Close day plan' }).click()
    await page.getByRole('button', { name: 'Previous day', exact: true }).click()
    await page.waitForTimeout(650)
    assert.equal(await page.getByRole('dialog').count(), 0)
    assert.equal(await page.evaluate(() => JSON.stringify(window.__review.sections).includes('Discarded late work')), false)

    // A text-only enlargement fixture exercises wrap/reflow independently of GPU zoom.
    await page.evaluate(() => {
      const targets = [...document.querySelectorAll('body *')].filter(node => node instanceof HTMLElement)
      const sizes = targets.map(node => parseFloat(getComputedStyle(node).fontSize))
      targets.forEach((node, index) => { node.style.fontSize = `${sizes[index] * 2}px`; node.style.lineHeight = '1.4' })
    })
    await page.waitForTimeout(250)
    const enlarged = await shellMetrics(page)
    assert.equal(enlarged.overlap, false)
    assert.ok(enlarged.documentWidth <= 340)
    assert.ok(enlarged.boxes.every(box => box.right <= 340 && box.bottom <= 440))
    assert.equal(await page.locator('.date-title-label').evaluate(node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight), true, 'Enlarged date remains readable')
    await screenshot(page, 'shell-text-enlarged-200')
    report.enlarged = enlarged
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ passed: 'Capture-first shell, compact/wide layout, Settings keyboard, delete Undo, failed-save Retry, plan preview/Discard/Apply/replan/Undo, stale and late plans, selected date/time and 200% text reflow', report }, null, 2))
  } finally { await browser.close() }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1) })
