const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Run the real hook with a controlled local clock, lifecycle, and timer queue.
process.env.TZ = 'America/New_York'
const source = ts.transpileModule(fs.readFileSync('src/hooks/useCalendar.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
function mount(start) {
  let now = new Date(start).getTime(), cursor = 0, mounted = false, nextTimer = 0
  const states = [], effects = [], cleanups = [], timers = new Map()
  const target = () => {
    const listeners = new Map()
    return {
      visibilityState: 'visible',
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name),
      fire: name => listeners.get(name)?.(),
      count: () => listeners.size,
    }
  }
  const window = target(), document = target(), exports = {}
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])) }
    static now() { return now }
  }
  vm.runInNewContext(source, {
    exports, Date: Clock, window, document,
    setTimeout: (fn, delay) => { timers.set(++nextTimer, { fn, delay }); return nextTimer },
    clearTimeout: id => timers.delete(id),
    require: name => name === 'react' ? {
      useState: initial => {
        const index = cursor++
        if (!mounted) states[index] = typeof initial === 'function' ? initial() : initial
        return [states[index], value => {
          states[index] = typeof value === 'function' ? value(states[index]) : value
        }]
      },
      useCallback: fn => fn,
      useEffect: fn => { if (!mounted) effects.push(fn) },
    } : require(name),
  })
  const render = () => { cursor = 0; return exports.useCalendar() }
  render()
  mounted = true
  effects.forEach(fn => cleanups.push(fn()))
  return {
    render, window, document, timers,
    setClock: value => { now = new Date(value).getTime() },
    tick: () => {
      const [id, timer] = timers.entries().next().value
      timers.delete(id)
      timer.fn()
    },
    unmount: () => cleanups.forEach(fn => fn()),
  }
}
const app = mount('2026-09-22T23:59:59')
assert.equal(app.render().isCurrentDay, true)
assert.equal([...app.timers.values()][0].delay, 1000)
app.setClock('2026-09-23T00:00:00')
app.tick()
assert.equal(app.render().dateStr, '2026-09-22')
assert.equal(app.render().isCurrentDay, false)
app.render().goToday()
assert.equal(app.render().dateStr, '2026-09-23')
assert.equal(app.render().isCurrentDay, true)
// Suspended timers: focus/show/visibility must independently catch up immediately.
for (const [target, event, date] of [
  [app.window, 'focus', '2026-09-25'],
  [app.window, 'pageshow', '2026-09-26'],
  [app.document, 'visibilitychange', '2026-09-27'],
]) {
  app.setClock(`${date}T09:00:00`)
  target.fire(event)
  assert.equal(app.render().isCurrentDay, false)
  app.render().goToday()
  assert.equal(app.render().dateStr, date)
  assert.equal(app.render().isCurrentDay, true)
  assert.equal(app.timers.size, 1)
}
app.render().goPrev()
app.setClock('2026-09-26T10:00:00') // clock correction backwards
app.tick()
assert.equal(app.render().isCurrentDay, true)
app.render().goToDate(new Date('2027-01-01T12:00:00'))
app.window.fire('focus')
assert.equal(app.render().dateStr, '2027-01-01')
assert.equal(app.render().isCurrentDay, false)
app.unmount()
assert.equal(app.timers.size, 0)
assert.equal(app.window.count() + app.document.count(), 0)
for (const date of ['2026-03-08', '2026-11-01', '2026-12-31']) {
  const boundary = mount(`${date}T23:59:59`)
  assert.equal([...boundary.timers.values()][0].delay, 1000)
  const next = new Date(`${date}T23:59:59`)
  next.setSeconds(next.getSeconds() + 1)
  boundary.setClock(next)
  boundary.tick()
  assert.equal(boundary.render().isCurrentDay, false)
  boundary.unmount()
}
console.log('Passed calendar midnight, resume, navigation, clock correction, DST/year boundary, and cleanup checks')
