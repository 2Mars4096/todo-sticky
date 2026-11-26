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
async function verify() {
  await api.loadLanguage()
  assert.equal(api.displayLanguage(),'fr')
  assert.equal(api.resolveLanguage(['zh-Hans-HK']),'zh-Hans')
  assert.equal(api.resolveLanguage(['zh-TW']),'zh-Hant')
  assert.equal(api.resolveLanguage(['yue-HK']),'yue')
  assert.equal(api.resolveLanguage(['it','ja-JP']),'ja')
  assert.equal(api.resolveLanguage(['it']),'en')
  for (const tag of Object.keys(api.languages)) {
    await api.chooseLanguage(tag)
    assert.equal(saved.get('pipedreams.displayLanguage'),tag)
    assert.equal(globals.document.documentElement.lang,tag)
    const personal = 'Delete · {1} · 日本語'
    assert.ok(api.ui('New step for {0}',[personal]).includes(personal))
  }
  const musicHeadings = {
    'zh-Hans': '工作时听的专辑',
    'zh-Hant': '工作時聽的專輯',
    yue: '做嘢時聽嘅專輯',
  }
  for (const [tag, heading] of Object.entries(musicHeadings)) {
    await api.chooseLanguage(tag)
    assert.equal(api.ui('Albums for working'), heading)
    const catalog = require(`../phone/assets/interface/${tag}.json`)
    for (const [key, translation] of Object.entries(catalog)) {
      if (/\balbums?\b/i.test(key)) assert.doesNotMatch(translation, /相册|相冊|相簿/, key)
    }
  }
  await api.chooseLanguage('pt')
  const restarted = load('web/src/interfaceLocale.ts', {}, globals)
  await restarted.loadLanguage()
  assert.equal(restarted.displayLanguage(),'pt')
  await api.chooseLanguage('system')
  globals.navigator.languages=['yue-HK']
  handlers.languagechange()
  await api.loadLanguage()
  assert.equal(api.displayLanguage(),'yue')
  assert.equal(api.formatLanguage(),'zh-HK')
  const slow = api.chooseLanguage('fr')
  await api.chooseLanguage('en')
  await slow
  assert.equal(api.displayLanguage(), 'en')
  console.log('Ten display locales, fallback order, retained literal arguments and saved preference passed.')
}
verify().catch(error => { console.error(error); process.exitCode = 1 })
