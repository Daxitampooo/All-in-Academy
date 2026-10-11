import { describe, expect, it } from 'vitest';

import { allInSplit, boardAtLastDecision, createSeededRng, splitByWeights } from '../src';
import { cards, deal, play } from './helpers';

const rng = () => createSeededRng(new Uint8Array(32).fill(7));

describe('splitting chips by weights', () => {
  it('keeps every chip and gives leftovers to the biggest remainders', () => {
    expect(splitByWeights(2000, [42 / 44, 2 / 44])).toEqual([1909, 91]);
    expect(splitByWeights(100, [1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
    expect(splitByWeights(7, [1, 0])).toEqual([7, 0]);
    expect(splitByWeights(10, [0, 0])).toEqual([5, 5]);
  });
});

describe('all-in by equity', () => {
  it('splits a turn all-in by the exact odds, whatever the river brings', () => {
    // Aces against kings on the turn: only the two remaining kings save the kings. The river is one of them.
    const hand = play(
      deal([1000, 1000], { holes: ['AhAd', 'KhKd'], board: '2c7s9hJcKs' }),
      'call',
      'check',
      'check',
      'check',
      'check',
      'allin',
      'call',
    );
    expect(hand.phase).toBe('complete');
    expect(hand.result!.won).toEqual([0, 2000]);
    expect(boardAtLastDecision(hand)).toEqual(cards('2c7s9hJc'));

    const split = allInSplit(hand, { rng: rng() })!;
    expect(split.board).toEqual(cards('2c7s9hJc'));
    expect(split.equity[0]).toBeCloseTo(42 / 44, 10);
    expect(split.equity[1]).toBeCloseTo(2 / 44, 10);
    expect(split.won).toEqual([1909, 91]);
    expect(split.net).toEqual([909, -909]);
  });

  it('uses the chances before the flop for a preflop all-in', () => {
    const hand = play(deal([10000, 10000], { holes: ['AsAh', 'KdKc'], board: 'Ks7d2h9c3s' }), 'allin', 'call');
    expect(hand.result!.won).toEqual([0, 20000]);
    const split = allInSplit(hand, { rng: rng() })!;
    expect(split.board).toEqual([]);
    // Aces win about 82% against kings.
    expect(split.equity[0]).toBeGreaterThan(0.8);
    expect(split.equity[0]).toBeLessThan(0.84);
    expect(split.won[0]! + split.won[1]!).toBe(20000);
    expect(split.net[0]! + split.net[1]!).toBe(0);
  });

  it('only splits pots the player could win', () => {
    // Short stack all-in, two bigger stacks keep betting: the side pot is theirs alone.
    const start = deal([1000, 3000, 3000], { holes: ['AsAh', 'KdKc', 'QdQc'], board: '2c7d9hJs3c' });
    const hand = play(start, 'allin', 'call', 'call', 'check', 'bet 1000', 'call', 'check', 'check', 'check', 'check');
    expect(hand.phase).toBe('complete');
    // The betting reached the river, so nothing is left to luck.
    expect(allInSplit(hand, { rng: rng() })).toBeNull();

    const allIn = play(start, 'allin', 'allin', 'call');
    expect(allIn.result!.pots).toHaveLength(2);
    const split = allInSplit(allIn, { rng: rng() })!;
    const total = allIn.result!.pots.reduce((a, p) => a + p.amount, 0);
    expect(split.won.reduce((a, b) => a + b, 0)).toBe(total);
    expect(split.net.reduce((a, b) => a + b, 0)).toBe(0);
    // Seat 0 can only win the main pot of 3 × 1000.
    expect(split.won[0]!).toBeLessThanOrEqual(3000);
    expect(split.equity.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('leaves hands without an all-in runout alone', () => {
    expect(allInSplit(play(deal([1000, 1000]), 'raise 300', 'fold'), { rng: rng() })).toBeNull();
    const river = play(
      deal([1000, 1000], { holes: ['AsAh', 'KdKc'], board: '2c7d9hJs3c' }),
      'call',
      'check',
      'check',
      'check',
      'check',
      'check',
      'check',
      'allin',
      'call',
    );
    expect(river.phase).toBe('complete');
    expect(allInSplit(river, { rng: rng() })).toBeNull();
  });
});
