const assert = require('node:assert/strict')
const load = require('./helpers/load-typescript.cjs')
const { preserveConflict, conflictFingerprint, reviewedConflictMatches, conflictRows, rowDifference, visibleConflictRows } = load('src/syncConflicts.ts')
const task = (id,text,subtasks=[]) => ({id,text,status:'todo',subtasks})
const local = {date:'2026-10-30',tasks:[task('parent','Write report',[task('child','Check figures')]),task('only-local','Book room')]}
const cloud = {date:'2026-10-30',tasks:[task('parent','Write report',[task('child','Check sources')]),task('only-cloud','Send invite')]}
const action = {key:'day:2026-10-30',kind:'conflict',local,remote:{key:'day:2026-10-30',payload:cloud,revision:2,deleted:false,mutationId:'fixture',updatedAt:''}}
const copies=[]
assert.equal(preserveConflict(copies,action,'2026-10-30T00:00:00Z'),true)
assert.equal(preserveConflict(copies,action,'2026-10-30T00:01:00Z'),false)
const reviewed=conflictFingerprint(action)
assert.equal(reviewedConflictMatches([action],action.key,reviewed),true)
action.local.tasks[0].subtasks[0].text='A later local edit'
assert.equal(copies[0].local.tasks[0].subtasks[0].text,'Check figures','Recovery copy must not alias mutable local state')
assert.equal(reviewedConflictMatches([action],action.key,reviewed),false)
assert.equal(preserveConflict(copies,action),true)
const newer=JSON.parse(JSON.stringify(action));newer.remote.revision++
assert.equal(reviewedConflictMatches([newer],action.key,conflictFingerprint(action)),false)
assert.equal(reviewedConflictMatches([],action.key,reviewed),false)
const rows=conflictRows(action.key,copies[0].local), other=conflictRows(action.key,cloud)
assert.equal(rowDifference(rows[1],other),'Changed')
assert.equal(rowDifference(rows[2],other),'Only here')
assert.equal(visibleConflictRows(rows,other,true)[0].id,'parent','Keep parent context for changed steps')
const reordered=conflictRows(action.key,{...cloud,tasks:[...cloud.tasks].reverse()})
assert.equal(rowDifference(other[0],reordered),'Moved')
assert.equal(conflictRows(action.key,null).length,0)
assert.equal(conflictRows('goals',{targets:[{id:'goal',text:'Read',done:false}],recurring:[]})[0].group,'Goals')
const deleted={...action,remote:{...action.remote,deleted:true,payload:null}}
assert.notEqual(conflictFingerprint(deleted),conflictFingerprint(action))
console.log('Passed conflict-copy preservation/deduplication, stale-choice rejection and readable nested/order/deletion comparisons')
