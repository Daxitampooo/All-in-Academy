import { describe, expect, it } from 'vitest';

import { hasPositionOn, postflopOrder, preflopSituation } from '../src';
import { deal, play } from './helpers';

// Six players, button on seat 0: SB 1, BB 2, UTG 3, HJ 4, CO 5.
const sixMax = () => deal([10000, 10000, 10000, 10000, 10000, 10000]);

describe('preflop situation', () => {
  it('is unopened until someone puts chips in voluntarily', () => {
    const s = sixMax();
    expect(s.toAct).toBe(3);
    expect(preflopSituation(s)).toEqual({ kind: 'unopened' });
    expect(preflopSituation(play(s, 'fold', 'fold'))).toEqual({ kind: 'unopened' });
  });

  it('counts limpers, including a small blind that completes', () => {
    expect(preflopSituation(play(sixMax(), 'call', 'call'))).toEqual({ kind: 'limped', limpers: [3, 4] });
    const blinds = play(sixMax(), 'fold', 'fold', 'fold', 'fold', 'call');
    expect(blinds.toAct).toBe(2);
    expect(preflopSituation(blinds)).toEqual({ kind: 'limped', limpers: [1] });
  });

  it('sees an open raise, and the callers that turn a 3-bet into a squeeze', () => {
    expect(preflopSituation(play(sixMax(), 'raise 250'))).toEqual({ kind: 'open', raiser: 3, callers: [] });
    expect(preflopSituation(play(sixMax(), 'raise 250', 'call'))).toEqual({ kind: 'open', raiser: 3, callers: [4] });
    // A limper who calls the raise behind him counts as a caller of that raise.
    const limpThenCall = play(sixMax(), 'call', 'raise 400', 'fold', 'fold', 'fold', 'fold', 'call');
    expect(preflopSituation(limpThenCall)).toMatchObject({ kind: 'open', raiser: 4, callers: [3] });
  });

  it('sees 3-bets and 4-bets', () => {
    expect(preflopSituation(play(sixMax(), 'raise 250', 'raise 750'))).toEqual({ kind: 'three-bet', raiser: 4, callers: [] });
    expect(preflopSituation(play(sixMax(), 'raise 250', 'raise 750', 'call'))).toEqual({
      kind: 'three-bet',
      raiser: 4,
      callers: [5],
    });
    expect(preflopSituation(play(sixMax(), 'raise 250', 'raise 750', 'raise 1800'))).toEqual({
      kind: 'four-bet',
      raiser: 5,
      callers: [],
      raises: 3,
    });
  });

  it('works heads-up, where the button opens and the big blind answers', () => {
    const s = play(deal([10000, 10000]), 'raise 250');
    expect(s.toAct).toBe(1);
    expect(preflopSituation(s)).toEqual({ kind: 'open', raiser: 0, callers: [] });
    expect(preflopSituation(play(deal([10000, 10000]), 'call'))).toEqual({ kind: 'limped', limpers: [0] });
  });
});

describe('position after the flop', () => {
  it('puts the small blind first and the button last', () => {
    const s = sixMax();
    expect([0, 1, 2, 3, 4, 5].map((seat) => postflopOrder(s, seat))).toEqual([5, 0, 1, 2, 3, 4]);
    const moved = deal([10000, 10000, 10000, 10000, 10000, 10000], { button: 4 });
    expect(postflopOrder(moved, 4)).toBe(5);
    expect(postflopOrder(moved, 5)).toBe(0);
  });

  it('heads-up: the button is in position, the big blind is not', () => {
    const s = deal([10000, 10000]);
    expect(hasPositionOn(s, 0, [1])).toBe(true);
    expect(hasPositionOn(s, 1, [0])).toBe(false);
  });

  it('compares against everyone in the pot', () => {
    const s = sixMax();
    expect(hasPositionOn(s, 5, [3, 4])).toBe(true);
    expect(hasPositionOn(s, 4, [3, 5])).toBe(false);
    expect(hasPositionOn(s, 2, [3])).toBe(false);
    expect(hasPositionOn(s, 0, [])).toBe(true);
  });
});
