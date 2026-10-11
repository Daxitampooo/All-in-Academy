// Fails when the English and Russian interface strings don't have the same keys,
// or when a value is empty. Plural keys (name_one, name_few…) count as one key "name",
// and each language must have its own plural forms. Run with: pnpm check:locales
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../apps/mobile/src/locales/', import.meta.url));
const locales = ['en', 'ru'];
const PLURAL = /_(zero|one|two|few|many|other)$/;
// Forms i18next asks for (Intl.PluralRules categories for whole numbers).
const pluralForms = { en: ['one', 'other'], ru: ['one', 'few', 'many'] };

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flatten(value, path) : [[path, value]];
  });
}

const problems = [];
// lang -> key -> list of values (one for a plain key, one per form for a plural key)
const maps = Object.fromEntries(
  locales.map((lang) => {
    const groups = new Map();
    for (const [path, value] of flatten(JSON.parse(readFileSync(`${dir}${lang}.json`, 'utf8')))) {
      const form = path.match(PLURAL)?.[1];
      const key = form ? path.replace(PLURAL, '') : path;
      if (!groups.has(key)) groups.set(key, { values: [], forms: new Set() });
      groups.get(key).values.push(value);
      if (form) groups.get(key).forms.add(form);
    }
    return [lang, groups];
  }),
);

const placeholdersOf = (value) => String(value ?? '').match(/{{\s*\w+\s*}}/g)?.sort().join(',') ?? '';

const allKeys = new Set(locales.flatMap((lang) => [...maps[lang].keys()]));
for (const key of [...allKeys].sort()) {
  const found = [];
  for (const lang of locales) {
    const group = maps[lang].get(key);
    if (!group) {
      problems.push(`${lang}: missing "${key}"`);
      continue;
    }
    for (const value of group.values) {
      if (typeof value !== 'string' || value.trim() === '') problems.push(`${lang}: empty "${key}"`);
    }
    if (group.forms.size > 0) {
      for (const form of pluralForms[lang]) {
        if (!group.forms.has(form)) problems.push(`${lang}: "${key}" needs the plural form _${form}`);
      }
    }
    // Every form of a key uses the same placeholders, e.g. {{count}}
    const own = new Set(group.values.map(placeholdersOf));
    if (own.size > 1) problems.push(`${lang}: plural forms of "${key}" use different placeholders`);
    found.push(placeholdersOf(group.values[0]));
  }
  if (new Set(found).size > 1) problems.push(`placeholders differ in "${key}": ${found.join(' vs ')}`);
}

if (problems.length) {
  console.error(`Locale check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Locales OK: ${allKeys.size} keys in ${locales.join(', ')}`);
