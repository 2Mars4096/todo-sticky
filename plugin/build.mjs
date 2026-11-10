import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
// Keep the package independent of a parent application's tsconfig and React runtime.
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  tsconfigRaw: { compilerOptions: { jsx: 'react-jsx', target: 'ES2022' } },
  outfile: 'dist/index.js',
  metafile: true,
  external: [
    'react', 'react/*', 'react-dom', 'react-dom/*', 'lucide-react',
    'date-fns', 'react-day-picker', 'react-day-picker/*', '@diane/plugin-sdk/*',
  ],
});
await mkdir(new URL('.cache/', import.meta.url), { recursive: true });
await writeFile(new URL('.cache/build-meta.json', import.meta.url), JSON.stringify(result.metafile, null, 2) + '\n');
