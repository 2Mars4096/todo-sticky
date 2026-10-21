const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Execute source modules, rather than duplicate their logic in regression tests.
module.exports = function loadTypeScript(file, mocks = {}, globals = {}, cache = new Map()) {
  file = path.resolve(file)
  if (cache.has(file)) return cache.get(file)
  const result = {}
  cache.set(file, result)
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(source, {
    exports: result, console, setTimeout, clearTimeout, ...globals,
    require(name) {
      if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name]
      if (name.startsWith('.')) {
        return module.exports(path.resolve(path.dirname(file), `${name}.ts`), mocks, globals, cache)
      }
      return require(name)
    },
  }, { filename: file })
  return result
}
