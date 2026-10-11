import { describe, expect, it } from 'vitest';

import {
  COMBO_COUNT,
  classCell,
  classCombos,
  comboCards,
  comboCount,
  comboIndex,
  createSeededRng,
  formatRange,
  gridClass,
  handClassOf,
  handEquity,
  parseCards,
  parseRange,
  rangeCombos,
  rangeEquity,
  rangeGrid,
  rangeShare,
  seedFromHex,
} from '../src';
import { cards, two } from './helpers';

const rng = () => createSeededRng(seedFromHex('cd'.repeat(32)));

describe('combo indexes', () => {
  it('maps every pair of cards to a unique index and back', () => {
    const seen = new Set<number>();
    for (let a = 0; a < 52; a++)
      for (let b = a + 1; b < 52; b++) {
        const i = comboIndex(a, b);
        expect(comboIndex(b, a)).toBe(i);
        expect(comboCards(i)).toEqual([b, a]);
        seen.add(i);
      }
    expect(seen.size).toBe(COMBO_COUNT);
  });
});

describe('hand classes and the 13×13 grid', () => {
  it('lays out pairs on the diagonal, suited above, offsuit below', () => {
    expect(gridClass(0, 0)).toBe('AA');
    expect(gridClass(0, 1)).toBe('AKs');
    expect(gridClass(1, 0)).toBe('AKo');
    expect(gridClass(12, 12)).toBe('22');
    expect(gridClass(3, 9)).toBe('J5s');
    expect(classCell('J5s')).toEqual({ row: 3, col: 9 });
    expect(classCell('J5o')).toEqual({ row: 9, col: 3 });
  });

  it('counts combos per class', () => {
    expect(classCombos('QQ')).toHaveLength(6);
    expect(classCombos('AKs')).toHaveLength(4);
    expect(classCombos('AKo')).toHaveLength(12);
    expect(classCombos('AK')).toHaveLength(16);
  });

  it('names the class of two cards', () => {
    expect(handClassOf(...two('As Kd'))).toBe('AKo');
    expect(handClassOf(...two('7h 8h'))).toBe('87s');
    expect(handClassOf(...two('Tc Td'))).toBe('TT');
  });
});

describe('range notation', () => {
  it('expands plus and dash ranges', () => {
    expect(comboCount(parseRange('22+'))).toBe(78);
    expect(comboCount(parseRange('TT-77'))).toBe(24);
    expect(comboCount(parseRange('A2s+'))).toBe(48);
    expect(comboCount(parseRange('KTo+'))).toBe(36);
    expect(comboCount(parseRange('ATs+'))).toBe(16);
    expect(comboCount(parseRange('A5s-A2s'))).toBe(16);
    expect(comboCount(parseRange('AK'))).toBe(16);
    expect(comboCount(parseRange('AhKh'))).toBe(1);
  });

  it('applies weights and lets later tokens override earlier ones', () => {
    expect(comboCount(parseRange('AKo:0.5'))).toBe(6);
    expect(comboCount(parseRange('AKo:50%'))).toBe(6);
    expect(comboCount(parseRange('QQ+, KK:0'))).toBe(12);
    const grid = rangeGrid(parseRange('AKs, AKo:0.25'));
    expect(grid[0]![1]).toBe(1);
    expect(grid[1]![0]).toBe(0.25);
  });

  it('covers every combo with an "any two" range', () => {
    const anyTwo = parseRange('22+, A2+, K2+, Q2+, J2+, T2+, 92+, 82+, 72+, 62+, 52+, 42+, 32');
    expect(comboCount(anyTwo)).toBe(1326);
    expect(rangeShare(anyTwo)).toBe(1);
  });

  it('skips combos that use dead cards', () => {
    const aa = parseRange('AA');
    expect(comboCount(aa, cards('As'))).toBe(3);
    expect(comboCount(aa, cards('As Ah'))).toBe(1);
    expect(rangeCombos(aa, cards('As Ah Ad'))).toHaveLength(0);
  });

  it('writes ranges back in compact notation', () => {
    for (const text of ['22+', 'TT-77', 'ATs+', 'A5s-A2s', 'AKo:0.5', 'QQ+, AKs, AKo']) {
      const range = parseRange(text);
      expect(Array.from(parseRange(formatRange(range)))).toEqual(Array.from(range));
    }
    expect(formatRange(parseRange('JJ+, A2s+, KTo+, AhKh'))).toBe('JJ+, A2s+, KTo+');
    expect(formatRange(parseRange('AdKc'))).toBe('AdKc');
  });

  it('rejects nonsense', () => {
    expect(() => parseRange('AAs')).toThrow();
    expect(() => parseRange('AK:2x')).toThrow();
    expect(() => parseRange('AK-QJ')).toThrow();
  });
});

