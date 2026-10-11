import { describe, expect, it } from 'vitest';

import { legalActions, positionsFor, potSize, type HandEvent } from '../src';
import { deal, play, stacks } from './helpers';

const eventsOf = <T extends HandEvent['type']>(s: { events: HandEvent[] }, type: T) =>
  s.events.filter((e): e is Extract<HandEvent, { type: T }> => e.type === type);

describe('positions', () => {
  it('names seats for every table size', () => {
    expect(positionsFor(2, 0)).toEqual(['BTN', 'BB']);
    expect(positionsFor(3, 1)).toEqual(['BB', 'BTN', 'SB']);
    expect(positionsFor(6, 2)).toEqual(['HJ', 'CO', 'BTN', 'SB', 'BB', 'UTG']);
    expect(positionsFor(9, 0)).toEqual(['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO']);
  });
});

describe('blinds and order of play', () => {
  it('heads-up: the button posts the small blind and acts first preflop, last after', () => {
    let s = deal([1000, 1000]);
    expect(s.smallBlindSeat).toBe(0);
    expect(s.bigBlindSeat).toBe(1);
    expect(s.toAct).toBe(0);
    expect(legalActions(s)).toMatchObject({ callAmount: 50, canCheck: false, raise: { type: 'raise', min: 200, max: 1000 } });
    s = play(s, 'call');
    expect(s.toAct).toBe(1);
    expect(legalActions(s)).toMatchObject({ canCheck: true, raise: { min: 200 } });
    s = play(s, 'check');
    expect(s.phase).toBe('flop');
    expect(s.board).toHaveLength(3);
    expect(s.toAct).toBe(1);
  });

  it('three-handed: button acts first preflop, small blind first after the flop', () => {
    let s = deal([1000, 1000, 1000]);
    expect([s.smallBlindSeat, s.bigBlindSeat, s.toAct]).toEqual([1, 2, 0]);
    s = play(s, 'call', 'call', 'check');
    expect(s.phase).toBe('flop');
    expect(s.toAct).toBe(1);
  });

  it('six-handed: UTG acts first preflop', () => {
    const s = deal([1000, 1000, 1000, 1000, 1000, 1000], { button: 2 });
    expect(s.toAct).toBe(5);
    expect(s.players[5]!.position).toBe('UTG');
  });

  it('gives the big blind the option when everyone limps', () => {
    let s = deal([1000, 1000, 1000]);
    s = play(s, 'call', 'call');
    expect(s.toAct).toBe(2);
    expect(legalActions(s)).toMatchObject({ canCheck: true, raise: { type: 'raise', min: 200 } });
    s = play(s, 'raise 400');
    expect(s.phase).toBe('preflop');
    expect(s.toAct).toBe(0);
  });

  it('posts antes before the blinds', () => {
    const s = deal([1000, 1000, 1000], { ante: 10 });
    expect(eventsOf(s, 'ante').map((e) => e.amount)).toEqual([10, 10, 10]);
    expect(potSize(s)).toBe(180);
    const done = play(s, 'fold', 'fold');
    expect(done.result!.net).toEqual([-10, -60, 70]);
  });
});

describe('bet sizes', () => {
  it('requires a raise of at least the previous raise', () => {
    let s = deal([10_000, 10_000, 10_000]);
    s = play(s, 'raise 300');
    expect(legalActions(s)!.raise).toMatchObject({ min: 500 });
    expect(() => play(s, 'raise 499')).toThrow();
    s = play(s, 'raise 1000');
    expect(legalActions(s)!.raise).toMatchObject({ min: 1700, max: 10_000 });
  });

  it('opens postflop with a bet of at least one big blind', () => {
    let s = deal([1000, 1000]);
    s = play(s, 'call', 'check');
    expect(legalActions(s)!.raise).toMatchObject({ type: 'bet', min: 100, max: 900 });
    expect(() => play(s, 'raise 200')).toThrow(/bet/);
    expect(() => play(s, 'bet 99')).toThrow();
    s = play(s, 'bet 150');
    expect(legalActions(s)!.raise).toMatchObject({ type: 'raise', min: 300 });
  });

  it('rejects illegal moves', () => {
    const s = deal([1000, 1000]);
    expect(() => play(s, 'check')).toThrow(/check/);
    const after = play(s, 'call', 'check');
    expect(() => play(after, 'fold')).toThrow(/check/);
    expect(() => play(after, 'call')).toThrow(/Nothing to call/);
  });

  it('lets a short stack go all-in for less than a full raise', () => {
    let s = deal([10_000, 10_000, 350]);
    s = play(s, 'raise 300', 'call');
    expect(legalActions(s)!.raise).toMatchObject({ min: 350, max: 350 });
    s = play(s, 'raise 350');
    expect(s.players[2]!.allIn).toBe(true);
    // The first raiser faces only 50 more: not a full raise, so no re-raise.
    expect(legalActions(s)).toMatchObject({ seat: 0, callAmount: 50, raise: null });
    s = play(s, 'call');
    expect(legalActions(s)).toMatchObject({ seat: 1, callAmount: 50, raise: null });
    s = play(s, 'call');
    expect(s.phase).toBe('flop');
  });

  it('reopens the betting when short all-ins add up to a full raise', () => {
    // Seats: 0 BTN, 1 SB (160 chips), 2 BB (230 chips), 3 UTG.
    let s = deal([10_000, 160, 230, 10_000]);
    s = play(s, 'call', 'call', 'raise 160', 'raise 230');
    expect(legalActions(s)).toMatchObject({ seat: 3, callAmount: 130, raise: { min: 330 } });
  });

  it("doesn't allow raising when everyone else is all-in", () => {
    let s = deal([1000, 300]);
    s = play(s, 'raise 1000');
    expect(legalActions(s)).toMatchObject({ seat: 1, callAmount: 200, raise: null });
  });
});

