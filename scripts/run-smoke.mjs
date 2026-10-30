/**
 * Bundles scripts/smoke-store.mjs for Node and runs it.
 *
 * The store reads Vite's `import.meta.env`, which plain Node does not provide,
 * so the test environment is injected at bundle time. Using esbuild's JS API
 * (rather than the CLI) keeps the JSON value's quotes intact on every shell.
 *
 * Run: npm run smoke
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ENV = {
  MODE: 'test',
  DEV: 'false',
  PROD: 'false',
  VITE_USE_MOCKS: 'true',
  VITE_API_BASE_URL: 'http://localhost:8080/api',
  VITE_SOCKET_URL: 'ws://localhost:8080/ws',
  VITE_APP_NAME: 'NexERP',
  VITE_APP_VERSION: '1.0.0',
};

const outDir = mkdtempSync(path.join(tmpdir(), 'nexerp-smoke-'));
const outfile = path.join(outDir, 'smoke.mjs');

await build({
  entryPoints: ['scripts/smoke-store.mjs'],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  logLevel: 'warning',
  alias: { '@': './src' },
  define: { 'import.meta.env': JSON.stringify(ENV) },
  /* CSS imports are irrelevant to the data layer; stub them out. */
  loader: { '.css': 'empty' },
  external: ['react-icons/*'],
  /* Axios ships CJS that calls require() at import time, which an ESM bundle
     cannot provide. Re-create it from the real Node module. The same banner
     supplies an in-memory localStorage, which services/api.js expects. */
  banner: {
    js: [
      "import { createRequire as __nexerpCreateRequire } from 'node:module';",
      'const require = __nexerpCreateRequire(import.meta.url);',
      'const __nexerpStore = new Map();',
      'globalThis.localStorage = {',
      '  getItem: (k) => (__nexerpStore.has(k) ? __nexerpStore.get(k) : null),',
      '  setItem: (k, v) => __nexerpStore.set(String(k), String(v)),',
      '  removeItem: (k) => __nexerpStore.delete(k),',
      '  clear: () => __nexerpStore.clear(),',
      '};',
      'globalThis.sessionStorage = globalThis.localStorage;',
    ].join('\n'),
  },
});

const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
process.exit(result.status ?? 1);
