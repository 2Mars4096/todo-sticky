// Embedded only in a separately identified, offline QA build.
(async()=>{
 const wait=ms=>fetch(REVIEW_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({wait:Math.min(ms,450)})});
 async function until(fn){for(let i=0;i<40;i++){const r=fn();if(r)return r;await wait(40)}throw Error('Expected Dockit control unavailable')}
 const $=s=>document.querySelector(s);
 const send=message=>fetch(REVIEW_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(message)});
 try{
  const folder=await window.__TAURI_INTERNALS__.invoke('cloud_task_folder');
  if(folder!==REVIEW_KB)throw Error('Synthetic notebook isolation check failed');
  await send({start:true,folder,agent:navigator.userAgent});
  await until(()=>$('#quick-add-task'));
  await until(()=>$('.task-steps-toggle')); // the native CLI seeded this exact parent and step before launch
  const snap=async(state,scope='body')=>{
   if(document.visibilityState!=='visible'){await send({activate:true});await wait(220);}
   await wait(110);
   const items=REVIEW_EXTRACT(scope); if(!items.length)throw Error('Empty state '+state);
   await send({locale:tag,cycle,state,items,visible:document.visibilityState,viewport:[innerWidth,innerHeight]});
  };
  let tag,cycle;const resume=await (await send({resume:true})).json();let completedThisLaunch=0;
  for(tag of ['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']){
   for(cycle=1;cycle<=5;cycle++){
    if(resume.includes(tag+'/'+cycle))continue;
    try{
     const globe=$('.interface-language select');globe.value=tag;globe.dispatchEvent(new Event('change',{bubbles:true}));
     await until(()=>document.documentElement.lang===tag);
     const entry=$('#quick-add-task');entry.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));entry.focus();await wait(100);
     await snap('notebook');
     const disclosure=$('.task-steps-toggle');
     if(disclosure){disclosure.click();await snap('task-tree');disclosure.click();}
     const title=$('.task-text[role="button"]');
     if(title){title.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));await snap('editing-task');const ed=$('.task-inline-edit');if(ed)ed.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));}
     const picker=$('.pd-switch');if(picker){picker.click();await until(()=>$('.pd-picker[open]'));await snap('app-switcher','.pd-picker');$('.pd-close').click();}
     const goals=$('.compact-goals-entry');if(goals){goals.click();await wait(230);await snap('goals','#goals-panel');$('#goals-panel .sidebar-toggle')?.click();}
     const focus=$('.compact-focus-entry')||$('.mission-mini-open');
     if(focus){focus.click();await until(()=>$('.tracking-overlay'));await snap('focus','.tracking-overlay');const close=[...document.querySelectorAll('.tracking-overlay button')].find(b=>b.getAttribute('aria-label')===REVIEW_CAPTIONS[tag]['Close Focus Mode']);if(close)close.click();else $('.tracking-overlay').click();await wait(120);}
     const plan=[...document.querySelectorAll('.action-bar button')].find(b=>b.textContent.trim()===REVIEW_CAPTIONS[tag].Plan);
     if(plan&&!plan.disabled){plan.click();await until(()=>$('.day-plan-overlay'));await snap('day-plan','.day-plan-overlay');$('.day-plan-overlay').click();await wait(110);}
     $('.date-title').click();await until(()=>$('.calendar-popup'));await snap('calendar','.calendar-popup');$('.date-title').click();await wait(50);
     for(const [i,label] of ['search','progress'].entries()){
      document.querySelectorAll('.workflow-entry')[i].click();await until(()=>$('.archive-page'));await snap(label,'.archive-page');
      $('.archive-heading button').click();await until(()=>$('.date-title'));
     }
     $('.gear').click();await until(()=>$('.settings-panel'));
     const tabs=[...document.querySelectorAll('.settings-panel nav button')];
     for(let i=0;i<tabs.length;i++){tabs[i].click();await snap('settings-tab-'+i,'.settings-panel');const ds=[...document.querySelectorAll('.settings-panel details')].filter(x=>x.getClientRects().length);for(let j=0;j<Math.min(2,ds.length);j++){ds[j].open=true;await snap('settings-tab-'+i+'-details-'+j,'.settings-panel');ds[j].open=false;}}
     const close=document.querySelector('.settings-panel .settings-close') || document.querySelector('.settings-panel header button') || document.querySelector('.settings-panel button');
     close.click();await until(()=>!$('.settings-panel'));
     await send({cycleDone:true,locale:tag,cycle});completedThisLaunch++;
    }catch(e){await send({locale:tag,cycle,gap:String(e)});document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));}
    if(completedThisLaunch>=6){await send({relaunch:true});return;}
   }
  }
  await send({done:true});
 }catch(e){await send({fatal:String(e)})}
})();