describe('ending a hand', () => {
  it('returns an uncalled bet', () => {
    const s = play(deal([1000, 1000]), 'raise 300', 'fold');
    expect(eventsOf(s, 'uncalled')).toEqual([{ type: 'uncalled', seat: 0, amount: 200 }]);
    expect(s.result!.uncontested).toBe(true);
    expect(stacks(s)).toEqual([1100, 900]);
  });

  it('gives the blinds to the big blind when everyone folds', () => {
    const s = play(deal([1000, 1000, 1000]), 'fold', 'fold');
    expect(stacks(s)).toEqual([1000, 950, 1050]);
  });

  it('builds side pots for different all-in amounts', () => {
    const s = play(
      deal([300, 600, 1000], {
        holes: ['AsAh', 'KsKh', 'QsQh'],
        board: '2c7d9hJs3c',
      }),
      'allin',
      'allin',
      'call',
    );
    expect(s.phase).toBe('complete');
    expect(s.board).toHaveLength(5);
    expect(s.result!.pots.map((p) => [p.amount, p.eligible, p.winners])).toEqual([
      [900, [0, 1, 2], [0]],
      [600, [1, 2], [1]],
    ]);
    expect(stacks(s)).toEqual([900, 600, 400]);
  });

  it('splits a pot and gives the odd chip to the first winner left of the button', () => {
    let s = deal([1000, 1000, 1000], { sb: 5, bb: 10, board: 'AsKsQsJsTs' });
    s = play(s, 'call', 'fold', 'check', 'check', 'check', 'check', 'check', 'check', 'check');
    expect(s.result!.pots[0]).toMatchObject({ amount: 25, winners: [0, 2] });
    expect(stacks(s)).toEqual([1002, 995, 1003]);
  });

  it('runs out the board after an all-in and pays the best hand', () => {
    const s = play(deal([1000, 1000], { holes: ['AsAh', 'KsKd'], board: 'Kc7d2h9s3c' }), 'allin', 'call');
    expect(s.board).toHaveLength(5);
    expect(eventsOf(s, 'showdown').map((e) => e.categoryId)).toEqual(['pair', 'trips']);
    expect(stacks(s)).toEqual([0, 2000]);
  });

  it('skips decisions when a short big blind is already covered', () => {
    const s = deal([1000, 30]);
    expect(s.phase).toBe('complete');
    expect(eventsOf(s, 'uncalled')).toEqual([{ type: 'uncalled', seat: 0, amount: 20 }]);
    expect(stacks(s).reduce((a, b) => a + b)).toBe(1030);
  });

  it('makes a short stack call the full big blind when others can still bet', () => {
    const s = deal([1000, 1000, 40]);
    expect(legalActions(s)).toMatchObject({ seat: 0, callAmount: 100 });
  });
});

describe('player view', () => {
  it("shows a player their own cards and hides everyone else's until showdown", async () => {
    const { viewFor } = await import('../src');
    let s = deal([1000, 1000, 1000], { holes: ['AsAh', 'KsKh', 'QsQh'], board: '2c7d9hJs3c' });
    const v = viewFor(s, 1);
    expect(v.players[1]!.holeCards).toEqual(s.players[1]!.holeCards);
    expect(v.players[0]!.holeCards).toBeNull();
    expect(v.players[2]!.holeCards).toBeNull();
    expect(v.legal).toBeNull();
    expect(viewFor(s, 0).legal).not.toBeNull();
    expect(JSON.stringify(v)).not.toContain(JSON.stringify(s.deck));

    s = play(s, 'allin', 'allin', 'allin');
    const after = viewFor(s, 1);
    expect(after.players[0]!.holeCards).toEqual(s.players[0]!.holeCards);
    expect(after.phase).toBe('complete');
  });
});
