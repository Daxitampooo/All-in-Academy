// Fails when the English and Russian interface strings don't have the same keys,
// or when a value is empty. Run with: pnpm check:locales
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../apps/mobile/src/locales/', import.meta.url));
const locales = ['en', 'ru'];

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flatten(value, path) : [[path, value]];
  });
}

const maps = Object.fromEntries(
  locales.map((lang) => [lang, new Map(flatten(JSON.parse(readFileSync(`${dir}${lang}.json`, 'utf8'))))]),
);

const problems = [];
const allKeys = new Set(locales.flatMap((lang) => [...maps[lang].keys()]));
for (const key of [...allKeys].sort()) {
  for (const lang of locales) {
    const value = maps[lang].get(key);
    if (value === undefined) problems.push(`${lang}: missing "${key}"`);
    else if (typeof value !== 'string' || value.trim() === '') problems.push(`${lang}: empty "${key}"`);
  }
  // Interpolation placeholders must match, e.g. {{level}}
  const placeholders = locales.map((lang) =>
    String(maps[lang].get(key) ?? '').match(/{{\s*\w+\s*}}/g)?.sort().join(',') ?? '',
  );
  if (new Set(placeholders).size > 1) problems.push(`placeholders differ in "${key}": ${placeholders.join(' vs ')}`);
}

if (problems.length) {
  console.error(`Locale check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Locales OK: ${allKeys.size} keys in ${locales.join(', ')}`);
