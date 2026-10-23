const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const out = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/taskRollover.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:out})
const t = (id,status='todo')=>({id,text:id,status,subtasks:[]})
const dates = [
 {date:'2026-09-01', tasks:[t('old'),t('complete','done'),t('question','question')]},
 {date:'2026-10-11', tasks:[t('yesterday','partial')]},
 {date:'2026-10-12', tasks:[t('today')]},
 {date:'2026-10-13', tasks:[t('future')]},
]
const carried = out.carriedTasks(dates,'2026-10-12')
assert.equal(carried.length,3)
assert.equal(carried[0].sourceDate,'2026-10-11')
assert.equal(out.carriedTasks(dates,'2026-10-13').length,4)
const ids = new Set(carried.map(t=>t.id))
const changes = carried.filter(t=>t.originalId!=='question').map(t=>t.originalId==='old'?{...t,status:'done'}:t)
const merged = out.mergeCarriedSection(dates[0],ids,changes)
assert.equal(merged.length,2)
assert.equal(merged[0].id,'old')
assert.equal(merged[0].status,'done')
assert.equal(merged[1].id,'complete')
assert.equal(merged[1].status,'done')
assert.equal(dates[0].tasks.length,3)
const reordered = out.mergeCarriedSection(dates[0],ids,[...carried].reverse())
assert.equal(reordered[0].id,'question')
assert.equal(reordered[2].id,'old')
assert.equal(out.carriedTasks([{...dates[0],tasks:merged}],'2026-10-13').length,0)
console.log('Passed cumulative rollover, date boundaries, archived completion preservation, deletion, stable IDs, ordering, and no-resurrection checks')

const clone = x => JSON.parse(JSON.stringify(x))
const originalTree = { ...t('same'), finish: { doneWhen: 'Keep this result', by: '2026-10-25' }, subtasks: [t('child', 'done'), { ...t('nested'), subtasks: [t('grandchild')] }] }
const source = out.carriedTasks([{date: '2026-10-11', tasks: [originalTree]}], '2026-10-12')
const today = {id: 'same', text: 'Another task', status: 'todo', todaySubtasks: [t('child')], otherSubtasks: []}
let seq = 0
const next = out.moveCarriedToToday([today, ...source], source[0].id, () => `fresh-${++seq}`, today.id, 'before')
assert.equal(next.length, 2)
assert.equal(next[0].id, 'fresh-1')
assert.equal(next[0].todaySubtasks[0].id, 'fresh-2')
assert.equal(next[0].todaySubtasks[0].status, 'done')
assert.deepEqual(clone(next[0].finish), originalTree.finish)
assert.deepEqual(clone(next[0].todaySubtasks[1]), originalTree.subtasks[1])
assert.equal(next[0].sourceDate, undefined)
assert.equal(next[0].originalId, undefined)
assert.equal(originalTree.id, 'same')
console.log('Passed promotion with root/child ID collisions and nested metadata preservation')
