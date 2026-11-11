import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app'
import { getAuth, setPersistence, indexedDBLocalPersistence, signInWithCustomToken, signOut, type Auth, type User } from 'firebase/auth'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { syncServerUrl, canonical } from './cloudSync'

export async function requestJson(origin: string, path: string, options: RequestInit = {}, token?: string, timeoutMs = 20_000): Promise<any> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  options.signal?.addEventListener('abort', cancel, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(origin + path, {
      ...options, signal: controller.signal, redirect: 'error', credentials: 'omit',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const message = typeof body?.detail === 'string' ? body.detail : response.status === 409 ? 'This record changed on another device. Sync again to review the conflict.' : `Sync request failed (${response.status}).`
      throw new Error(message)
    }
    return body
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel) }
}

export const DIANE_SHARED_ORIGIN = 'https://dear-diane-202610-api.web.app'
export function selectedSharedServiceOrigin(current:string,cutover:boolean){
  if(cutover&&(!current||current==='https://sticky-todo-sync-507920948662.asia-southeast1.run.app'))return DIANE_SHARED_ORIGIN
  return current
}
const brokerOrigins = new Set<string>()
export function accountConfigPath(origin: string) {
  return syncServerUrl(origin) === DIANE_SHARED_ORIGIN ? '/api/connected-apps/config?appId=todo' : '/v1/config'
}

/** Verified issuer+UID migration. Original baselines/unsent mutations stay intact. */
export function migrateVerifiedOwner(storage: Storage, options: {origin:string;projectId:string;uid:string;kbPath:string;identity:any}) {
  const {origin,projectId,uid,identity}=options, ownerKey='todo-sticky-cloud-owner-v1'
  const previous=storage.getItem(ownerKey),next=`${projectId}:${uid}`
  if(!previous || previous===next)return false
  if(syncServerUrl(origin)!==DIANE_SHARED_ORIGIN || projectId!=='dear-diane-202610' || identity?.owner!==uid || identity?.appId!=='todo'
    || !Array.isArray(identity.legacyAccounts) || !identity.legacyAccounts.some((account:any)=>account?.appId==='todo'&&`${account.projectId}:${account.owner}`===previous)) {
    throw new Error('These notes belong to another account. The shared service has not verified their original account link.')
  }
  const prefix=`todo-sticky-cloud-v1:${previous}:`,groups=new Map<string,Array<{key:string;raw:string}>>()
  for(let index=0;index<storage.length;index++){
    const key=storage.key(index);if(!key?.startsWith(prefix))continue
    const match=/^(https?:\/\/(?:\[[^\]]+\]|[^:/]+)(?::\d+)?):(.+)$/.exec(key.slice(prefix.length))
    if(!match)throw new Error('Original notebook sync scope needs recovery. Its metadata was kept.')
    const folder=match[2],raw=storage.getItem(key);if(raw===null)continue
    const value=JSON.parse(raw)
    if(typeof value?.enabled!=='boolean'||!value.baseline||typeof value.baseline!=='object'||Array.isArray(value.baseline)||!value.pending||typeof value.pending!=='object'||Array.isArray(value.pending)||!Array.isArray(value.conflicts))throw new Error('Original sync metadata needs recovery. Local notes are unchanged.')
    groups.set(folder,[...(groups.get(folder)??[]),{key,raw}])
  }
  const changes:Array<{folder:string;source:{key:string;raw:string};target:string}>=[]
  for(const [folder,candidates] of groups){
    if(new Set(candidates.map(item=>canonical(JSON.parse(item.raw)))).size>1)throw new Error('Several original sync histories need review before linking this notebook. Existing baselines and drafts were kept.')
    const source=candidates[0],target=`todo-sticky-cloud-v1:${next}:${syncServerUrl(origin)}:${folder}`,existing=storage.getItem(target)
    if(existing&&canonical(JSON.parse(existing))!==canonical(JSON.parse(source.raw)))throw new Error('The shared account already has different sync history on this device. Existing copies were kept for review.')
    changes.push({folder,source,target})
  }
  const unchanged=()=>storage.getItem(ownerKey)===previous&&changes.every(change=>storage.getItem(change.source.key)===change.source.raw)
  if(!unchanged())throw new Error('Account metadata changed. Sign in again after current work settles.')
  for(const {folder,source,target} of changes){
    if(!storage.getItem(target))storage.setItem(target,source.raw)
    if(storage.getItem(target)!==source.raw)throw new Error('Could not retain the original sync baseline.')
    const receipt=`todo-sticky-shared-migration-v1:${next}:${folder}`
    if(!storage.getItem(receipt))storage.setItem(receipt,JSON.stringify({fromOwner:previous,toOwner:next,sourceKey:source.key,targetKey:target,verifiedAt:new Date().toISOString()}))
  }
  if(!unchanged())throw new Error('Account metadata changed. Original ownership was retained for review.')
  // Old keys are the recovery copy. Bind only after every notebook baseline persists.
  storage.setItem(ownerKey,next)
  if(storage.getItem(ownerKey)!==next)throw new Error('Could not persist the shared account binding.')
  return true
}

async function migrateSharedOwner(origin:string,auth:Auth,user:User,kbPath?:string){
  if(!kbPath || origin!==DIANE_SHARED_ORIGIN || !localStorage.getItem('todo-sticky-cloud-owner-v1'))return
  const owner=`${auth.app.options.projectId}:${user.uid}`
  if(localStorage.getItem('todo-sticky-cloud-owner-v1')===owner)return
  const token=await user.getIdToken()
  const identity=await requestJson(origin,'/api/connected-apps/identity',{},token)
  if(auth.currentUser?.uid!==user.uid)throw new Error('Account changed during migration verification.')
  migrateVerifiedOwner(localStorage,{origin,projectId:String(auth.app.options.projectId),uid:user.uid,kbPath,identity})
}

