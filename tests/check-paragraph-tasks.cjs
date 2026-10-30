const assert = require('node:assert/strict');
const { seedBridge, launch, testUrl, screenshot } = require('./helpers/browser-fixture.cjs');
(async () => {
 const browser = await launch();
 try {
  for (const width of [340, 460, 1000]) {
   const context = await browser.newContext({viewport: {width, height: 740}});
   await context.addInitScript(seedBridge);
   const page = await context.newPage();
   await page.goto(testUrl);
   const capture = page.getByRole('textbox', {name: 'New top-level task', exact: true});
   await capture.waitFor();
   await capture.fill('Research revision');
   await capture.press('Enter');
   await capture.press('Enter');
   await capture.press('End');
   await page.keyboard.insertText('Keep this reasoning beside the task. '.repeat(12) + '\n- [ ] This remains prose');
   const text = await capture.inputValue();
   assert(text.includes('\n\n'));
   assert(await capture.evaluate(el => el.clientHeight > 50));
   await screenshot(page, `paragraph-draft-${width}`);
   await page.locator('button[aria-label="Add task"]:enabled').click();
   await page.waitForFunction(text => __review.sections[__review.today].some(t => t.text === text), text);
   const title = page.getByRole('button', {name: text, exact: true});
   await title.dblclick();
   const editor = page.getByRole('textbox', {name: `Edit title: ${text}`, exact: true});
   await editor.fill(text + '\nAn extra thought');
   await page.getByRole('button', {name: 'Save', exact: true}).click();
   const edited = text + '\nAn extra thought';
   await page.waitForFunction(text => __review.sections[__review.today].some(t => t.text === text), edited);
   await page.getByRole('button', {name: edited, exact: true}).click();
   const step = page.getByRole('textbox', {name: `New step for ${edited}`, exact: true});
   await step.fill('First step\n\nDetailed explanation');
   await step.press('Control+Enter');
   await page.waitForFunction(text => __review.sections[__review.today].find(t => t.text === text)?.subtasks[0]?.text === 'First step\n\nDetailed explanation', edited);
   assert.equal(await page.getByRole('button', {name: edited, exact: true}).evaluate(el => getComputedStyle(el).whiteSpace), 'pre-wrap');
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   await screenshot(page, `paragraph-saved-${width}`);
   await context.close();
  }
 } finally { await browser.close(); }
 console.log('Paragraph capture/edit/save/steps and 340/460/1000px layouts passed');
})().catch(error => { console.error(error); process.exit(1); });