describe('equity', () => {
  it('is exact on the turn: 15 outs out of 44 cards', () => {
    // Ace-high flush draw against queens: any heart, ace or king wins.
    const r = handEquity([two('Ah Kh'), two('Qs Qd')], cards('2h 7h 9c Js'));
    expect(r.exact).toBe(true);
    expect(r.samples).toBe(44);
    expect(r.equity[0]).toBeCloseTo(15 / 44, 10);
    expect(r.equity[1]).toBeCloseTo(29 / 44, 10);
  });

  it('gives aces about 82% against kings preflop (exact, 1 712 304 boards)', () => {
    const r = handEquity([two('As Ah'), two('Ks Kd')], [], { exactLimit: 2_000_000 });
    expect(r.exact).toBe(true);
    expect(r.samples).toBe(1_712_304);
    expect(r.equity[0]).toBeGreaterThan(0.815);
    expect(r.equity[0]).toBeLessThan(0.825);
  });

  it('is 1 or 0 on the river', () => {
    const r = handEquity([two('As Ad'), two('Ks Kd')], cards('2c 7h 9d Jc 3s'));
    expect(r.equity).toEqual([1, 0]);
  });

  it('splits identical hands', () => {
    const r = handEquity([two('As Kd'), two('Ad Kc')], cards('2c 7h 9s'));
    expect(r.equity[0]).toBeCloseTo(r.equity[1]!, 10);
    expect(r.equity[0]! + r.equity[1]!).toBeCloseTo(1, 10);
  });

  it('samples close to the exact answer', () => {
    const hands = [two('Ah Kh'), two('Qs Qd')];
    const flop = cards('2h 7h 9c');
    const exact = handEquity(hands, flop);
    expect(exact.exact).toBe(true);
    const sampled = handEquity(hands, flop, { exactLimit: 0, iterations: 40_000, rng: rng() });
    expect(sampled.exact).toBe(false);
    expect(sampled.equity[0]).toBeCloseTo(exact.equity[0]!, 1.7);
  });

  it('gives aces about 85% against a random hand preflop', () => {
    const anyTwo = parseRange('22+, A2+, K2+, Q2+, J2+, T2+, 92+, 82+, 72+, 62+, 52+, 42+, 32');
    expect(comboCount(anyTwo)).toBe(1326);
    const r = rangeEquity([{ cards: two('As Ah') }, { range: rangeCombos(anyTwo) }], [], {
      rng: rng(),
      iterations: 30_000,
    });
    expect(r.equity[0]).toBeGreaterThan(0.83);
    expect(r.equity[0]).toBeLessThan(0.87);
  });

  it('matches hand equity when a range is a single combo', () => {
    const flop = cards('2h 7h 9c');
    const exact = handEquity([two('Ah Kh'), two('Qs Qd')], flop);
    const viaRange = rangeEquity([{ cards: two('Ah Kh') }, { range: rangeCombos(parseRange('QsQd')) }], flop, {
      rng: rng(),
      iterations: 40_000,
    });
    expect(viaRange.equity[0]).toBeCloseTo(exact.equity[0]!, 1.7);
  });

  it('rejects duplicate cards', () => {
    expect(() => handEquity([two('As Kd'), two('As Qc')])).toThrow(/twice/);
    expect(parseCards('As Kd')).toHaveLength(2);
  });
});
