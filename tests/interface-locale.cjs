const assert = require('node:assert/strict')
const load = require('./helpers/load-typescript.cjs')
const saved = new Map()
const handlers = {}
const globals = {
  navigator: {languages:['fr-CA']}, document: {documentElement:{}},
  window: {addEventListener(type, callback) {handlers[type] = callback}},
  localStorage: {getItem(key){return saved.get(key)},setItem(key,value){saved.set(key,value)}},
}
const api = load('web/src/interfaceLocale.ts', {}, globals)
assert.equal(api.displayLanguage(),'fr')
assert.equal(api.resolveLanguage(['zh-Hans-HK']),'zh-Hans')
assert.equal(api.resolveLanguage(['zh-TW']),'zh-Hant')
assert.equal(api.resolveLanguage(['yue-HK']),'yue')
assert.equal(api.resolveLanguage(['it','ja-JP']),'ja')
assert.equal(api.resolveLanguage(['it']),'en')
for (const tag of Object.keys(api.languages)) {
  api.chooseLanguage(tag)
  assert.equal(saved.get('pipedreams.displayLanguage'),tag)
  assert.equal(globals.document.documentElement.lang,tag)
  const personal = 'Delete · {1} · 日本語'
  assert.ok(api.ui('New step for {0}',[personal]).includes(personal))
}
assert.equal(load('web/src/interfaceLocale.ts', {}, globals).displayLanguage(),'pt')
api.chooseLanguage('system')
globals.navigator.languages=['yue-HK']
handlers.languagechange()
assert.equal(api.displayLanguage(),'yue')
assert.equal(api.formatLanguage(),'zh-HK')
console.log('Ten display locales, fallback order, retained literal arguments and saved preference passed.')
