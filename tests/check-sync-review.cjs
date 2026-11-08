const assert = require('node:assert/strict')
const fs = require('node:fs')
const { launch, testUrl } = require('./helpers/browser-fixture.cjs')
;(async()=>{
 const browser=await launch()
 try {
  fs.mkdirSync('output/playwright/merge-review',{recursive:true})
  for(const width of [340,460,1000]) {
   const page=await browser.newPage({viewport:{width,height:640}}),errors=[]
   page.on('pageerror',error=>errors.push(error.message))
   await page.goto(testUrl+'/tests/conflict-review.html')
   const first=page.getByRole('group',{name:'Research question · Text',exact:true})
   const second=page.getByRole('group',{name:'Experiment plan · Text',exact:true})
   await first.getByRole('radio',{name:'This Mac Local research question',exact:true}).check()
   await second.getByRole('radio',{name:'Cloud Cloud experiment plan',exact:true}).check()
   assert.equal(await page.getByRole('button',{name:'Apply choices'}).isEnabled(),true)
   const before=await page.evaluate(()=>{
    const root=document.querySelector('main');root.scrollTop=root.scrollHeight
    window.__savedRadio=document.querySelector('input[type=radio]')
    window.__removed=0
    window.__observer=new MutationObserver(records=>{window.__removed+=records.reduce((n,r)=>n+r.removedNodes.length,0)})
    window.__observer.observe(document.querySelector('.cloud-item-conflicts'),{subtree:true,childList:true})
    return root.scrollTop
   })
   for(let i=0;i<8;i++) {
    await page.evaluate(async()=>{window.__conflictReview.background(true);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})
    assert.equal(await page.locator('.cloud-sync-progress').count(),0,'No progress panel during automatic checks')
    await page.evaluate(async()=>{window.__conflictReview.refresh();window.__conflictReview.background(false);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})
   }
   const after=await page.evaluate(()=>({scroll:document.querySelector('main').scrollTop,sameNode:window.__savedRadio===document.querySelector('input[type=radio]'),removed:window.__removed}))
   assert.equal(after.scroll,before,'Polling preserves scroll');assert.equal(after.sameNode,true,'Polling does not remount choices');assert.equal(after.removed,0)
   assert.equal(await first.getByRole('radio',{name:'This Mac Local research question',exact:true}).isChecked(),true)
   assert.equal(await second.getByRole('radio',{name:'Cloud Cloud experiment plan',exact:true}).isChecked(),true)
   await page.evaluate(()=>{window.__observer.disconnect();window.__conflictReview.changeSecond()})
   await page.getByRole('radio',{name:'Cloud New cloud experiment plan',exact:true}).waitFor()
   assert.equal(await first.getByRole('radio',{name:'This Mac Local research question',exact:true}).isChecked(),true,'Unchanged item choice survives a different item changing')
   assert.equal(await page.getByRole('button',{name:'Apply choices'}).isDisabled(),true,'A changed item requires a fresh choice')
   await page.getByRole('radio',{name:'Cloud New cloud experiment plan',exact:true}).check()
   await page.getByRole('button',{name:'Apply choices'}).click()
   const calls=await page.evaluate(()=>window.__conflictReview.calls)
   assert.deepEqual(calls[0].choices,{'/targets/a/text':'local','/targets/b/text':'cloud'})
   await page.locator('main').evaluate(el=>{el.scrollTop=0})
   await page.screenshot({path:`output/playwright/merge-review/review-${width}.png`,fullPage:true})
   assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true)
   assert.deepEqual(errors,[])
   await page.close()
  }
  console.log('Passed per-item mixed choices, unchanged-refresh DOM/scroll preservation, changed-item invalidation and compact/wide review')
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)})
