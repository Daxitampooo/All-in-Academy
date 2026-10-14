import forms from '../glossary/forms.json';
import type { Locale } from './types';

/**
 * Glossary terms inside lesson text. Every term has a list of word forms in glossary/forms.json (Russian
 * cases, English plurals and verb forms), so "контбетом" leads to the c-bet entry. A form matches only as
 * a whole word; a hyphen counts as part of the word, so "чек" doesn't match inside "чек-рейз".
 * Abbreviations in capitals (EV, SPR, ICM) match only in capitals.
 */

export type TermMatch = { start: number; end: number; id: string };

type Matcher = { regex: RegExp; byForm: Map<string, { id: string; exact: string | null }> };

const formsByLocale: Record<Locale, Record<string, string[]>> = { en: forms.en, ru: forms.ru };
/** Everyday phrases that contain a term's word without meaning the term ("your turn"). */
const ignoreByLocale: Record<Locale, string[]> = forms.ignore;
const matchers = new Map<Locale, Matcher>();

const isUpper = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
const WORD = /[0-9A-Za-zА-Яа-яЁё-]/;

function matcher(locale: Locale): Matcher {
  const cached = matchers.get(locale);
  if (cached) return cached;
  const byForm = new Map<string, { id: string; exact: string | null }>();
  for (const [id, list] of Object.entries(formsByLocale[locale])) {
    for (const form of list) byForm.set(form.toLowerCase(), { id, exact: isUpper(form) ? form : null });
  }
  // Longest forms first, so "чек-рейз" wins over "чек" and "контбетом" over "контбет".
  const alternatives = [...byForm.keys()].sort((a, b) => b.length - a.length).map(escape);
  const made = { regex: new RegExp(alternatives.join('|'), 'g'), byForm };
  matchers.set(locale, made);
  return made;
}

/** Every glossary term in a text, left to right, without overlaps. */
export function findTerms(text: string, locale: Locale): TermMatch[] {
  const { regex, byForm } = matcher(locale);
  const lower = text.toLowerCase();
  const out: TermMatch[] = [];
  const ignored: [number, number][] = [];
  for (const phrase of ignoreByLocale[locale]) {
    for (let i = lower.indexOf(phrase); i >= 0; i = lower.indexOf(phrase, i + 1)) ignored.push([i, i + phrase.length]);
  }
  regex.lastIndex = 0;
  for (let m = regex.exec(lower); m; m = regex.exec(lower)) {
    const start = m.index;
    const end = start + m[0].length;
    const form = byForm.get(m[0])!;
    const before = start > 0 ? lower[start - 1]! : ' ';
    const after = end < lower.length ? lower[end]! : ' ';
    const exactOk = form.exact === null || text.slice(start, end) === form.exact;
    const inPhrase = ignored.some(([a, b]) => start < b && end > a);
    if (inPhrase) continue;
    if (WORD.test(before) || WORD.test(after) || !exactOk) {
      // Not a whole word here: try again from the next character.
      regex.lastIndex = start + 1;
      continue;
    }
    out.push({ start, end, id: form.id });
  }
  return out;
}

/**
 * Marks the first use of each glossary term across texts read in order (a lesson's text blocks) as
 * "[[id|word]]". Later uses stay plain, so the text doesn't turn into a wall of links. Terms in `skip`
 * are left alone.
 */
export function linkTerms(texts: readonly string[], locale: Locale, skip: readonly string[] = []): string[] {
  const seen = new Set(skip);
  return texts.map((text) => {
    let out = '';
    let at = 0;
    for (const m of findTerms(text, locale)) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out += `${text.slice(at, m.start)}[[${m.id}|${text.slice(m.start, m.end)}]]`;
      at = m.end;
    }
    return out + text.slice(at);
  });
}

export type TermSegment = { text: string; term?: string };

/** Splits text with "[[id|word]]" marks into plain and term pieces. */
export function termSegments(text: string): TermSegment[] {
  const out: TermSegment[] = [];
  const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
  let at = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: m[2]!, term: m[1]! });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
