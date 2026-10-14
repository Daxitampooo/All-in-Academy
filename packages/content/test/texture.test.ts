import { createSeededRng, parseCards } from '@pokerall/poker-engine';
import { describe, expect, it } from 'vitest';

import { DAILY_SIZE, cbetPlan, dailyQuestions, flopTexture, rangeAdvantage, textureQuestion } from '../src';

const tex = (b: string) => flopTexture(parseCards(b));

describe('flop texture', () => {
  it('reads the board like the Academy lessons', () => {
    expect(tex('Ks 7d 2c')).toMatchObject({ suits: 'rainbow', connected: false, paired: false, wet: false });
    expect(tex('Jh Th 8c')).toMatchObject({ suits: 'twoTone', connected: true, wet: true });
    expect(tex('6h 5h 4s').connected).toBe(true);
    expect(tex('Ah 2c 3d').connected).toBe(true);
    expect(tex('Td Tc 5s').paired).toBe(true);
    expect(tex('9s 6s 2s').suits).toBe('monotone');
  });

  it('gives the button high flops and the big blind low connected ones', () => {
    expect(rangeAdvantage(tex('Ks 7d 2c'))).toBe('raiser');
    expect(cbetPlan(tex('Ks 7d 2c'))).toBe('small');
    expect(rangeAdvantage(tex('8s 7d 6c'))).toBe('caller');
    expect(cbetPlan(tex('6h 5h 4s'))).toBe('check');
    expect(cbetPlan(tex('Jh Th 8c'))).toBe('big');
    expect(rangeAdvantage(tex('Th 6d 2c'))).toBe('even');
  });

  it('asks both kinds of questions with a valid answer', () => {
    const rng = createSeededRng(new Uint8Array(32).fill(3));
    const kinds = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const q = textureQuestion(rng);
      kinds.add(q.ask);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(3);
    }
    expect(kinds.size).toBe(2);
  });
});

describe('daily challenge', () => {
  it('is the same for everyone on a day and different the next day', () => {
    const a = dailyQuestions('2026-10-14');
    expect(a).toHaveLength(DAILY_SIZE);
    expect(JSON.stringify(dailyQuestions('2026-10-14'))).toBe(JSON.stringify(a));
    expect(JSON.stringify(dailyQuestions('2026-10-15'))).not.toBe(JSON.stringify(a));
    expect(new Set(a.map((q) => q.kind))).toEqual(new Set(['preflop', 'potOdds', 'outs', 'showdown', 'texture']));
  });
});
