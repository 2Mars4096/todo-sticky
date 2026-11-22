export const languages: Record<string,string> = {"en": "English", "zh-Hans": "简体中文", "zh-Hant": "繁體中文", "yue": "廣東話", "ja": "日本語", "ko": "한국어", "fr": "Français", "de": "Deutsch", "es": "Español", "pt": "Português"}
const systemNames:Record<string,string> = {"en": "System default", "zh-Hans": "跟随系统", "zh-Hant": "跟隨系統", "yue": "跟系統", "ja": "システム設定", "ko": "시스템 기본값", "fr": "Langue du système", "de": "Systemsprache", "es": "Idioma del sistema", "pt": "Idioma do sistema"}
const languageNames:Record<string,string> = {"en": "Display language", "zh-Hans": "显示语言", "zh-Hant": "顯示語言", "yue": "顯示語言", "ja": "表示言語", "ko": "표시 언어", "fr": "Langue d’affichage", "de": "Anzeigesprache", "es": "Idioma de visualización", "pt": "Idioma de exibição"}
type Catalog = Record<string, string>
const catalogs: Record<string, () => Promise<{default: Catalog}>> = {
  'zh-Hans': () => import('../../phone/assets/interface/zh-Hans.json'),
  'zh-Hant': () => import('../../phone/assets/interface/zh-Hant.json'),
  'yue': () => import('../../phone/assets/interface/yue.json'),
  'ja': () => import('../../phone/assets/interface/ja.json'),
  'ko': () => import('../../phone/assets/interface/ko.json'),
  'fr': () => import('../../phone/assets/interface/fr.json'),
  'de': () => import('../../phone/assets/interface/de.json'),
  'es': () => import('../../phone/assets/interface/es.json'),
  'pt': () => import('../../phone/assets/interface/pt.json'),
}
const pending = new Map<string, Promise<Catalog>>()
let active = 'en'
let labels: Catalog = {}
const key = 'pipedreams.displayLanguage'
const listeners = new Set<() => void>()
const valid = (raw: string | null) => raw && Object.prototype.hasOwnProperty.call(languages, raw) ? raw : 'system'
function savedChoice() {try {return valid(localStorage.getItem(key))} catch {return 'system'}}
let choice = savedChoice()
export function resolveLanguage(tags:readonly string[]):string {
  for(const raw of tags) {
    const [lang,...parts] = raw.toLowerCase().replace(/_/g,'-').split('-')
    if(lang==='yue' || parts.includes('yue')) return 'yue'
    if(lang==='zh') return parts.includes('hans') ? 'zh-Hans' : parts.includes('hant') || parts.some(p=>['hk','tw','mo'].includes(p)) ? 'zh-Hant' : 'zh-Hans'
    if(Object.prototype.hasOwnProperty.call(languages,lang)) return lang
  }
  return 'en'
}
export const languageChoice=()=>choice
const requestedLanguage=()=>choice==='system' ? resolveLanguage(typeof navigator==='undefined'?[]:navigator.languages?.length?navigator.languages:[navigator.language]) : choice
export const displayLanguage = () => active
// Some browser ICU builds lack yue date data and otherwise fall back to the device's unrelated language.
export const formatLanguage=()=>displayLanguage()==='yue'?'zh-HK':displayLanguage()
export const languageSnapshot=()=>choice+'|'+displayLanguage()
export function subscribeLanguage(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}}
function notify(){if(typeof document!=='undefined' && document.documentElement)document.documentElement.lang=displayLanguage();listeners.forEach(fn=>fn())}
export async function loadLanguage() {
  const target = requestedLanguage()
  if (target === active) { notify(); return }
  let next: Catalog = {}
  if (target !== 'en') {
    let request = pending.get(target)
    if (!request) {
      request = catalogs[target]().then(module => module.default)
      pending.set(target, request)
    }
    try {
      next = await request
    } catch {
      pending.delete(target)
      // Keep the current language usable if an optional chunk is unavailable.
      notify()
      return
    }
  }
  if (target !== requestedLanguage()) return
  labels = next
  active = target
  notify()
}

export function chooseLanguage(value: string) {
  choice = valid(value)
  try { localStorage.setItem(key, choice) } catch {}
  notify()
  return loadLanguage()
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('languagechange', () => { void loadLanguage() })
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      choice = savedChoice()
      void loadLanguage()
    }
  })
}
export function ui(source:string,args:readonly unknown[]=[]){
  const tag=displayLanguage()
  const text=source==='System default'?systemNames[tag]:source==='Display language'?languageNames[tag]:labels[source]??source
  return args.length?text.replace(/\{(\d+)\}/g,(match,index)=>Number(index)<args.length?String(args[Number(index)]):match):text
}
