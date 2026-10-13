#!/usr/bin/env node
/**
 * Keeps the cheating training bots (Lekha's rigged deck, Danil who sees every card) inside the offline
 * training module of the mobile app:
 *  - only the practice table hook may import `apps/mobile/src/training`;
 *  - the module itself may only import the pure game packages and its own files, so it can't reach
 *    the network, the server or multiplayer code.
 * Fails CI otherwise.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trainingDir = join(root, 'apps/mobile/src/training');
const allowedImporters = new Set(['apps/mobile/src/table/useTableGame.ts']);
const allowedInside = new Set(['@pokerall/poker-engine', '@pokerall/bots']);
const SKIP = new Set(['node_modules', 'dist', 'build', '.expo', '.turbo', 'android', 'ios', 'coverage']);
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (SOURCE.test(name)) yield path;
  }
}

/** Every module specifier in a file: static and dynamic imports, re-exports and requires. */
function specifiers(source) {
  const out = [];
  const patterns = [/\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, /\bimport\s+['"]([^'"]+)['"]/g, /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g];
  for (const re of patterns) for (const m of source.matchAll(re)) out.push(m[1]);
  return out;
}

/** Where a specifier points inside the repo, or null for packages. */
function target(file, spec) {
  if (spec.startsWith('@/')) return join(root, 'apps/mobile/src', spec.slice(2));
  if (spec.startsWith('.')) return resolve(dirname(file), spec);
  return null;
}

const inTraining = (path) => path === trainingDir || path.startsWith(trainingDir + sep);
const problems = [];

for (const base of ['apps', 'packages']) {
  for (const file of files(join(root, base))) {
    const rel = relative(root, file).split(sep).join('/');
    const source = readFileSync(file, 'utf8');
    for (const spec of specifiers(source)) {
      const to = target(file, spec);
      if (inTraining(file)) {
        if (to ? !inTraining(to) : !allowedInside.has(spec)) {
          problems.push(`${rel}: the training module may not import "${spec}"`);
        }
      } else if (to && inTraining(to) && !allowedImporters.has(rel)) {
        problems.push(`${rel}: imports the training module ("${spec}"); only ${[...allowedImporters].join(', ')} may`);
      }
    }
  }
}

if (problems.length) {
  console.error('Training bots must stay in the offline training module:\n' + problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log('Training module isolated');
