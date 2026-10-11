import { describe, expect, it } from 'vitest';

import { decisionsOf, statRates, statsFor } from '../src';
import { deal, play } from './helpers';

// Heads-up, button (seat 0) is the small blind and acts first before the flop, last after it.
const raisedToShowdown = () =>
  play(
    deal([10000, 10000], { holes: ['AsAh', 'KdKc'], board: '2c7d9hJsQh' }),
    'raise 300',
    'call',
    'check',
    'bet 400',
    'call',
    'check',
    'check',
    'check',
    'check',
  );

describe('player stats', () => {
  it('counts a raised pot that goes to showdown for both players', () => {
    const hand = raisedToShowdown();
    expect(hand.phase).toBe('complete');
    const raiser = statsFor([hand], 0);
    expect(raiser).toMatchObject({
      hands: 1,
      vpip: 1,
      pfr: 1,
      threeBetChances: 0,
      postflopAggressive: 1,
      postflopCalls: 0,
      sawFlop: 1,
      showdowns: 1,
      showdownsWon: 1,
      handsWon: 1,
      net: 700,
    });
    const caller = statsFor([hand], 1);
    expect(caller).toMatchObject({
      vpip: 1,
      pfr: 0,
      threeBetChances: 1,
      threeBets: 0,
      postflopAggressive: 0,
      postflopCalls: 1,
      sawFlop: 1,
      showdowns: 1,
      showdownsWon: 0,
      handsWon: 0,
      net: -700,
    });
  });

  it('counts 3-bets and folds before the flop', () => {
    const threeBet = play(deal([10000, 10000]), 'raise 300', 'raise 900', 'fold');
    expect(statsFor([threeBet], 1)).toMatchObject({ vpip: 1, pfr: 1, threeBetChances: 1, threeBets: 1, sawFlop: 0, handsWon: 1 });
    expect(statsFor([threeBet], 0)).toMatchObject({ vpip: 1, pfr: 1, threeBetChances: 0, sawFlop: 0, net: -300 });
  });

  it("doesn't count blinds or a big blind check as playing a hand", () => {
    const limped = play(deal([10000, 10000]), 'call', 'check', 'check', 'check', 'check', 'check', 'check', 'check');
    const bb = statsFor([limped], 1);
    expect(bb.vpip).toBe(0);
    expect(bb.sawFlop).toBe(1);
    expect(statsFor([limped], 0).vpip).toBe(1);
  });

  it('turns counters into rates and leaves unknown ones empty', () => {
    const hands = [raisedToShowdown(), play(deal([10000, 10000]), 'fold')];
    const rates = statRates(statsFor(hands, 0));
    expect(rates.vpip).toBe(0.5);
    expect(rates.pfr).toBe(0.5);
    expect(rates.threeBet).toBeNull();
    expect(rates.af).toBe(Infinity);
    expect(rates.wtsd).toBe(1);
    expect(rates.wsd).toBe(1);
    expect(statRates(statsFor(hands, 1)).af).toBe(0);
  });
});

describe('decisions of a hand', () => {
  it('lists every decision with the pot and the price of a call', () => {
    const decisions = decisionsOf(raisedToShowdown(), 1);
    expect(decisions.map((d) => [d.street, d.action.action])).toEqual([
      ['preflop', 'call'],
      ['flop', 'check'],
      ['flop', 'call'],
      ['turn', 'check'],
      ['river', 'check'],
    ]);
    // Facing a raise to 300 in the big blind: 200 more into a pot of 400.
    expect(decisions[0]).toMatchObject({ toCall: 200, pot: 400 });
    expect(decisions[0]!.potOdds).toBeCloseTo(200 / 600);
    // Facing a 400 bet into 600 on the flop.
    expect(decisions[2]).toMatchObject({ toCall: 400, pot: 1000 });
    expect(decisions[2]!.potOdds).toBeCloseTo(400 / 1400);
    expect(decisions[1]!.potOdds).toBeNull();
  });
});
