const assert = require('node:assert/strict');
const { launch, testUrl, screenshot } = require('./helpers/browser-fixture.cjs');

(async () => {
  for (const width of [350, 460]) {
    const browser = await launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 740 } });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${testUrl}/tests/finish-ui.html`);
      await page.getByRole('button', { name: 'Today task', exact: true }).waitFor();
      const handle = name => page.getByRole('button', { name: `Reorder ${name}`, exact: true });
      const snapshot = () => page.evaluate(() => JSON.parse(JSON.stringify(fixture.sections)));
      const showEarlier = async () => {
        const button = page.getByRole('button', { name: /Earlier tasks/ });
        await button.waitFor();
        if (await button.getAttribute('aria-expanded') === 'false') await button.click();
        assert.equal(await button.getAttribute('aria-expanded'), 'true', 'One click opens Earlier tasks after selecting a row');
      };
      const showSteps = async name => {
        const button = page.getByRole('button', { name: new RegExp(`^Show steps for ${name}\\.`) });
        if (await button.count()) await button.click();
        await page.getByRole('button', { name: new RegExp(`^Hide steps for ${name}\\.`) }).waitFor();
      };
      const dragBefore = async (source, target) => {
        await source.scrollIntoViewIfNeeded();
        const from = await source.boundingBox();
        assert.ok(from, 'Source reorder handle is visible');
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        // Selection reveals actions; measure the target after that layout change.
        await page.evaluate(() => new Promise(requestAnimationFrame));
        await target.scrollIntoViewIfNeeded();
        const to = await target.boundingBox();
        assert.ok(to, 'Destination reorder handle is visible');
        await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 12 });
        await page.mouse.up();
      };
      const unchanged = async action => {
        const before = await snapshot();
        const writes = await page.evaluate(() => fixture.writes.length);
        await action();
        // A forbidden move must neither change the saved order nor queue a write.
        await page.waitForTimeout(400);
        assert.deepEqual(await snapshot(), before);
        assert.equal(await page.evaluate(() => fixture.writes.length), writes);
      };

      const input = page.getByRole('textbox', { name: 'New top-level task', exact: true });
      await input.fill('Second task');
      await input.press('Enter');
      await page.waitForFunction(() => fixture.sections[fixture.today].length === 2);
      await dragBefore(handle('Second task'), handle('Today task'));
      await page.waitForFunction(() => fixture.sections[fixture.today][0].text === 'Second task');
      await page.reload();
      await handle('Second task').waitFor();
      assert.equal(await page.evaluate(() => fixture.sections[fixture.today][0].text), 'Second task');
      await handle('Second task').focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => fixture.sections[fixture.today][0].text === 'Today task');
      await unchanged(async () => { await handle('Today task').focus(); await page.keyboard.press('ArrowUp'); });

      // Earlier tasks stay in their saved date, even when dropped onto today's rows.
      await showEarlier();
      await unchanged(async () => { await handle('Yesterday task').focus(); await page.keyboard.press('ArrowUp'); });
      await unchanged(() => dragBefore(handle('Yesterday task'), handle('Today task')));

      await showSteps('Today task');
      const step = page.getByRole('textbox', { name: 'New step for Today task', exact: true });
      await step.fill('Another today step');
      await step.press('Enter');
      await page.waitForFunction(() => fixture.sections[fixture.today][0].subtasks.length === 2);
      await dragBefore(handle('Another today step within Today task'), handle('Today step within Today task'));
      await page.waitForFunction(() => fixture.sections[fixture.today][0].subtasks[0].text === 'Another today step');
      await page.reload();
      await page.getByRole('button', { name: 'Today task', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => fixture.sections[fixture.today][0].subtasks[0].text), 'Another today step');
      await showSteps('Today task');
      await handle('Another today step within Today task').focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => fixture.sections[fixture.today][0].subtasks[0].text === 'Today step');
      await unchanged(async () => { await handle('Today step within Today task').focus(); await page.keyboard.press('ArrowUp'); });

      // Expanding two groups must not permit a step to move into a different parent.
      await showEarlier();
      await showSteps('Yesterday task');
      await unchanged(() => dragBefore(handle('Today step within Today task'), handle('First step within Yesterday task')));
      const final = await snapshot();
      await screenshot(page, `task-reorder-${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.reload();
      await page.getByRole('button', { name: 'Today task', exact: true }).waitFor();
      assert.deepEqual(await snapshot(), final);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  }
  console.log('PASS pointer/keyboard task and step reorder, date/parent boundaries, reload persistence and layout at 350px and 460px');
})().catch(error => { console.error(error.stack); process.exit(1); });
