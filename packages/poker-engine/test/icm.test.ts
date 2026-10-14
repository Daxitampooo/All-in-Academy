import { describe, expect, it } from 'vitest';

import { icmCall, icmEquity } from '../src';

describe('ICM', () => {
  it('matches the three-player example from the Academy', () => {
    const eq = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    expect(eq[0]).toBeCloseTo(38.4, 1);
    expect(eq[1]).toBeCloseTo(32.8, 1);
    expect(eq[2]).toBeCloseTo(28.9, 1);
  });

  it('hands out exactly the prize pool and treats equal stacks equally', () => {
    const eq = icmEquity([1200, 800, 3000, 500, 4500], [40, 25, 15, 12, 8]);
    expect(eq.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
    const same = icmEquity([1000, 1000, 1000, 1000], [50, 30, 20]);
    for (const v of same) expect(v).toBeCloseTo(25, 9);
  });

  it('is linear in chips heads-up and gives nothing to busted players', () => {
    const eq = icmEquity([3000, 1000], [70, 30]);
    expect(eq[0]).toBeCloseTo(30 + 40 * 0.75, 9);
    expect(icmEquity([0, 2000, 1000], [50, 30, 20])).toEqual([0, expect.closeTo(43.33, 1), expect.closeTo(36.67, 1)]);
  });

  it('a bubble call needs much more than 50%', () => {
    const call = icmCall([4000, 3000, 2000, 1000], [50, 30, 20], 1, 0);
    expect(call.chipEquity).toBeCloseTo(0.5, 9);
    expect(call.requiredEquity).toBeCloseTo(0.729, 2);
    expect(call.bubbleFactor).toBeCloseTo(2.69, 1);
  });

  it('busting in a paid place still pays that place', () => {
    const call = icmCall([5000, 3000, 2000], [50, 30, 20], 1, 0);
    expect(call.lose).toBe(20);
    expect(call.requiredEquity).toBeLessThan(0.8);
  });

  it('dead money lowers the equity a call needs', () => {
    const plain = icmCall([5000, 5000, 5000], [50, 30, 20], 0, 1);
    const withBlinds = icmCall([5000, 5000, 5000], [50, 30, 20], 0, 1, 1500);
    expect(withBlinds.requiredEquity).toBeLessThan(plain.requiredEquity);
    expect(withBlinds.chipEquity).toBeCloseTo(5000 / 11500, 9);
  });
});
