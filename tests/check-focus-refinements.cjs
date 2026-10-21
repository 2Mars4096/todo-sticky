const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl, screenshot } = require('./helpers/browser-fixture.cjs')

// Run against a Vite or production preview URL using the shared helper's browser
// environment variables. Every case has its own browser and synthetic native data.
const taskTitle = 'Share the first usable todo-sticky release'
const report = {}

function instrumentGraphics({ failure } = {}) {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (failure === 'construction' && String(type).startsWith('webgl')) return null
    return originalGetContext.call(this, type, ...args)
  }

  window.__focusDraws = 0
  if (typeof WebGL2RenderingContext !== 'function') return
  for (const name of ['drawElements', 'drawArrays']) {
    const original = WebGL2RenderingContext.prototype[name]
    WebGL2RenderingContext.prototype[name] = function (...args) {
      window.__focusDraws += 1
      return original.apply(this, args)
    }
  }

  if (failure === 'shader') {
    const original = WebGL2RenderingContext.prototype.shaderSource
    const injectedContexts = new WeakSet()
    WebGL2RenderingContext.prototype.shaderSource = function (shader, source) {
      if (!injectedContexts.has(this) && this.getShaderParameter(shader, this.SHADER_TYPE) === this.FRAGMENT_SHADER) {
        source += '\nvoid deliberate_compile_failure( {'
        injectedContexts.add(this)
      }
      return original.call(this, shader, source)
    }
  }
}

async function withFocusCase(name, options, check) {
  const browser = await launch()
  try {
    const { failure, ...contextOptions } = options
    const context = await browser.newContext({
      viewport: { width: 460, height: 640 },
      timezoneId: 'Asia/Hong_Kong',
      ...contextOptions,
    })
    await context.addInitScript(seedBridge)
    await context.addInitScript(instrumentGraphics, { failure })
    const page = await context.newPage()
    page.setDefaultTimeout(20000)
    const pageErrors = []
    const warnings = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' || message.type() === 'warning') warnings.push(message.text())
    })

    await page.goto(testUrl)
    await page.getByRole('button', { name: taskTitle, exact: true }).click()
    await page.getByRole('button', { name: /^(Focus on|Focused task:) Share the first usable todo-sticky release$/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Star Focus Mode' })
    await dialog.waitFor()
    const result = await check({ page, dialog, warnings })
    assert.deepEqual(pageErrors, [], `${name} must not produce uncaught application errors`)
    report[name] = { ...result, warnings }
    console.log(`PASS Focus ${name}`)
  } finally {
    // Closing a context can terminate some serverless Chromium builds. Each case
    // closes its browser instead of reusing a potentially terminated process.
    await browser.close()
  }
}

async function assertTaskFocusRestored(page) {
  const title = page.getByRole('button', { name: taskTitle, exact: true })
  assert.equal(await title.evaluate(element => element === document.activeElement), true,
    'Closing Focus restores the task title when its contextual opener was removed')
}

async function assertSimplifiedMap(page) {
  await page.locator('.focus-map-notice').waitFor()
  assert.ok(await page.locator('.focus-map-fallback svg').count(), 'Graphics failure leaves a projected SVG map')
}

function writeReport() {
  if (!process.env.TODO_TEST_OUTPUT) return
  const fs = require('node:fs')
  const path = require('node:path')
  fs.mkdirSync(process.env.TODO_TEST_OUTPUT, { recursive: true })
  fs.writeFileSync(path.join(process.env.TODO_TEST_OUTPUT, 'focus-refinements.json'), JSON.stringify(report, null, 2))
}

