import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const entry = resolve(root, process.argv[2] || 'dist/index.js');
const output = resolve(root, '.cache/dist-smoke.cjs');
const sdkModules = new Set(['client', 'desktop', 'host-context', 'http', 'input-context', 'input', 'panel-context', 'records', 'workflow']);
await mkdir(resolve(root, '.cache'), { recursive: true });
await build({
  absWorkingDir: root, outfile: output,
  stdin: {
    contents: `import Plugin from ${JSON.stringify(entry)}; import { setTestScope } from ${JSON.stringify(resolve(root, 'dev/test-host-sdk/client.ts'))}; setTestScope('fixture-owner'); export default Plugin;`,
    resolveDir: root, sourcefile: 'dist-smoke-entry.js',
  },
  bundle: true, platform: 'node', format: 'cjs', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/*', 'react-dom', 'react-dom/*'], loader: { '.css': 'empty' },
  plugins: [{
    name: 'offline-host-fixture',
    setup(builder) {
      builder.onResolve({ filter: /^@diane\/plugin-sdk\// }, ({ path }) => {
        const name = path.slice('@diane/plugin-sdk/'.length);
        if (!sdkModules.has(name)) throw new Error(`Unknown SDK import: ${path}`);
        const ext = ['host-context', 'input-context', 'workflow'].includes(name) ? 'tsx' : 'ts';
        return { path: resolve(root, `dev/test-host-sdk/${name}.${ext}`) };
      });
    },
  }],
});
const window = new Window({ url: 'http://fixture.invalid' });
const names = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'React'];
const before = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
let networkCalls = 0;
try {
  for (const name of names.slice(0, 5)) Object.defineProperty(globalThis, name, { value: window[name], configurable: true, writable: true });
  Object.defineProperty(globalThis, 'React', { value: undefined, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'fetch', { value: () => { networkCalls++; throw new Error('Dist smoke cannot call a live service'); }, configurable: true, writable: true });
  const module = createRequire(import.meta.url)(output);
  assert.equal(typeof module.default, 'function', 'Package default export must be a component');
  const html = renderToStaticMarkup(createElement(module.default, { active: true }));
  assert(/diane-(todo|meeting)-port/.test(html), 'The active production component did not render its product root');
  assert.equal(networkCalls, 0);
  assert.equal(globalThis.React, undefined);
  console.log(`Production dist renders without global React or network (${Buffer.byteLength(html)} HTML bytes).`);
} finally {
  for (const [name, descriptor] of before) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  await window.happyDOM.close();
  await rm(output, { force: true });
}
