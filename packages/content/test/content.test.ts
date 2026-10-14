import { comboIndex, classCombos, parseCards, rangeShare } from '@pokerall/poker-engine';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { LESSON_FILES } from '../src/lessonFiles';
import { RANGE_FILES } from '../src/rangeFiles';
import { COACH_LESSONS, HAND_RANKING, MODULES, RFI_RANGES, allLessons, glossary, lessonById, nextLesson, rangeActions, rangeById } from '../src';
import enGlossary from '../glossary/en.json';
import links from '../glossary/links.json';
import ruGlossary from '../glossary/ru.json';

const id = z.string().regex(/^[a-z0-9-]+$/);
const block = z.discriminatedUnion('type', [
  z.object({ id, type: z.literal('text') }).strict(),
  z.object({ id, type: z.literal('handRanking') }).strict(),
  z.object({ id, type: z.literal('cards'), rows: z.array(z.string()).min(1) }).strict(),
  z.object({ id, type: z.literal('table'), seats: z.union([z.literal(2), z.literal(6), z.literal(9)]), highlight: z.array(z.string()) }).strict(),
  z.object({ id, type: z.literal('range'), range: z.string() }).strict(),
  z.object({ id, type: z.literal('potOdds'), bet: z.number().positive().max(3) }).strict(),
  z.object({ id, type: z.literal('quiz'), answer: z.number().int().min(0), options: z.number().int().min(2).max(5) }).strict(),
]);
const meta = z
  .object({
    id,
    module: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    free: z.boolean(),
    minutes: z.number().int().positive(),
    pass: z.number().gt(0).lte(1),
    blocks: z.array(block).min(1),
    test: z.array(z.object({ id, answer: z.number().int().min(0), options: z.number().int().min(2).max(5) }).strict()).min(2),
  })
  .strict();
const nonEmpty = z.string().trim().min(1);
const question = z.object({ q: nonEmpty, options: z.array(nonEmpty), explain: nonEmpty }).strict();
const text = z
  .object({
    title: nonEmpty,
    summary: nonEmpty,
    blocks: z.record(
      z.object({ text: nonEmpty.optional(), caption: nonEmpty.optional(), labels: z.array(nonEmpty).optional(), q: nonEmpty.optional(), options: z.array(nonEmpty).optional(), explain: nonEmpty.optional() }).strict(),
    ),
    test: z.record(question),
  })
  .strict();

/** "As Kd | Qh Jh 2c": the hand and the board must be real, different cards. */
function checkRow(row: string) {
  const [hand = '', board = ''] = row.split('|').map((s) => s.trim());
  const cards = [...(hand ? parseCards(hand) : []), ...(board ? parseCards(board) : [])];
  expect(new Set(cards).size, row).toBe(cards.length);
  if (hand) expect(parseCards(hand).length, row).toBe(2);
  if (board) expect([3, 4, 5]).toContain(parseCards(board).length);
}

describe('lessons', () => {
  it('every lesson file has a valid structure and complete texts in both languages', () => {
    for (const { meta: m, en, ru } of LESSON_FILES) {
      meta.parse(m);
      for (const [lang, t] of [['en', en], ['ru', ru]] as const) {
        text.parse(t);
        for (const b of m.blocks) {
          const bt = t.blocks[b.id];
          expect(bt, `${m.id}/${lang}/${b.id}`).toBeDefined();
          if (b.type === 'text') expect(bt!.text, `${m.id}/${b.id}`).toBeTruthy();
          if (['table', 'range', 'potOdds'].includes(b.type)) expect(bt!.caption, `${m.id}/${b.id}`).toBeTruthy();
          if (b.type === 'cards') {
            expect(bt!.labels?.length, `${m.id}/${b.id}`).toBe(b.rows.length);
            b.rows.forEach(checkRow);
          }
          if (b.type === 'quiz') {
            expect(bt!.q && bt!.explain, `${m.id}/${b.id}`).toBeTruthy();
            expect(bt!.options?.length, `${m.id}/${b.id}`).toBe(b.options);
            expect(b.answer).toBeLessThan(b.options);
          }
          if (b.type === 'range') expect(rangeById(b.range), `${m.id}/${b.range}`).toBeDefined();
        }
        expect(Object.keys(t.blocks).sort()).toEqual(m.blocks.map((b) => b.id).sort());
        for (const q of m.test) {
          expect(t.test[q.id], `${m.id}/${lang}/${q.id}`).toBeDefined();
          expect(t.test[q.id]!.options.length).toBe(q.options);
          expect(q.answer).toBeLessThan(q.options);
        }
        expect(Object.keys(t.test).sort()).toEqual(m.test.map((q) => q.id).sort());
      }
      expect(new Set(m.blocks.map((b) => b.id)).size).toBe(m.blocks.length);
    }
  });

  it('every lesson belongs to exactly one module, in its level', () => {
    const listed = MODULES.flatMap((m) => m.lessons);
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.sort()).toEqual(LESSON_FILES.map((f) => f.meta.id).sort());
    for (const m of MODULES) for (const l of m.lessons) expect(lessonById(l)!.module).toBe(m.id);
    expect(allLessons().length).toBe(LESSON_FILES.length);
    expect(nextLesson('basics-rules')!.id).toBe('basics-hands');
    expect(nextLesson('basics-board')).toBeUndefined();
  });

  it('beginner lessons and the opening ranges are free', () => {
    for (const l of allLessons()) if (l.level === 'beginner') expect(l.free, l.id).toBe(true);
    expect(lessonById('preflop-rfi')!.free).toBe(true);
  });
});

describe('ranges', () => {
  it('parse, and no hand is played more than 100% of the time', () => {
    for (const spec of RANGE_FILES) {
      const actions = rangeActions(spec.id);
      const total = new Float32Array(1326);
      for (const r of Object.values(actions)) {
        expect(rangeShare(r)).toBeGreaterThan(0);
        r.forEach((w, i) => (total[i]! += w));
      }
      for (let i = 0; i < 1326; i++) expect(total[i]!, `${spec.id} combo ${i}`).toBeLessThanOrEqual(1.0001);
    }
  });

  it('opening ranges widen towards the button', () => {
    const share = (seat: string) => rangeShare(rangeActions(RFI_RANGES[seat]!).raise!);
    expect(share('UTG')).toBeLessThan(share('HJ'));
    expect(share('HJ')).toBeLessThan(share('CO'));
    expect(share('CO')).toBeLessThan(share('BTN'));
    const utg = rangeActions(RFI_RANGES.UTG!).raise!;
    const [a, b] = classCombos('AA')[0]!;
    expect(utg[comboIndex(a, b)]).toBe(1);
    const [c, d] = classCombos('72o')[0]!;
    expect(utg[comboIndex(c, d)]).toBe(0);
  });
});

describe('glossary and links', () => {
  it('has the same terms in both languages, and links point to lessons', () => {
    expect(Object.keys(enGlossary).sort()).toEqual(Object.keys(ruGlossary).sort());
    for (const lesson of Object.values(links as Record<string, string>)) expect(lessonById(lesson), lesson).toBeDefined();
    expect(glossary('ru').length).toBe(Object.keys(ruGlossary).length);
  });

  it('coach lessons exist', () => {
    for (const lesson of Object.values(COACH_LESSONS)) if (lesson) expect(lessonById(lesson), lesson).toBeDefined();
  });

  it('hand ranking examples are real hands', () => {
    for (const h of HAND_RANKING) expect(parseCards(h.example)).toHaveLength(5);
    expect(HAND_RANKING.reduce((s, h) => s + h.percent, 0)).toBeCloseTo(100, 0);
  });
});
