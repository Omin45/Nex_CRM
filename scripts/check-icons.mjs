/**
 * Dev-time guard: every named icon import from react-icons must exist.
 * Run with `node scripts/check-icons.mjs`. Fails loudly instead of letting a
 * missing icon break the production bundle.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const files = [];

(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
})(ROOT);

const IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*['"]react-icons\/([a-z0-9]+)['"]/g;

const sets = new Set();
/** name -> Set<file> */
const used = new Map();

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = IMPORT_RE.exec(source)) !== null) {
    sets.add(match[2]);
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      if (!used.has(name)) used.set(name, new Set());
      used.get(name).add(file);
    }
  }
}

let problems = 0;

for (const set of sets) {
  let mod;
  try {
    mod = await import(`react-icons/${set}`);
  } catch {
    console.log(`MISSING ICON SET: react-icons/${set}`);
    problems += 1;
    continue;
  }

  for (const [name, where] of used) {
    if (!mod[name]) {
      console.log(`MISSING ICON: ${set}/${name}  <-  ${[...where].join(', ')}`);
      problems += 1;
    }
  }
}

console.log(
  problems === 0
    ? `OK: all ${used.size} icon imports across ${files.length} files resolve`
    : `${problems} unresolved icon import(s)`,
);

process.exit(problems === 0 ? 0 : 1);
