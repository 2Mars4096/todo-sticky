#!/usr/bin/env node
// Production UI, disposable browser contexts, fictional data and sample AI only.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { seedBridge, launch, testUrl } = require('../tests/helpers/browser-fixture.cjs');
const out = path.resolve('output/playwright/readme');
fs.mkdirSync(out, { recursive: true });
const only = process.env.DEMO_SCENARIO;
function demoSeed({ version }) {
  const s = window.__review;
  const task = (id, text, subtasks = [], finish) => ({ id, text, status: 'todo', subtasks, ...(finish ? { finish } : {}) });
  s.sections[s.today] = [task('picnic', 'Plan a neighborhood picnic', [task('place', 'Choose a park'), task('snacks', 'Make a snack list')]), task('postcard', 'Design a thank-you postcard'), task('library', 'Return library books')];
  s.sections[s.yesterday] = [task('plants', 'Water the balcony plants')];
  s.sections[s.older] = [];
  localStorage.setItem('todo-sticky-goals-v1', JSON.stringify({ sidebarCollapsed: true, targets: [{ id: 'g1', text: 'Create a neighborhood garden', done: false }], recurring: [{ id: 'r1', text: 'Review the week', done: false }] }));
  s.settings.apiKey = 'sample-only'; s.settings.model = 'demo-model'; s.settings.kbPath = '/demo/Sticky Todo';
  s.scheduleResult = { plan: 'A little time for each next step.', schedule: [{ taskId: 'picnic', parentTask: 'Plan a neighborhood picnic', action: 'Compare two nearby parks', time: '09:00', endTime: '09:30', assignedTo: 'human' }, { taskId: 'postcard', parentTask: 'Design a thank-you postcard', action: 'Sketch the front of the card', time: '09:30', endTime: '10:00', assignedTo: 'human' }] };
  const invoke = window.__TAURI_INTERNALS__.invoke;
  window.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
    if (cmd === 'plugin:app|version') return version;
    if (cmd === 'llm_breakdown') return { subtasks: [{ text: 'Sketch two postcard layouts', estimatedMinutes: 15 }, { text: 'Choose colors and write a thank-you line', estimatedMinutes: 15 }, { text: 'Export one print-ready postcard', estimatedMinutes: 10 }] };
    return invoke(cmd, args);
  };
}
(async () => {
 const browser = await launch();
 try {
  for (const name of ['demo', 'planning', 'outcomes', 'focus', 'goals-settings']) {
   if (only && only !== name) continue;
   const context = await browser.newContext({ viewport: { width: 600, height: 720 }, timezoneId: 'Asia/Hong_Kong', recordVideo: { dir: out, size: { width: 600, height: 720 } } });
   await context.addInitScript(seedBridge); await context.addInitScript(demoSeed, { version: require('../package.json').version });
   const p = await context.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message)); p.setDefaultTimeout(10000);
   const pause = (ms = 1400) => p.waitForTimeout(ms);
   const button = name => p.getByRole('button', { name, exact: true });
   const row = id => p.locator(`[data-reorder-id="${id}"]`);
   const click = async locator => { await locator.hover(); await pause(350); await locator.click(); await pause(); };
   await p.goto(testUrl); await button('Plan a neighborhood picnic').waitFor(); await pause();
   if (name === 'demo') {
    const input = p.getByRole('textbox', { name: 'New top-level task' });
    await input.pressSequentially('Pick up picnic supplies', { delay: 70 }); await input.press('Enter'); await pause();
    await click(button('Design a thank-you postcard'));
    await click(button('Break Design a thank-you postcard into steps with AI'));
    const show = row('postcard').getByRole('button', { name: /Show steps/ }); if (await show.count()) await click(show);
    await pause(1800);
    await click(button('Return library books')); await click(button('Move Return library books to tomorrow'));
    await click(button('Next day')); await button('Return library books').waitFor(); await pause(1800);
   } else if (name === 'planning') {
    await click(button('Plan')); await p.getByLabel('From', { exact: true }).fill('09:00'); await p.getByLabel('Until', { exact: true }).fill('11:00'); await pause();
    await click(button('Generate proposal')); await p.locator('.day-plan-timeline').waitFor(); await pause(2500);
    await click(button('Apply plan')); await pause(); await click(button('Undo')); await pause();
   } else if (name === 'outcomes') {
    await click(button('Design a thank-you postcard')); await click(row('postcard').getByRole('button', { name: 'Add outcome', exact: true }));
    const input = p.getByRole('textbox', { name: 'Outcome', exact: true }); await input.pressSequentially('One postcard is ready to print.', { delay: 65 }); await input.press('Enter'); await pause();
    await click(row('postcard').getByRole('button', { name: 'Add due date', exact: true }));
    await p.getByLabel('Due date', { exact: true }).fill(await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate()+3); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })); await pause();
    await click(button('Save date')); await click(button('Plan a neighborhood picnic')); await pause(2000);
   } else if (name === 'focus') {
    await click(button('Design a thank-you postcard')); await click(button('Focus on Design a thank-you postcard'));
    await p.getByRole('dialog', { name: 'Star Focus Mode' }).waitFor(); await pause(1800);
    await p.locator('.starmap-3d-canvas').scrollIntoViewIfNeeded(); await pause(2200);
    await click(button('Start focus')); await pause(2200); await click(button('Pause')); await click(button('Resume')); await pause(1800);
    await click(button('Finish session')); await button('Back to tasks').waitFor(); await pause(1800); await click(button('Back to tasks'));
   } else {
    await click(button('Goals')); const goal = p.getByRole('textbox', { name: 'Add a goal', exact: true }); await goal.pressSequentially('Host a monthly drawing club', { delay: 65 }); await goal.press('Enter'); await pause();
    const routine = p.getByRole('textbox', { name: 'Add a routine', exact: true }); await routine.pressSequentially('Tidy the art desk', { delay: 65 }); await routine.press('Enter'); await pause();
    await click(button('Close goals')); await click(button('Settings'));
    for (const label of ['AI', 'Integrations', 'Updates', 'Storage']) { const tab = p.getByRole('button', { name: label, exact: true }); await click(tab); }
    await click(button('Cancel'));
   }
   await p.screenshot({ path: path.join(out, `${name}-final.png`) });
   assert.deepEqual(errors, []); const video = p.video(); await context.close(); const raw = await video.path();
   const mp4 = path.resolve('demo', `${name}.mp4`);
   let r = spawnSync('ffmpeg', ['-y','-hide_banner','-loglevel','error','-i',raw,'-vf','fps=15','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4], { stdio: 'inherit' }); if(r.status) throw Error('MP4 encoding failed');
   r = spawnSync('ffmpeg', ['-y','-hide_banner','-loglevel','error','-i',mp4,'-filter_complex','fps=10,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.resolve('demo',`${name}.gif`)], { stdio: 'inherit' }); if(r.status) throw Error('GIF encoding failed');
   console.log(`Recorded ${name}`);
  }
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
