const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const out = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/TaskFinish.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:out,require})
process.env.TZ='America/New_York'
assert.equal(out.deadlineLabel('2026-03-08',new Date(2026,2,9,0,1)).text,'1d overdue')
assert.equal(out.deadlineLabel('2026-11-01',new Date(2026,10,2,0,1)).text,'1d overdue')
assert.equal(out.deadlineLabel('2026-10-21',new Date(2026,9,21,23,59)).text,'Due today')
assert.equal(out.deadlineLabel('2026-10-21',new Date(2026,9,22,0,0)).text,'1d overdue')
assert.equal(out.deadlineLabel('invalid',new Date()).text,'Invalid date')
console.log('Passed urgency midnight and DST calendar-day checks')
