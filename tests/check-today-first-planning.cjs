const assert = require('node:assert/strict')
const { seedBridge, launch, testUrl, screenshot } = require('./helpers/browser-fixture.cjs')
;(async () => {
  const browser=await launch()
  try {
    for (const width of [340,460]) {
      const context=await browser.newContext({viewport:{width,height:640}})
      await context.addInitScript(seedBridge)
      const page=await context.newPage();page.setDefaultTimeout(10000)
      const errors=[];page.on('pageerror',e=>errors.push(String(e)))
      await page.goto(testUrl)
      await page.getByRole('button',{name:'Plan',exact:true}).click()
      await page.getByRole('dialog',{name:'Plan day'}).waitFor()
      const makePlan=async mode => page.evaluate(mode=>{
        const s=window.__review
        const required=s.sections[s.today].filter(task=>!['done','stopped'].includes(task.status))
        const old=s.sections[s.yesterday][0]
        const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
        const block=(task,start,id=task.id)=>({taskId:id,parentTask:task.text,time:time(start),endTime:time(start+30),action:'Finish the next useful action',assignedTo:'human'})
        let schedule
        if(mode==='older-only') schedule=[block(old,540,s.yesterday+':'+old.id)]
        if(mode==='partial') schedule=[block(required[0],540)]
        if(mode==='displaced') schedule=[block(old,540,s.yesterday+':'+old.id),...required.map((t,i)=>block(t,570+i*30))]
        if(mode==='complete') schedule=[...required.map((t,i)=>block(t,540+i*30)),block(old,540+required.length*30,s.yesterday+':'+old.id)]
        s.scheduleResult={plan:mode==='partial'?'The available window cannot fit the remaining tasks.':'A proposed plan.',schedule}
        return required.map(t=>t.text)
      },mode)
      const generate=async ()=>{
        await page.getByRole('button',{name:/^Generate (another proposal|proposal)$/}).click()
        await page.locator('.day-plan-coverage').waitFor()
        await page.waitForFunction(()=>!document.querySelector('.day-plan-generate').disabled)
      }
      const before=await page.evaluate(()=>JSON.stringify(window.__review.sections))
      const required=await makePlan('older-only');await generate()
      assert.equal(await page.getByRole('button',{name:'Apply plan',exact:true}).isDisabled(),true)
      for(const text of required) assert.ok((await page.locator('.day-plan-coverage').innerText()).includes(text))
      const request=await page.evaluate(()=>window.__review.calls.filter(c=>c.cmd==='llm_schedule').at(-1).args)
      assert.ok(request.tasks.slice(0,required.length).every(t=>!t.sourceDate))
      assert.ok(request.tasks.slice(required.length).every(t=>t.sourceDate))
      await screenshot(page,`today-first-omissions-${width}`)
      assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(window.__review.sections))),JSON.parse(before))
      // Short windows keep missing commitments visible and never write a partial plan.
      await page.getByLabel('Until',{exact:true}).fill('09:30')
      await makePlan('partial');await generate()
      assert.equal(await page.getByRole('button',{name:'Apply plan',exact:true}).isDisabled(),true)
      assert.equal(await page.locator('.day-plan-coverage ul li').count(),required.length-1)
      await page.getByLabel('Until',{exact:true}).fill('17:00')
      await makePlan('displaced');await generate()
      assert.equal(await page.getByRole('button',{name:'Apply plan',exact:true}).isDisabled(),true)
      assert.ok((await page.locator('.day-plan-coverage').innerText()).includes('Earlier work is scheduled ahead'))
      await makePlan('complete');await generate()
      assert.equal(await page.getByRole('button',{name:'Apply plan',exact:true}).isEnabled(),true)
      await screenshot(page,`today-first-complete-${width}`)
      await page.getByRole('button',{name:'Apply plan',exact:true}).click()
      await page.waitForFunction(()=>window.__review.sections[window.__review.today].filter(t=>!['done','stopped'].includes(t.status)).every(t=>t.subtasks.some(s=>s.id.startsWith('plan_'))))
      await page.getByRole('button',{name:'Undo',exact:true}).click()
      await page.waitForTimeout(400)
      assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(window.__review.sections))),JSON.parse(before))
      // An empty Today allows useful backlog-only planning.
      await page.evaluate(()=>{const s=window.__review;s.sections[s.today]=[];s.emitFileChanged()})
      await page.waitForTimeout(200)
      await page.getByRole('button',{name:'Plan',exact:true}).click()
      await page.getByText('No unfinished tasks on this day.',{exact:false}).waitFor()
      await makePlan('older-only')
      await page.getByRole('button',{name:'Generate proposal',exact:true}).click()
      await page.waitForFunction(()=>document.querySelector('.day-plan-timeline'))
      assert.equal(await page.getByRole('button',{name:'Apply plan',exact:true}).isEnabled(),true)
      assert.deepEqual(errors,[])
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
      await context.close()
    }
    console.log('PASS current-day priority, grouped requests, visible omissions, short-window blocking, chronological priority, Apply/Undo and empty-Today fallback at 340/460px')
  } finally { await browser.close() }
})().catch(e=>{console.error(e);process.exitCode=1})
