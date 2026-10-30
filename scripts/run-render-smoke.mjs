/**
 * Bundles scripts/smoke-render.mjs for Node and runs it.
 *
 * Differs from run-smoke.mjs in two ways:
 *   1. `jsx: 'automatic'` — the app uses Vite's automatic JSX runtime and has no
 *      tsconfig for esbuild to read the setting from. Without this, every .jsx
 *      file compiles to a bare `React.createElement` and dies on an undefined
 *      `React`.
 *   2. react-icons must be bundled, not externalised — the render test pulls in
 *      components that actually render icons.
 *
 * Run: npm run smoke:render
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

const outDir = mkdtempSync(path.join(tmpdir(), 'nexerp-render-smoke-'));
const outfile = path.join(outDir, 'render-smoke.mjs');

await build({
  entryPoints: ['scripts/smoke-render.mjs'],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  jsx: 'automatic',
  logLevel: 'warning',
  alias: { '@': './src' },
  define: { 'import.meta.env': JSON.stringify(ENV) },
  /* Class names are asserted as markup, never as rules. */
  loader: { '.css': 'empty' },
  /* Axios ships CJS that calls require() at import time, which an ESM bundle
     cannot provide. Re-create it from the real Node module. */
  banner: {
    js: [
      "import { createRequire as __nexerpCreateRequire } from 'node:module';",
      'const require = __nexerpCreateRequire(import.meta.url);',
    ].join('\n'),
  },
});

const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
process.exit(result.status ?? 1);
