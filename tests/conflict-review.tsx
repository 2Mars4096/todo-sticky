// Synthetic component fixture: never connects to Firebase or a native notebook.
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConflictReview } from '../src/components/ConflictReview'
import type { CloudAccount } from '../src/components/AccountPanel'
import { reconcile } from '../src/cloudSync'
import '../src/styles/cloud-account.css'

const goal = (id: string, text = id) => ({ id, text, done: false })
const payload = (a: string, b: string, extra: string) => ({ targets: [goal('a', a), goal('b', b), goal(extra)], recurring: [] })
const local = payload('Local research question', 'Local experiment plan', 'Only on Mac')
const ancestor = { targets: [goal('a', 'Research question'), goal('b', 'Experiment plan')], recurring: [] }
let revision = 2
const conflict = (second = 'Cloud experiment plan') => reconcile({ goals: local }, [{key:'goals',revision,payload:payload('Cloud research question',second,'Only on phone'),deleted:false,updatedAt:'',mutationId:'fixture'}], {goals:{revision:1,payload:ancestor,deleted:false}})
function App() {
  const [account, setAccount] = useState({ conflicts: conflict(), recovery: [], busy: false, background: false, progress: null, error: null })
  const calls: unknown[] = []
  Object.assign(window, { __conflictReview: {
    calls,
    background: (busy: boolean) => setAccount(old => ({...old,busy,background:busy,progress:busy ? {stage:'Reading cloud',startedAt:Date.now(),updatedAt:Date.now(),total:null,completed:0} : null} as typeof old)),
    refresh: () => setAccount(old => ({...old,conflicts:conflict()})),
    changeSecond: () => { revision++; setAccount(old => ({...old,conflicts:conflict('New cloud experiment plan')})) },
  } })
  return <ConflictReview account={{...account,exportRecovery:()=>{},resolve:()=>{},resolveItems:(key:string,choices:unknown,fingerprint:string)=>{calls.push({key,choices,fingerprint})}} as unknown as CloudAccount} initialHistory={false} onBack={()=>{}} />
}
createRoot(document.getElementById('root')!).render(<App />)
