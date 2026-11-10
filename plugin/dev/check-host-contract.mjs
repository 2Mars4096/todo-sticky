import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = process.argv[2];
if (!host) throw new Error('Usage: npm run check:host -- /path/to/dear-diane/editor (optional integration check)');
const hostRoot = resolve(host);
const aliases = JSON.parse(await readFile(resolve(hostRoot, 'plugin-sdk.json'), 'utf8')).compilerOptions.paths;
const fixture = resolve(root, '.cache/host-contract.ts');
const modules = ['client', 'desktop', 'host-context', 'http', 'input-context', 'input', 'records', 'workflow'];
const lines = modules.flatMap((name, index) => {
  const target = aliases[`@diane/plugin-sdk/${name}`]?.[0];
  if (!target) throw new Error(`Host does not expose ${name}`);
  return [
    `import * as host${index} from ${JSON.stringify(resolve(hostRoot, target))};`,
    `const contract${index}: typeof import('../dev/host-contract/${name}') = host${index};`,
    `void contract${index};`,
  ];
});
lines.push(
  `import type { SidePanelProps as HostPanel } from ${JSON.stringify(resolve(hostRoot, aliases['@diane/plugin-sdk/panel-context'][0]))};`,
  `import type { SidePanelProps as ProductPanel } from '../dev/host-contract/panel-context';`,
  'const panel: ProductPanel = {} as HostPanel; void panel;',
);
const source = lines.join('\n');
const options = {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
  strict: true, skipLibCheck: true, noEmit: true, resolveJsonModule: true,
  allowImportingTsExtensions: true,
  paths: Object.fromEntries(Object.entries(aliases).map(([key, paths]) => [key, paths.map(path => resolve(hostRoot, path))])),
};
const compilerHost = ts.createCompilerHost(options);
const originalRead = compilerHost.readFile.bind(compilerHost);
const originalExists = compilerHost.fileExists.bind(compilerHost);
compilerHost.readFile = path => resolve(path) === fixture ? source : originalRead(path);
compilerHost.fileExists = path => resolve(path) === fixture || originalExists(path);
const program = ts.createProgram([fixture, resolve(hostRoot, 'node_modules/vite/client.d.ts')], options, compilerHost);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: path => path, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else console.log('Consumed SDK declarations accept the actual host exports; private panel context remains opaque.');
