const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function item(query){for(let n=0;n<75;n++){const el=document.querySelector(query);if(el)return el;await wait(25)}throw Error(query)}
if(state==='goals'){
 await item('[data-badges] .deadline-badge');
 const lang=new URLSearchParams(location.search).get('language');
 return {values:[...document.querySelectorAll('.goal-section-header > span,[data-badges] .deadline-badge')].map(n=>n.textContent),reference:new Intl.DateTimeFormat(lang==='yue'?'zh-HK':lang,{weekday:'short',month:'short',day:'numeric'}).format(new Date(2026,11,12))}
}
(await item('[data-task-id="dentist"] .task-text')).click();(await item('[data-task-id="dentist"] .task-focus-action')).click();
const startText=window.reviewCaptions['Start focus'];for(let n=0;n<70;n++){const button=[...document.querySelectorAll('.tracking-overlay button')].find(x=>x.textContent.trim()===startText||x.getAttribute('aria-label')===startText);if(button){button.click();break}await wait(25)}
await item('.focus-clock-block');const result=[];
for(let n=0;n<3;n++){if(n){(await item('.tracking-overlay .focus-btn.secondary')).click();await wait(50)}result.push([...document.querySelectorAll('.tracking-overlay .focus-phase-step > span:last-child')].map(x=>x.textContent))}
return result