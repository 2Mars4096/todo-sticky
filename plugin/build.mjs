import {build} from 'esbuild';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname);
await build({entryPoints:[root+'/src/index.ts'],bundle:true,format:'esm',platform:'browser',outfile:root+'/dist/index.js',external:['react','react/*','react-dom','react-dom/*','lucide-react','date-fns','react-day-picker','react-day-picker/*','@diane/plugin-sdk/*']});
