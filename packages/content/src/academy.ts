import { parseRange, type Range } from '@pokerall/poker-engine';

import enGlossary from '../glossary/en.json';
import glossaryLinks from '../glossary/links.json';
import ruGlossary from '../glossary/ru.json';
import { LESSON_FILES } from './lessonFiles';
import { RANGE_FILES } from './rangeFiles';
import type { GlossaryTerm, Lesson, Level, Locale, ModuleId, ModuleMeta, RangeSpec } from './types';

/** Levels in order, each with its modules in order. */
export const LEVELS: { id: Level; modules: ModuleId[] }[] = [
  { id: 'beginner', modules: ['basics', 'positions'] },
  { id: 'intermediate', modules: ['preflop', 'math', 'postflop', 'reads', 'mindset'] },
  { id: 'advanced', modules: ['theory', 'tournaments', 'cash', 'shorthanded'] },
];

const LESSON_ORDER: Record<ModuleId, string[]> = {
  basics: ['basics-rules', 'basics-hands', 'basics-blinds', 'basics-board'],
  positions: ['positions-names', 'positions-why'],
  preflop: ['preflop-hands', 'preflop-rfi', 'preflop-limpers', 'preflop-3bet', 'preflop-blinds'],
  math: ['math-outs', 'math-pot-odds', 'math-ev', 'math-implied', 'math-combos'],
  postflop: [],
  reads: [],
  mindset: [],
  theory: [],
  tournaments: [],
  cash: [],
  shorthanded: [],
};

export const MODULES: ModuleMeta[] = LEVELS.flatMap((level) =>
  level.modules.map((id) => ({ id, level: level.id, lessons: LESSON_ORDER[id] })),
);

const lessons = new Map<string, Lesson>(
  LESSON_FILES.map(({ meta, en, ru }) => [meta.id, { ...meta, text: { en, ru } }]),
);

export function moduleById(id: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.id === id);
}

export function lessonById(id: string): Lesson | undefined {
  return lessons.get(id);
}

export function allLessons(): Lesson[] {
  return MODULES.flatMap((m) => m.lessons.map((id) => lessons.get(id)!));
}

/** The lesson after this one in its module, if any. */
export function nextLesson(id: string): Lesson | undefined {
  const lesson = lessons.get(id);
  if (!lesson) return undefined;
  const order = LESSON_ORDER[lesson.module];
  const next = order[order.indexOf(id) + 1];
  return next ? lessons.get(next) : undefined;
}

const ranges = new Map<string, RangeSpec>(RANGE_FILES.map((r) => [r.id, r]));
const parsed = new Map<string, Record<string, Range>>();

export function rangeById(id: string): RangeSpec | undefined {
  return ranges.get(id);
}

/** A range's actions parsed into 1326-combo weights, cached. */
export function rangeActions(id: string): Record<string, Range> {
  let out = parsed.get(id);
  if (!out) {
    const spec = ranges.get(id);
    if (!spec) throw new Error(`Unknown range "${id}"`);
    out = Object.fromEntries(Object.entries(spec.actions).map(([action, a]) => [action, parseRange(a.range)]));
    parsed.set(id, out);
  }
  return out;
}

/** Opening ranges by 6-max seat, for the preflop trainer. */
export const RFI_RANGES: Record<string, string> = {
  UTG: '6max-100bb-rfi-UTG',
  HJ: '6max-100bb-rfi-HJ',
  CO: '6max-100bb-rfi-CO',
  BTN: '6max-100bb-rfi-BTN',
  SB: '6max-100bb-rfi-SB',
};

const glossaryText: Record<Locale, Record<string, { term: string; definition: string }>> = { en: enGlossary, ru: ruGlossary };
const links: Record<string, string> = glossaryLinks;

/** Every glossary term in a language, sorted by the term. */
export function glossary(locale: Locale): (GlossaryTerm & { id: string })[] {
  return Object.entries(glossaryText[locale])
    .map(([id, t]) => ({ id, ...t, lesson: links[id] }))
    .sort((a, b) => a.term.localeCompare(b.term, locale));
}

/**
 * Where the hand analysis sends the player for each kind of mistake. Lessons of modules still being
 * written map to null.
 */
export const COACH_LESSONS: Record<string, string | null> = {
  'preflop-rfi': 'preflop-rfi',
  'preflop-vs-open': 'preflop-blinds',
  'preflop-3bet': 'preflop-3bet',
  'sizing-preflop': 'preflop-rfi',
  'math-pot-odds': 'math-pot-odds',
  'postflop-draws': 'math-outs',
  'postflop-value': null,
  'postflop-bluff': 'math-ev',
};
