const rows = [];
const root = document.querySelector(scope);
if (!root) return rows;
const viewport = {w:innerWidth,h:innerHeight};
function locator(el) {
 const chain=[];
 while(el && el!==root && el!==document.documentElement) {
   let nth=1,s=el;
   while(s=s.previousElementSibling) if(s.tagName===el.tagName) nth++;
   chain.push(el.tagName.toLowerCase()+':nth-of-type('+nth+')');
   el=el.parentElement;
 }
 return 'root/'+chain.reverse().join('/');
}
function visible(el) {
 return !!el && !el.closest('[hidden],[inert],[aria-hidden="true"]') &&
  !!el.getClientRects().length && getComputedStyle(el).visibility!=='hidden';
}
function push(el,kind,text,rect) {
 if(!text?.trim()||!visible(el))return;
 const bounds=[rect.x,rect.y,rect.width,rect.height].map(Math.round);
 const control=el.closest('button,a[href],textarea,select,input,[role="button"],summary,[tabindex="0"]');
 const focus=control ? {tag:control.tagName.toLowerCase(),disabled:!!control.disabled,
   name:(control.getAttribute('aria-label')||control.labels?.[0]?.textContent||control.textContent||control.title||control.placeholder||'').trim().slice(0,140),tab:control.tabIndex} : null;
 let clipped=false,scrollable=false;
 for(let par=el;par && par!==document.body;par=par.parentElement) {
  const css=getComputedStyle(par),b=par.getBoundingClientRect();
  if(b.width>0 && (rect.right>b.right+2 || rect.left<b.left-2)) {
    if(['auto','scroll'].includes(css.overflowX))scrollable=true;
    if(['clip','hidden'].includes(css.overflowX) && !scrollable)clipped=true;
  }
 }
 rows.push({locator:locator(el),kind,text:text.trim(),bounds,focus,clipped,scrollable,
   ellipsis:getComputedStyle(el).textOverflow==='ellipsis',inView:rect.bottom>0&&rect.top<viewport.h&&rect.right>0&&rect.left<viewport.w,
   viewportOverflow:rect.right>viewport.w+2||rect.left< -2,
   emptyBox:rect.width===0||rect.height===0});
}
let walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
 const n=walker.currentNode,el=n.parentElement;
 if(!n.textContent.trim()||!visible(el)||el.closest('style,script,option,textarea,svg,template'))continue;
 const r=document.createRange();r.selectNodeContents(n);
 const pos=[...el.childNodes].indexOf(n);
 push(el,'text['+pos+']',n.textContent,r.getBoundingClientRect());
}
for(const el of [root,...root.querySelectorAll('*')]){
 if(!visible(el)||el.closest('svg'))continue;
 for(const kind of ['aria-label','placeholder','title','alt'])if(el.hasAttribute(kind))push(el,kind,el.getAttribute(kind),el.getBoundingClientRect());
 if(el.tagName==='SELECT'){
  const o=el.selectedOptions[0];if(o)push(el,'selected-option',o.textContent,el.getBoundingClientRect());
 }
}
return rows;
