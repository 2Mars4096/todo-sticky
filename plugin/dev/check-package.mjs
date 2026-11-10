import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const meta = JSON.parse(await readFile(resolve(root, '.cache/build-meta.json'), 'utf8'));
const sdkModules = new Set(['client', 'desktop', 'host-context', 'http', 'input-context', 'input', 'panel-context', 'records', 'workflow']);
const peerNames = Object.keys(pkg.peerDependencies || {});
const allowedExternal = name => {
  if (name.startsWith('@diane/plugin-sdk/')) return sdkModules.has(name.slice('@diane/plugin-sdk/'.length));
  return peerNames.some(peer => name === peer || name.startsWith(peer + '/'));
};
for (const input of Object.keys(meta.inputs)) {
  const local = relative(root, resolve(root, input)).split(sep).join('/');
  assert(local.startsWith('src/') && !local.includes('/__tests__/'), `Production bundle contains foreign or test code: ${input}`);
}
const external = new Set();
for (const output of Object.values(meta.outputs)) {
  for (const entry of output.imports) {
    if (!entry.external) continue;
    // CSS data images are embedded assets, not JavaScript module dependencies.
    if (entry.kind === 'url-token' && entry.path.startsWith('data:image/')) continue;
    assert(allowedExternal(entry.path), `Undeclared runtime external: ${entry.path}`);
    external.add(entry.path);
  }
}
assert(external.has('react/jsx-runtime'), 'JSX must use an imported automatic React runtime');
assert([...external].some(name => name.startsWith('@diane/plugin-sdk/')), 'The SDK must remain host-provided');
assert.equal(manifest.hostApi, 'diane-plugin/1');
assert.equal(manifest.entry, 'plugin/src/index.ts');
assert.equal(pkg.exports['.'].import, './dist/index.js');
assert.equal(pkg.exports['.'].types, './src/index.ts');
assert.equal(pkg.exports['./styles.css'], './dist/index.css');
assert(meta.outputs['dist/index.js']?.exports.includes('default'), 'Missing default plugin export');
for (const file of ['dist/index.js', 'dist/index.css']) assert((await stat(resolve(root, file))).size > 0, `Empty ${file}`);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packed = JSON.parse(execFileSync(npm, ['pack', '--dry-run', '--ignore-scripts', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))[0];
const paths = new Set(packed.files.map(file => file.path));
for (const path of ['package.json', 'src/index.ts', 'src/SOURCE.json', 'dist/index.js', 'dist/index.css', 'manifest.json', 'HOST-CONTRACT.md', 'README.md', 'RECOVERY.json']) {
  assert(paths.has(path), `Package is missing ${path}`);
}
for (const path of paths) {
  assert(!/^(dev|node_modules|backend|\.cache)\//.test(path), `Development/host implementation leaked into package: ${path}`);
  assert(!path.includes('/__tests__/') || !path.includes('preview'), `Preview harness leaked into package: ${path}`);
  assert(!/^(?:tsconfig.*\.json|vitest\.config\.)/.test(path), `Development config leaked into package: ${path}`);
}
if (pkg.name === '@diane-app/todo-plugin') assert(paths.has('src/LICENSE.todo-sticky'), 'Original Todo license must be retained');
console.log(`${pkg.name}@${pkg.version}: ${paths.size} package files, ${external.size} allowed externals; host adapters and preview harnesses excluded.`);
