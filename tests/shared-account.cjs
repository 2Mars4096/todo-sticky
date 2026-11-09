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
