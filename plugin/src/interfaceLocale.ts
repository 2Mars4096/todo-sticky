import { interfaceRows, interfaceTags } from './interfaceLabels';

const key = 'pipedreams.displayLanguage';
function tagFor(value: string): string {
  const [base,...parts] = value.toLowerCase().replace(/_/g,'-').split('-');
  if(base==='yue'||parts.includes('yue')) return 'yue';
  if(base==='zh') return parts.includes('hans')?'zh-Hans':parts.some(p=>['hant','tw','hk','mo'].includes(p))?'zh-Hant':'zh-Hans';
  return interfaceTags.includes(base) ? base : 'en';
}
export function hostLanguage():string {
  try {
    const choice = localStorage.getItem(key);
    if(choice && choice !== 'system') return tagFor(choice);
  } catch {}
  return tagFor((typeof document!=='undefined'?document.documentElement.lang:'') || (typeof navigator!=='undefined'?navigator.language:'en'));
}
export const hostFormatLanguage=()=>hostLanguage()==='yue'?'zh-HK':hostLanguage();
export function subscribeLanguage(callback:()=>void) {
  if(typeof window==='undefined') return ()=>{};
  const observer=new MutationObserver(callback);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('storage',callback);
  window.addEventListener('languagechange',callback);
  window.addEventListener('pipedreams:localechange',callback);
  return ()=>{observer.disconnect();window.removeEventListener('storage',callback);window.removeEventListener('languagechange',callback);window.removeEventListener('pipedreams:localechange',callback)};
}
export function ui(source:string,args:readonly unknown[]=[]){
  const index=interfaceTags.indexOf(hostLanguage());
  const text=index<0?source:interfaceRows[source]?.[index]??source;
  return args.length?text.replace(/\{(\d+)\}/g,(m,i)=>Number(i)<args.length?String(args[Number(i)]):m):text;
}