;(async () => {
  await withFocusCase('rendering-and-session', {}, async ({ page, dialog, warnings }) => {
    await page.locator('.starmap-3d-canvas').waitFor()
    await page.waitForFunction(() => window.__focusDraws > 0)
    await page.waitForTimeout(400)
    assert.equal(await page.locator('.focus-map-notice').count(), 0)

    const close = page.getByRole('button', { name: 'Close Focus Mode', exact: true })
    assert.equal(await close.evaluate(element => element === document.activeElement), true)
    const controlCount = await dialog.locator('button:not([disabled])').count()
    for (let index = 0; index < controlCount + 2; index += 1) {
      await page.keyboard.press('Tab')
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true,
        'Tab stays within Focus, including after the last control')
    }
    await close.focus()
    await page.keyboard.press('Shift+Tab')
    assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true,
      'Shift+Tab wraps within Focus')

    const originalTask = await page.evaluate(() => structuredClone(window.__review.sections[window.__review.today].find(task => task.id === 'release')))
    await page.getByRole('button', { name: 'Start focus', exact: true }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor()
    await screenshot(page, 'focus-running')

    await page.locator('.starmap-3d-canvas').evaluate(canvas => {
      const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context')
      if (!extension) throw new Error('This browser must support WEBGL_lose_context for the context-loss regression')
      extension.loseContext()
    })
    await assertSimplifiedMap(page)
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await screenshot(page, 'focus-simplified-map')

    const drawsBeforeRetry = await page.evaluate(() => window.__focusDraws)
    await page.getByRole('button', { name: 'Try 3D again', exact: true }).click()
    await page.locator('.starmap-3d-canvas').waitFor()
    await page.waitForFunction(previous => window.__focusDraws > previous, drawsBeforeRetry)
    assert.equal(await page.locator('.focus-map-notice').count(), 0, 'Retry restores 3D after a recoverable context loss')
    await page.getByRole('button', { name: 'Finish session', exact: true }).click()
    await page.getByRole('button', { name: 'Back to tasks', exact: true }).waitFor()
    await page.waitForFunction(() => window.__review.star?.missionHistory?.length === 1)
    assert.deepEqual(await page.evaluate(() => window.__review.sections[window.__review.today].find(task => task.id === 'release')), originalTask,
      'Saving a focus session does not complete or modify the task outcome')
    await screenshot(page, 'focus-session-saved')

    await page.getByRole('button', { name: 'Back to tasks', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await assertTaskFocusRestored(page)
    const drawsAfterClose = await page.evaluate(() => window.__focusDraws)
    await page.waitForTimeout(300)
    assert.equal(await page.evaluate(() => window.__focusDraws), drawsAfterClose,
      'The recreated renderer stops drawing when Focus closes')
    assert.deepEqual(warnings.filter(message => /Shader Error|shader could not|redefinition|undeclared|Buffer size too small/i.test(message)), [],
      'Normal and recovered renderers compile their shaders and draw the live route without buffer errors')
    return { shaderCompilation: true, keyboardContainment: true, contextLossFallback: true, retry3D: true,
      pauseResume: true, taskOutcomeIndependent: true, focusRestoration: true, rendererCleanup: true }
  })

  for (const failure of ['construction', 'shader']) {
    await withFocusCase(`${failure}-failure`, { failure }, async ({ page }) => {
      await assertSimplifiedMap(page)
      await page.getByRole('button', { name: 'Start focus', exact: true }).click()
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
      await page.getByRole('button', { name: 'Resume', exact: true }).click()
      await page.getByRole('button', { name: 'Finish session', exact: true }).click()
      await page.getByRole('button', { name: 'Back to tasks', exact: true }).waitFor()
      await screenshot(page, `focus-${failure}-fallback`)
      return { projectedFallback: true, sessionControlsUsable: true }
    })
  }

  await withFocusCase('reduced-motion', { reducedMotion: 'reduce', viewport: { width: 340, height: 440 } }, async ({ page, dialog }) => {
    await page.locator('.starmap-3d-canvas').waitFor()
    await page.waitForFunction(() => window.__focusDraws > 0)
    await page.waitForTimeout(400)
    const before = await page.evaluate(() => window.__focusDraws)
    await page.waitForTimeout(700)
    const after = await page.evaluate(() => window.__focusDraws)
    assert.equal(after, before, 'Reduced motion does not run an idle WebGL animation loop')
    assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true,
      'Focus fits the minimum supported window width')
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await page.waitForFunction(previous => window.__focusDraws > previous, after)
    await screenshot(page, 'focus-reduced-motion-340')
    await page.getByRole('button', { name: 'Start focus', exact: true }).click()
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await assertTaskFocusRestored(page)
    await page.locator('.compact-focus-clock').waitFor()
    assert.equal(await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.action-bar > button')].map(node => node.getBoundingClientRect())
      return document.documentElement.scrollWidth <= innerWidth
        && boxes.every(box => box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight)
        && !boxes.some((a, index) => boxes.slice(index + 1).some(b => Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1))
    }), true, 'The active compact timer remains visible without overlapping footer controls')
    await screenshot(page, 'focus-active-compact-footer')
    return { idleDrawsBefore: before, idleDrawsAfter: after, cameraRedraw: true, narrowLayout: true, escapeRestoration: true, compactActiveTimer: true }
  })

  writeReport()
  console.log('PASS Focus shader rendering, graphics fallbacks and retry, modal keyboard access, independent session completion, reduced motion, and cleanup')
})().catch(error => {
  report.error = error.stack
  writeReport()
  console.error(error.stack)
  process.exitCode = 1
})
