import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const modules = ['client', 'desktop', 'host-context', 'http', 'input-context', 'input', 'panel-context', 'records', 'workflow'];
export default defineConfig({
  esbuild: { jsx: 'automatic', target: 'es2022' },
  resolve: {
    alias: modules.map(name => ({
      find: `@diane/plugin-sdk/${name}`,
      replacement: fileURLToPath(new URL(`./dev/test-host-sdk/${name}.${['host-context', 'input-context', 'workflow'].includes(name) ? 'tsx' : 'ts'}`, import.meta.url)),
    })),
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'dev/**/*.test.{ts,tsx}'],
    setupFiles: ['./dev/test-setup.ts'],
  },
});
