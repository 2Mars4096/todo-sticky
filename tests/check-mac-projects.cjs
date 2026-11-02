const assert=require('node:assert/strict')
const {seedBridge,launch,testUrl,screenshot}=require('./helpers/browser-fixture.cjs')
;(async()=>{
 const browser=await launch()
 try{
  const context=await browser.newContext({viewport:{width:460,height:640},timezoneId:'Asia/Hong_Kong'})
  await context.addInitScript(seedBridge)
  await context.addInitScript(()=>{
   const s=window.__review
   localStorage.setItem('todo-sticky-note-material-v1','liquid')
   if(!localStorage.getItem('project-fixture-initialized')){
    localStorage.setItem('todo-sticky-goals-v1',JSON.stringify({sidebarCollapsed:true,targets:[{id:'g1',text:'Research project\nDescription from my phone.\nKeep the full paragraph.',done:false,plan:[{id:'phone_done',text:'Read the literature'},{id:'phone_next',text:'Draft the introduction'}]},{id:'g2',text:'Other project',done:false}],recurring:[]}))
    s.sections[s.today].push({id:'phone_done',text:'Read the literature',goalId:'g1',goalStepId:'phone_done',status:'done',subtasks:[]})
    localStorage.setItem('project-fixture-initialized','yes')
   }
   const original=window.__TAURI_INTERNALS__.invoke
   s.projectWrites=[]
   window.__TAURI_INTERNALS__.invoke=async(cmd,args)=>{
    if(cmd==='llm_project_plan'){
     if(s.projectDelayMs)await new Promise(resolve=>setTimeout(resolve,s.projectDelayMs))
     if(args.request.mode==='steps')return {steps:['Review citations']}
     const d=new Date(s.today+'T12:00:00');d.setDate(d.getDate()+1);s.projectTomorrow=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
     return {actions:[{stepId:null,text:'Prepare a short analysis',date:s.today,minutes:30},{stepId:null,text:'Share the draft',date:s.projectTomorrow,minutes:30}]}
    }
    if(cmd==='cloud_apply_day'){
     if(args.date===s.failProjectDate)throw 'Fixture project disk failure'
     assertFixture(JSON.stringify(s.sections[args.date]??[])===JSON.stringify(args.expectedTasks))
     s.sections[args.date]=structuredClone(args.tasks);s.projectWrites.push(args.date)
     localStorage.setItem('todo-sticky-test-fixture-v1',JSON.stringify({sections:s.sections,settings:s.settings,star:s.star}))
     return
    }
    return original(cmd,args)
   }
   function assertFixture(ok){if(!ok)throw 'Fixture stale date'}
  })
  const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',error=>errors.push(String(error)))
  await page.goto(testUrl)
  const open=async()=>{await page.getByRole('button',{name:'Goals',exact:true}).click();await page.getByRole('button',{name:/^Open project Research project/}).click();await page.getByRole('button',{name:'Refresh project',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.project-page').textContent.includes('Loading project…'))}
  await open()
  await page.getByText('Description from my phone. Keep the full paragraph.',{exact:true}).waitFor()
  assert.equal(await page.locator('.project-steps').getByText('Read the literature',{exact:true}).count(),1)
  assert.equal(await page.locator('.project-steps').getByText('Draft the introduction',{exact:true}).count(),1)
  assert.equal(await page.getByText('1/2 steps',{exact:true}).count(),1)
  await screenshot(page,'mac-project-phone-content')
  await page.getByLabel('New project step',{exact:true}).fill('Write abstract\nIn two paragraphs')
  await page.locator('.project-add').getByRole('button',{name:'Add',exact:true}).click()
  await page.getByRole('checkbox',{name:'Schedule Draft the introduction',exact:true}).check()
  await page.getByRole('button',{name:'Add to daily tasks (1)',exact:true}).click()
  await page.waitForFunction(()=>__review.sections[__review.today].some(task=>task.id==='phone_next'&&task.goalId==='g1'&&task.goalStepId==='phone_next'))
  await page.getByRole('button',{name:'Suggest steps',exact:true}).click()
  await page.getByRole('button',{name:'Add steps',exact:true}).click()
  await page.getByText('Review citations',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Plan across days',exact:true}).click()
  await page.getByRole('button',{name:'Generate proposal',exact:true}).click()
  await page.getByLabel('Proposed task 1',{exact:true}).fill('Prepare an edited analysis')
  await page.evaluate(()=>{__review.failProjectDate=__review.projectTomorrow})
  await screenshot(page,'mac-project-proposal')
  await page.getByRole('button',{name:'Add to daily tasks',exact:true}).click()
  await page.getByRole('button',{name:'Retry save',exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>__review.sections[__review.today].filter(task=>task.text==='Prepare an edited analysis').length),1)
  await page.evaluate(()=>{__review.failProjectDate=null})
  await page.getByRole('button',{name:'Retry save',exact:true}).click()
  await page.getByRole('button',{name:'Plan across days',exact:true}).waitFor()
  await page.waitForFunction(()=>!localStorage.getItem('todo-sticky-project-write-v1:/fixture/tasks'))
  assert.equal(await page.evaluate(()=>__review.sections[__review.today].filter(task=>task.text==='Prepare an edited analysis').length),1)
  assert.equal(await page.evaluate(()=>__review.sections[__review.projectTomorrow].filter(task=>task.text==='Share the draft').length),1)
  await page.locator('.project-steps li').filter({hasText:'Draft the introduction'}).getByRole('button',{name:/Open task/}).click()
  await page.waitForFunction(()=>document.activeElement?.textContent==='Draft the introduction')
  await page.locator('[data-task-id="dentist"] .task-text').click()
  await page.getByLabel('Project for Book a dentist appointment',{exact:true}).selectOption('g1')
  await page.waitForFunction(()=>__review.sections[__review.today].find(task=>task.id==='dentist').goalId==='g1')
  await page.getByRole('button',{name:'Progress',exact:true}).click()
  await page.getByLabel('Project filter',{exact:true}).selectOption('g1')
  await page.getByText(/Project plan \(all dates\):/).waitFor()
  assert.equal(await page.locator('.archive-results').getByText('Submit travel reimbursement',{exact:true}).count(),0)
  await page.getByRole('button',{name:'‹ Tasks',exact:true}).click()
  for(const width of [340,460,1000]){
   await page.setViewportSize({width,height:width===340?440:760});await page.waitForTimeout(250)
   if(width<=760)await open();else{await page.getByRole('button',{name:'Open goals',exact:true}).click();await page.getByRole('button',{name:/^Open project Research project/}).click()}
   await page.waitForTimeout(250);await screenshot(page,`mac-project-${width}`)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
   await page.getByRole('button',{name:'‹ Goals',exact:true}).click();await page.getByRole('button',{name:'Close goals',exact:true}).click()
  }
  await page.setViewportSize({width:340,height:640});await open()
  await page.evaluate(()=>{const sizes=[...document.querySelectorAll('.project-page *')].map(node=>[node,parseFloat(getComputedStyle(node).fontSize)]);sizes.forEach(([node,size])=>node.style.fontSize=`${size*1.5}px`)})
  await screenshot(page,'mac-project-enlarged');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await page.evaluate(()=>{__review.projectDelayMs=500})
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('todo-sticky-goals-v1')).targets[0].plan.length)
  await page.getByRole('button',{name:'Suggest steps',exact:true}).click()
  await page.getByRole('button',{name:'‹ Goals',exact:true}).click()
  await page.waitForTimeout(700)
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('todo-sticky-goals-v1')).targets[0].plan.length),before,'Leaving an AI request does not save a late response')
  assert.deepEqual(errors,[])
  console.log('PASS phone-created project description/steps, manual scheduling, AI review, partial-save retry, assignment, linked navigation, progress filter and compact/material layouts')
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
