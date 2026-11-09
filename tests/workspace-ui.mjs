const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:380,height:700},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto((process.env.TODO_TEST_URL||'http://127.0.0.1:15173')+'/tests/diane-ui.html');
 await page.getByRole('button',{name:'Inspect this project',exact:true}).click();
 const trigger=page.getByRole('button',{name:'Run in Diane · Choose workspace',exact:true});await trigger.click();
 const picker=page.getByRole('combobox',{name:'Diane workspace'});await picker.waitFor();assert.equal(await picker.inputValue(),'');assert.equal(await page.getByRole('button',{name:'Run in Diane',exact:true}).isEnabled(),false);
 await page.getByRole('button',{name:'Choose folder…',exact:true}).click();await page.waitForFunction(()=>document.querySelector('select')?.value==='chosen');assert.equal(await picker.inputValue(),'chosen');assert.equal(await page.evaluate(()=>calls.filter(x=>x.action==='choose-project').length),1);assert.equal(await page.evaluate(()=>calls.filter(x=>x.action==='dispatch').length),0);
 await picker.selectOption('project-a');assert.equal(await page.getByRole('button',{name:'Run in Diane',exact:true}).isEnabled(),true);
 await page.screenshot({path:'/private/tmp/todo-workspace-picker.png'});
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);await page.keyboard.press('Enter');await picker.waitFor();
 await page.getByRole('button',{name:'Run in Diane',exact:true}).dblclick();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>calls.filter(x=>x.action==='dispatch').length),1);
 await page.keyboard.press('Escape');await page.reload();await page.getByRole('button',{name:'Inspect this project',exact:true}).click();await page.getByRole('button',{name:'Running. Open details for Inspect this project'}).waitFor();assert.equal(await page.evaluate(()=>calls.filter(x=>x.action==='dispatch').length),0);
 await page.getByRole('button',{name:'ready',exact:true}).click();await page.getByRole('button',{name:'Result ready. Open details for ready'}).click();await page.getByRole('button',{name:'Open in Diane',exact:true}).click();assert.equal(await page.evaluate(()=>calls.filter(x=>x.action==='open').length),1);
 assert.deepEqual(errors,[]);console.log('PASS narrow keyboard picker, blank uncertain destination, explicit selection, one dispatch, reload-safe receipt, existing session open');
} finally {await browser.close()}
