/**
 * Ad-hoc renderer: dumps the static markup for one route so the output can be
 * inspected directly. Useful when a smoke assertion fails and you need to see
 * what actually rendered.
 *
 * Usage: node scripts/run-render-dump.mjs /
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const target = process.argv[2] ?? '/';

const ENV = {
  MODE: 'test',
  VITE_USE_MOCKS: 'true',
  VITE_API_BASE_URL: 'http://localhost:8080/api',
  VITE_APP_NAME: 'NexERP',
};

const outDir = mkdtempSync(path.join(tmpdir(), 'nexerp-dump-'));
const outfile = path.join(outDir, 'dump.mjs');

await build({
  entryPoints: ['scripts/render-dump.mjs'],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  jsx: 'automatic',
  alias: { '@': './src' },
  define: { 'import.meta.env': JSON.stringify(ENV), 'DUMP_ROUTE': JSON.stringify(target) },
  loader: { '.css': 'empty' },
  banner: {
    js: [
      "import { createRequire as __nexerpCreateRequire } from 'node:module';",
      'const require = __nexerpCreateRequire(import.meta.url);',
    ].join('\n'),
  },
});

const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit', maxBuffer: 64 * 1024 * 1024 });
process.exit(result.status ?? 1);
