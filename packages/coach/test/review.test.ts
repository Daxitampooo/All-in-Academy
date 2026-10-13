import { describe, expect, it } from 'vitest';

import {
  applyAction,
  arrangeDeck,
  createSeededRng,
  historyOf,
  parseCards,
  seedFromHex,
  startHand,
  type Card,
  type HandState,
  type PlayerAction,
} from '@pokerall/poker-engine';

import { openShare, reviewHand, seatsBehind } from '../src';

const rng = () => createSeededRng(seedFromHex('ab'.repeat(32)));
const two = (t: string) => parseCards(t) as unknown as [Card, Card];

/** A hand with fixed cards; `holes` by seat, then the actions in order. */
function play(players: number, button: number, holes: string[], board: string, actions: PlayerAction[], stack = 10000): HandState {
  let s = startHand(
    { players: Array.from({ length: players }, (_, i) => ({ id: String(i), stack })), button, smallBlind: 50, bigBlind: 100 },
    arrangeDeck({ playerCount: players, button, holeCards: holes.map(two), board: parseCards(board) }),
  );
  for (const a of actions) s = applyAction(s, a);
  return s;
}

const review = (s: HandState, seat: number) => reviewHand(historyOf(s), seat, { rng: rng(), samples: 2000 });

describe('ranges', () => {
  it('opens wider closer to the button', () => {
    expect(openShare(6, 5)).toBeLessThan(openShare(6, 3));
    expect(openShare(6, 3)).toBeLessThan(openShare(6, 2));
    expect(openShare(2, 1)).toBeGreaterThan(0.7);
  });

  it('counts the seats behind', () => {
    // 6-max, button 0: seat 3 is UTG with five players behind it.
    const s = play(6, 0, ['2c 3d', '4c 5d', '6c 7d', '8c 9d', 'Tc Jd', 'Qc Kd'], '', []);
    expect(seatsBehind(s, 3)).toBe(5);
    expect(seatsBehind(s, 0)).toBe(2);
    expect(seatsBehind(s, 2)).toBe(0);
  });
});

describe('before the flop', () => {
  // 6-max, button 0: UTG is seat 3 and acts first.
  const six = (utg: string) => [utg ? '2c 3d' : '2c 3d', '4c 5d', '6c 7d', utg, 'Tc Jd', 'Qc Kd'];

  it('folding aces under the gun is a mistake', () => {
    const s = play(6, 0, six('As Ah'), '', [{ type: 'fold' }]);
    const [d] = review(s, 3).decisions;
    expect(d!.grade).toBe('mistake');
    expect(d!.reason).toBe('foldOpenable');
    expect(d!.better).toBe('raise');
  });

  it('opening seven-deuce under the gun is a mistake, aces are good', () => {
    const bad = review(play(6, 0, six('7c 2h'), '', [{ type: 'raise', amount: 250 }]), 3).decisions[0]!;
    expect(bad.grade).toBe('mistake');
    expect(bad.reason).toBe('openLoose');
    const good = review(play(6, 0, six('As Ah'), '', [{ type: 'raise', amount: 250 }]), 3).decisions[0]!;
    expect(good.grade).toBe('good');
  });

  it('limping is marked as an inaccuracy', () => {
    const d = review(play(6, 0, six('Ks Qs'), '', [{ type: 'call' }]), 3).decisions[0]!;
    expect(d.reason).toBe('limp');
    expect(d.better).toBe('raise');
  });

  it('calling an all-in with a dominated hand is wrong, with aces it is right', () => {
    // Heads-up, button 0 shoves 100bb; the big blind decides.
    const shove: PlayerAction[] = [{ type: 'raise', amount: 10000 }];
    const bad = review(play(2, 0, ['Ks Kh', '9c 4d'], '', [...shove, { type: 'call' }]), 1).decisions[0]!;
    expect(bad.grade).toBe('mistake');
    expect(bad.reason).toBe('callBad');
    expect(bad.evLossBB).toBeGreaterThan(5);
    const good = review(play(2, 0, ['9c 4d', 'As Ah'], '', [...shove, { type: 'call' }]), 1).decisions[0]!;
    expect(good.grade).toBe('good');
  });
});

describe('after the flop', () => {
  // Heads-up: button 0 raises, big blind calls, then the hand goes on.
  const pre: PlayerAction[] = [{ type: 'raise', amount: 300 }, { type: 'call' }];

  it('folding a set to a small bet is a mistake', () => {
    // The big blind acts first after the flop: bets a third of the pot; the button folds a set.
    const s = play(2, 0, ['7h 7d', 'Ks Qd'], '7c Kd 2s', [...pre, { type: 'bet', amount: 200 }, { type: 'fold' }]);
    const decisions = review(s, 0).decisions;
    const fold = decisions[decisions.length - 1]!;
    expect(fold.street).toBe('flop');
    expect(fold.grade).toBe('mistake');
    expect(fold.better).toBe('call');
    expect(fold.equity!).toBeGreaterThan(0.8);
  });

  it('calling a big river bet with nothing is a mistake', () => {
    const s = play(2, 0, ['4h 3d', 'As Ad'], 'Kc Qd 9s 8h 2c', [
      ...pre,
      { type: 'check' },
      { type: 'check' },
      { type: 'check' },
      { type: 'check' },
      { type: 'bet', amount: 600 },
      { type: 'call' },
    ]);
    const decisions = review(s, 0).decisions;
    const call = decisions[decisions.length - 1]!;
    expect(call.street).toBe('river');
    expect(call.reason).toBe('callBad');
    expect(call.grade).toBe('mistake');
  });

  it('a value bet with the nuts is good, checking it back on the river is an inaccuracy', () => {
    const base: PlayerAction[] = [...pre, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }, { type: 'check' }];
    const bet = review(play(2, 0, ['Ah Kh', '5c 5d'], 'Qh Jh Th 2c 3s', [...base, { type: 'bet', amount: 400 }]), 0).decisions;
    expect(bet[bet.length - 1]!.reason).toBe('valueBet');
    const check = review(play(2, 0, ['Ah Kh', '5c 5d'], 'Qh Jh Th 2c 3s', [...base, { type: 'check' }]), 0).decisions;
    expect(check[check.length - 1]!.reason).toBe('missedValue');
  });

  it('calling a small bet with a big draw is good', () => {
    const s = play(2, 0, ['Ah 5h', 'Ks Qd'], 'Kh 9h 2c', [...pre, { type: 'bet', amount: 200 }, { type: 'call' }]);
    const decisions = review(s, 0).decisions;
    expect(decisions[decisions.length - 1]!.grade).toBe('good');
  });

  it('every decision of the hand is reviewed, with the step of the replay it starts from', () => {
    const s = play(2, 0, ['Ah 5h', 'Ks Qd'], 'Kh 9h 2c', [...pre, { type: 'bet', amount: 200 }, { type: 'call' }]);
    const r = review(s, 0);
    expect(r.decisions.map((d) => d.step)).toEqual([0, 3]);
    expect(r.counts.good + r.counts.inaccuracy + r.counts.mistake).toBe(r.decisions.length);
  });
});