export async function connectAccount(origin: string, kbPath?: string): Promise<Auth> {
  origin = syncServerUrl(origin)
  const config = await requestJson(origin, accountConfigPath(origin))
  const firebase = config.firebase as FirebaseOptions
  if (config.schemaVersion !== 1 || !firebase?.apiKey || !firebase.authDomain || !firebase.projectId || !firebase.appId) throw new Error('The account service needs its Firebase web configuration before sign-in is available.')
  const shared=config.login?.exchangePath==='/api/connected-apps/auth/exchange'
  if(shared)brokerOrigins.add(origin);else brokerOrigins.delete(origin)
  const name = (shared?'diane-todo-':'sticky-') + firebase.projectId
  const app = getApps().find(item => item.name === name) ?? initializeApp(firebase, name)
  const auth = getAuth(app)
  await setPersistence(auth, indexedDBLocalPersistence)
  await auth.authStateReady()
  if(auth.currentUser)await migrateSharedOwner(origin,auth,auth.currentUser,kbPath)
  return auth
}

function randomCode(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function googleSignIn(origin: string, auth: Auth, signal: AbortSignal, kbPath?: string): Promise<User> {
  const verifier = randomCode()
  const sessionId = randomCode()
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const url = `${origin}/signin#${new URLSearchParams({ sessionId, challenge, ...(brokerOrigins.has(origin)?{appId:'todo'}:{}) })}`
  if (isTauri()) await invoke('open_account_sign_in', { url })
  else window.open(url, '_blank', 'noopener,noreferrer')
  const expires = Date.now() + 5 * 60_000
  while (Date.now() < expires && !signal.aborted) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (signal.aborted) break
    let result
    try { result = await requestJson(origin, brokerOrigins.has(origin)?'/api/connected-apps/auth/exchange':'/v1/auth/exchange', { method: 'POST', body: JSON.stringify({ sessionId, verifier, ...(brokerOrigins.has(origin)?{appId:'todo'}:{}) }), signal }) }
    catch (cause) { if (signal.aborted) break; throw cause }
    if (result.customToken) {
      if (signal.aborted) break
      const credential = await signInWithCustomToken(auth, result.customToken)
      if (signal.aborted) { await signOut(auth); break }
      await migrateSharedOwner(origin,auth,credential.user,kbPath)
      if(signal.aborted){await signOut(auth);break}
      return credential.user
    }
  }
  throw new Error(signal.aborted ? 'Sign-in cancelled.' : 'Sign-in expired. Try again.')
}

/** Explicit shared-account inference; existing direct provider choices never fall through here. */
export async function runSharedTodoAgent<T>(action: string, input: unknown, kbPath?: string): Promise<T> {
  const origin=localStorage.getItem('todo-sticky-cloud-server-v1')||DIANE_SHARED_ORIGIN
  if(origin!==DIANE_SHARED_ORIGIN)throw new Error('Connect the shared Diane service in Settings → Account before using this provider.')
  const auth=await connectAccount(origin,kbPath),user=auth.currentUser
  if(!user)throw new Error('Sign in to your shared Diane account in Settings → Account.')
  const owner=`${auth.app.options.projectId}:${user.uid}`,bound=localStorage.getItem('todo-sticky-cloud-owner-v1')
  if(bound&&bound!==owner)throw new Error('These notes belong to another account. Verify their shared account link before sending them.')
  const token=await user.getIdToken(),requestId=crypto.randomUUID()
  const result=await requestJson(origin,'/api/plugins/todo/compat/ai',{
    method:'POST',headers:{'Idempotency-Key':requestId},
    body:JSON.stringify({request_id:requestId,payload:{action,input,intent_id:requestId}}),
  },token,390_000)
  if(auth.currentUser?.uid!==user.uid)throw new Error('Account changed while Diane was working; the result belongs to the earlier account.')
  return result as T
}

export function parseTodoTaskLink(value:string):string|null {
  try {
    const url=new URL(value)
    if(url.username||url.password||url.search||url.hash)return null
    const raw=url.protocol==='todo-sticky:'&&url.hostname==='task'?url.pathname.slice(1):url.origin===DIANE_SHARED_ORIGIN&&url.pathname.startsWith('/apps/todo/tasks/')?url.pathname.slice('/apps/todo/tasks/'.length):''
    return /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(raw)?raw:null
  }catch{return null}
}

export async function readSharedTodoTask(recordId:string,kbPath?:string):Promise<{date:string;taskId:string;recordId:string}> {
  if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(recordId))throw new Error('Invalid shared task link.')
  const auth=await connectAccount(DIANE_SHARED_ORIGIN,kbPath),user=auth.currentUser
  if(!user)throw new Error('Sign in to the shared Diane account to open this task.')
  const token=await user.getIdToken()
  const record=await requestJson(DIANE_SHARED_ORIGIN,'/api/plugins/todo/records/task/'+encodeURIComponent(recordId),{},token)
  if(auth.currentUser?.uid!==user.uid)throw new Error('Account changed before the task opened.')
  const date=record.extensions?.date||String(record.created_at||'').slice(0,10)
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('This task has no usable date.')
  const original=record.extensions?.source?.app==='todo-sticky'?record.extensions.source.id:record.record_id
  let taskId=String(original||'')
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(taskId)){
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('task:'+record.record_id))
    taskId='diane_'+Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,40)
  }
  return {date,taskId,recordId:record.record_id}
}

export { signOut }
export type { User, Auth }
