const assert=require('node:assert/strict')
const load=require('./helpers/load-typescript.cjs')
const sync=load('src/cloudSync.ts',{}, {URL})
const {DIANE_SHARED_ORIGIN,accountConfigPath,migrateVerifiedOwner}=load('src/cloudAccount.ts',{'firebase/app':{},'firebase/auth':{},'@tauri-apps/api/core':{},'./cloudSync':sync},{URL,URLSearchParams})
class Store {
 constructor(){this.data=new Map();this.fail=null}
 get length(){return this.data.size} key(i){return [...this.data.keys()][i]??null}
 getItem(k){return this.data.get(k)??null} removeItem(k){this.data.delete(k)}
 setItem(k,v){if(this.fail?.(k))throw Error('Quota');this.data.set(k,v)}
}
const old='sticky-todo-20261028:old-user',next='dear-diane-202610:new-user',folder='/notes'
const sourceKey=`todo-sticky-cloud-v1:${old}:https://old.example:${folder}`
const targetKey=`todo-sticky-cloud-v1:${next}:${DIANE_SHARED_ORIGIN}:${folder}`
const data={enabled:true,baseline:{'day:2026-11-09':{revision:7,payload:{date:'2026-11-09',tasks:[{id:'a',text:'Baseline',status:'todo',subtasks:[]}]},deleted:false}},pending:{'day:2026-11-09':{id:'unsent-mutation',expectedRevision:7}},conflicts:[{marker:'retained'}]}
const options={origin:DIANE_SHARED_ORIGIN,projectId:'dear-diane-202610',uid:'new-user',kbPath:folder,identity:{owner:'new-user',appId:'todo',legacyAccounts:[{appId:'todo',projectId:'sticky-todo-20261028',owner:'old-user'}]}}
function fixture(){const s=new Store();s.setItem('todo-sticky-cloud-owner-v1',old);s.setItem(sourceKey,JSON.stringify(data));return s}
assert.equal(accountConfigPath(DIANE_SHARED_ORIGIN),'/api/connected-apps/config?appId=todo')
assert.equal(accountConfigPath('https://old.example'),'/v1/config')
let s=fixture();const original=s.getItem(sourceKey)
assert.equal(migrateVerifiedOwner(s,options),true)
assert.equal(s.getItem(sourceKey),original);assert.equal(s.getItem(targetKey),original);assert.equal(s.getItem('todo-sticky-cloud-owner-v1'),next)
assert.equal(migrateVerifiedOwner(s,options),false)
for(const bad of [
 {...options,origin:'https://untrusted.example'},
 {...options,identity:{owner:'new-user',appId:'todo',legacyOwnerIds:['old-user']}},
 {...options,identity:{owner:'wrong',appId:'todo',legacyAccounts:options.identity.legacyAccounts}},
 {...options,identity:{owner:'new-user',appId:'todo',legacyAccounts:[{appId:'todo',projectId:'other-project',owner:'old-user'}]}}
]){s=fixture();assert.throws(()=>migrateVerifiedOwner(s,bad));assert.equal(s.getItem('todo-sticky-cloud-owner-v1'),old);assert.equal(s.getItem(targetKey),null)}
s=fixture();s.setItem(`todo-sticky-cloud-v1:${old}:https://old.example:/second`,JSON.stringify({...data,enabled:false}));migrateVerifiedOwner(s,options);assert.equal(JSON.parse(s.getItem(`todo-sticky-cloud-v1:${next}:${DIANE_SHARED_ORIGIN}:/second`)).enabled,false)
s=fixture();s.setItem(`todo-sticky-cloud-v1:${old}:https://different.example:${folder}`,JSON.stringify({...data,baseline:{}}));assert.throws(()=>migrateVerifiedOwner(s,options),/histories/);assert.equal(s.getItem(targetKey),null)
s=fixture();s.fail=k=>k===targetKey;assert.throws(()=>migrateVerifiedOwner(s,options),/Quota/);assert.equal(s.getItem('todo-sticky-cloud-owner-v1'),old);assert.equal(s.getItem(sourceKey),original)
console.log('Shared account: central endpoint selection, issuer-bound owner migration, all-folder baseline/pending preservation, idempotency, ambiguity and storage-failure protection passed')
const {parseTodoTaskLink}=load('src/cloudAccount.ts',{'firebase/app':{},'firebase/auth':{},'@tauri-apps/api/core':{},'./cloudSync':sync},{URL,URLSearchParams})
assert.equal(parseTodoTaskLink('todo-sticky://task/abc-123'),'abc-123')
assert.equal(parseTodoTaskLink(DIANE_SHARED_ORIGIN+'/apps/todo/tasks/abc-123'),'abc-123')
for(const bad of ['todo-sticky://account-return','todo-sticky://task/a/b','todo-sticky://task/a?token=secret','https://evil.example/apps/todo/tasks/a','todo-sticky://user:password@task/a'])assert.equal(parseTodoTaskLink(bad),null)

