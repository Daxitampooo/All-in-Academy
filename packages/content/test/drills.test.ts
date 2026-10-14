import { createSeededRng, evaluate, parseCards, seedFromHex, type Card } from '@pokerall/poker-engine';
import { describe, expect, it } from 'vitest';

import { checkPreflop, drawOuts, outsQuestion, potOddsQuestion, preflopQuestion, showdownQuestion } from '../src';

const rng = () => createSeededRng(seedFromHex('5e'.repeat(32)));

describe('drills', () => {
  it('preflop questions use the reference ranges', () => {
    const r = rng();
    let mixed = 0;
    for (let i = 0; i < 300; i++) {
      const q = preflopQuestion(r);
      expect(q.cards[0]).not.toBe(q.cards[1]);
      expect(q.raise).toBeGreaterThanOrEqual(0);
      expect(q.raise).toBeLessThanOrEqual(1);
      const verdict = checkPreflop(q, q.raise >= 0.5 ? 'raise' : 'fold');
      expect(verdict.correct).toBe(true);
      if (verdict.mixed) mixed += 1;
    }
    expect(preflopQuestion(r, 'UTG').seat).toBe('UTG');
    // Aces are always opened, seven-deuce never: a wrong move is caught.
    const aces = { seat: 'UTG' as const, cards: parseCards('As Ah') as [Card, Card], handClass: 'AA', raise: 1 };
    expect(checkPreflop(aces, 'fold')).toEqual({ correct: false, mixed: false });
    const trash = { seat: 'BTN' as const, cards: parseCards('7c 2d') as [Card, Card], handClass: '72o', raise: 0 };
    expect(checkPreflop(trash, 'raise').correct).toBe(false);
    expect(mixed).toBeLessThan(300);
  });

  it('pot odds: bet / (pot + 2 bet)', () => {
    const r = rng();
    for (let i = 0; i < 200; i++) {
      const q = potOddsQuestion(r);
      expect(q.need).toBe(Math.round((q.bet / (q.pot + 2 * q.bet)) * 100));
      expect(q.options[q.answer]).toBe(q.need);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it('counts outs: 9 for a flush draw, 8 for an open-ended straight draw', () => {
    expect(drawOuts(parseCards('Ah 5h'), parseCards('Kh 9h 2c'))).toHaveLength(9);
    expect(drawOuts(parseCards('9c 8d'), parseCards('7h 6s 2c'))).toHaveLength(8);
    expect(drawOuts(parseCards('9c 8d'), parseCards('Jh 7s 2c'))).toHaveLength(4);
    // Flush draw plus open-ended straight draw: 15 outs.
    expect(drawOuts(parseCards('9h 8h'), parseCards('7h 6c 2h'))).toHaveLength(15);
  });

  it('outs questions always have a draw with 4 to 15 outs', () => {
    const r = rng();
    for (let i = 0; i < 100; i++) {
      const q = outsQuestion(r);
      expect(q.outs.length).toBeGreaterThanOrEqual(4);
      expect(q.outs.length).toBeLessThanOrEqual(15);
      expect(q.options[q.answer]).toBe(q.outs.length);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it('showdown questions name the right winner', () => {
    const r = rng();
    for (let i = 0; i < 200; i++) {
      const q = showdownQuestion(r);
      const v = q.hands.map((h) => evaluate([...h, ...q.board] as Card[]));
      expect(q.winner).toBe(v[0]! > v[1]! ? 0 : v[1]! > v[0]! ? 1 : 2);
    }
  });
});
