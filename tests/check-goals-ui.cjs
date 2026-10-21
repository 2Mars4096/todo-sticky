const assert = require('node:assert/strict');
const { launch, testUrl, screenshot } = require('./helpers/browser-fixture.cjs');

(async () => {
  const browser = await launch();
  try {
    // A fresh context keeps this localStorage fixture separate from real data.
    const context = await browser.newContext({ viewport: { width: 350, height: 640 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(`${testUrl}/tests/goals-ui.html`);
    const goal = page.getByRole('textbox', { name: 'Add a goal', exact: true });
    await goal.waitFor();
    await screenshot(page, 'goals-empty');
    assert.equal(await page.getByRole('button', { name: 'Add', exact: true }).count(), 0);
    await goal.fill('Publish a useful research note');
    await goal.press('Enter');
    const routine = page.getByRole('textbox', { name: 'Add a routine', exact: true });
    await routine.fill('Review next week');
    await routine.press('Enter');

    await page.getByRole('button', { name: 'Publish a useful research note', exact: true }).focus();
    await page.keyboard.press('Enter');
    const edit = page.getByRole('textbox', { name: 'Edit Publish a useful research note', exact: true });
    await edit.fill('Share a research note');
    await edit.press('Enter');
    await page.getByRole('button', { name: 'Complete Share a research note', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Reactivate Share a research note', exact: true }).waitFor();

    await page.getByRole('button', { name: 'Review next week', exact: true }).dblclick();
    const routineEdit = page.getByRole('textbox', { name: 'Edit Review next week', exact: true });
    await routineEdit.fill('Discard this change');
    await routineEdit.press('Escape');
    await page.getByRole('button', { name: 'Review next week', exact: true }).waitFor();
    await screenshot(page, 'goals-filled');
    await page.getByRole('button', { name: 'Delete Share a research note', exact: true }).click();
    await page.reload();
    await page.getByRole('textbox', { name: 'Add a goal', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Share a research note', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Review next week', exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('PASS compact goal/routine entry, keyboard edit, cancel, complete, delete and reload persistence');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack); process.exit(1); });