assert.equal(parseTodoTaskLink('https://dockit.pipedreams.work/tasks/abc-123'),'abc-123')
const storage = new Store()
const { assertSharedNotebookOwner } = load('src/cloudAccount.ts',
  {'firebase/app':{}, 'firebase/auth':{}, '@tauri-apps/api/core':{}, './cloudSync':sync},
  {localStorage:storage})
const user = {uid:'member'}
const auth = {currentUser:user, app:{options:{projectId:'dear-diane-202610'}}}
assert.doesNotThrow(() => assertSharedNotebookOwner(auth,user))
storage.setItem('todo-sticky-cloud-owner-v1','dear-diane-202610:other')
assert.throws(() => assertSharedNotebookOwner(auth,user), /another account/)
storage.setItem('todo-sticky-cloud-owner-v1','dear-diane-202610:member')
assert.doesNotThrow(() => assertSharedNotebookOwner(auth,user))
assert.throws(() => assertSharedNotebookOwner({...auth,currentUser:null},user), /Account changed/)

async function verifyApprovalPopup(native) {
  const {webcrypto, createHash} = require('node:crypto')
  let opened, openedInGesture = false, closed = false
  const popup = {location:{replace(url) { opened = new URL(url) }}, close() { closed = true }}
  const auth = {app:{options:{projectId:'dear-diane-202610'}},authStateReady:async()=>{}}
  const globals = {
    URL, URLSearchParams, AbortController, TextEncoder, crypto:webcrypto, btoa,
    window:{open() { openedInGesture = true; return popup }},
    fetch:async (url, options) => {
      if (url.endsWith('/config?appId=todo')) return Response.json({schemaVersion:1,
        firebase:{apiKey:'public',authDomain:'test',projectId:'dear-diane-202610',appId:'test'},
        login:{exchangePath:'/api/connected-apps/auth/exchange'}})
      assert.equal(url, DIANE_SHARED_ORIGIN+'/api/connected-apps/auth/exchange')
      assert.equal(opened.origin + opened.pathname, 'https://pipedreams.work/signin')
      const params = new URLSearchParams(opened.hash.slice(1)), exchange = JSON.parse(options.body)
      assert.equal(params.get('returnTo'), native ? null : 'web')
      assert.equal(params.get('appId'), 'todo')
      assert.equal(params.get('sessionId'), exchange.sessionId)
      assert.equal(params.get('challenge'), createHash('sha256').update(exchange.verifier).digest('base64url'))
      assert.equal(opened.href.includes(exchange.verifier), false)
      return Response.json({customToken:'fixture'})
    },
  }
  const account = load('src/cloudAccount.ts',{
    'firebase/app':{getApps:()=>[],initializeApp:()=>({})},
    'firebase/auth':{getAuth:()=>auth,setPersistence:async()=>{},signInWithCustomToken:async()=>({user:{uid:'fixture'}})},
    '@tauri-apps/api/core':{isTauri:()=>native,invoke:async(name,options)=>{
      assert.equal(name,'open_account_sign_in'); opened = new URL(options.url)
    }},
    './cloudSync':sync,'./interfaceLocale':{displayLanguage:()=>'en'},
  },globals)
  await account.connectAccount(DIANE_SHARED_ORIGIN)
  const signIn = account.googleSignIn(DIANE_SHARED_ORIGIN,auth,new AbortController().signal)
  assert.equal(openedInGesture,!native)
  assert.equal((await signIn).uid,'fixture')
  assert.equal(closed,!native)
}
Promise.all([verifyApprovalPopup(false), verifyApprovalPopup(true)]).catch(error => {
  console.error(error)
  process.exitCode = 1
})
