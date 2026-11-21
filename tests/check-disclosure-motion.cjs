const assert = require('node:assert/strict');
const {seedBridge, launch, testUrl} = require('./helpers/browser-fixture.cjs');

async function checkKeyboardDisclosure(button, key, expanded) {
  await button.press(key);
  const state = await button.evaluate(control => {
    const icon = control.querySelector('.step-disclosure-icon');
    const style = getComputedStyle(icon);
    const matrix = style.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform);
    return {
      angle: Math.round(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI),
      duration: style.transitionDuration,
      animations: icon.getAnimations().length,
      expanded: control.getAttribute('aria-expanded') === 'true',
    };
  });
  assert.deepEqual(state, {angle: expanded ? 90 : 0, duration: '0s', animations: 0, expanded});
}

(async () => {
  const browser = await launch();
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({reducedMotion, hasTouch:true, viewport:{width:390,height:740}});
      await context.addInitScript(seedBridge);
      const page = await context.newPage();
      await page.goto(testUrl);
      const button = page.locator('[data-reorder-id="release"]').getByRole('button',{name:/steps for/});
      await button.focus();
      await checkKeyboardDisclosure(button, 'Enter', true);
      await checkKeyboardDisclosure(button, 'Space', false);
      await button.tap();
      const duration = await button.locator('.step-disclosure-icon').evaluate(icon => getComputedStyle(icon).transitionDuration);
      assert.equal(duration, reducedMotion === 'reduce' ? '0s' : '0.15s');
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      await context.close();
    }
    console.log('Enter and Space reach their final angles immediately. Touch follows the reduced-motion setting.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
