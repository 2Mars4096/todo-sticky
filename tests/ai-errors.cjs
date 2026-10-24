const assert = require('node:assert/strict')
const load = require('./helpers/load-typescript.cjs')
const { aiErrorMessage } = load('src/aiErrors.ts')

for (const failure of [
  'API error: model unavailable',
  new Error('API error: model unavailable'),
  { message: 'API error: model unavailable' },
]) assert.equal(aiErrorMessage(failure), 'API error: model unavailable')

assert.equal(aiErrorMessage('  Provider timed out.  '), 'Provider timed out.')
for (const failure of [undefined, null, {}, { message: 1 }, '', '   ']) {
  assert.equal(aiErrorMessage(failure, 'Retry this operation.'), 'Retry this operation.')
}
assert.equal(aiErrorMessage({ apiKey: 'must-not-be-displayed' }), 'The AI request failed. Try again.')
console.log('Passed native-string, Error, structured-message and safe-fallback AI error checks')
