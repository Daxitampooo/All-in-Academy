import {
  hasPositionOn,
  potSize,
  preflopSituation,
  type HandState,
  type LegalActions,
} from '@pokerall/poker-engine';

/** What a bet or raise is called in this spot; shown on the sizing tab and the raise button. */
export type SizingSpot = 'open' | 'iso' | 'threeBet' | 'squeeze' | 'fourBet' | 'fiveBet' | 'bet' | 'raise';

/** A quick bet size. `label` is a translation key; `n` is the number shown in it (2.5 BB, 3x, 50%). */
export type SizingPreset = { key: string; label: string; n?: number; amount: number };

export type Sizing = {
  spot: SizingSpot;
  presets: SizingPreset[];
  /** The size selected when the decision starts: the usual size for this spot. */
  recommended: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

const bbPreset = (key: string, n: number, bigBlind: number): SizingPreset => ({
  key,
  label: 'table.sizing.bb',
  n,
  amount: n * bigBlind,
});

const timesPreset = (key: string, n: number, bet: number): SizingPreset => ({
  key,
  label: 'table.sizing.times',
  n,
  amount: n * bet,
});

/**
 * Bet sizes for the spot: open-raise, iso-raise, 3-bet, squeeze, 4-bet and 5-bet before the flop; shares of
 * the pot for a bet and multiples of the bet for a raise after it; all-in always.
 * Null when the player can't bet or raise.
 */
export function sizingFor(hand: HandState, legal: LegalActions): Sizing | null {
  const r = legal.raise;
  if (!r) return null;
  const bb = hand.config.bigBlind;
  const pot = potSize(hand);
  const bet = hand.currentBet;
  // A pot-sized raise: call first, then raise by everything that would be in the pot.
  const potRaise = { key: 'pot', label: 'table.sizing.pot', amount: bet + pot + legal.callAmount };
  const seat = legal.seat;
  let spot: SizingSpot;
  let list: SizingPreset[];
  let pick: string;

  if (hand.phase === 'preflop') {
    const situation = preflopSituation(hand);
    switch (situation.kind) {
      case 'unopened':
        spot = 'open';
        list = [bbPreset('2', 2, bb), bbPreset('2.5', 2.5, bb), bbPreset('3', 3, bb)];
        pick = '2.5';
        break;
      case 'limped': {
        // Three big blinds plus one for every limper.
        spot = 'iso';
        const base = 3 + situation.limpers.length;
        list = [bbPreset('iso', base, bb), bbPreset('iso+1', base + 1, bb)];
        pick = 'iso';
        break;
      }
      case 'open': {
        // 3x the open in position, 4x out of position, plus one more for every caller (that's a squeeze).
        const extra = situation.callers.length;
        spot = extra > 0 ? 'squeeze' : 'threeBet';
        const inPosition = hasPositionOn(hand, seat, [situation.raiser, ...situation.callers]);
        list = [timesPreset('ip', 3 + extra, bet), timesPreset('oop', 4 + extra, bet), potRaise];
        pick = inPosition ? 'ip' : 'oop';
        break;
      }
      case 'three-bet': {
        spot = 'fourBet';
        const inPosition = hasPositionOn(hand, seat, [situation.raiser, ...situation.callers]);
        list = [timesPreset('ip', 2.2, bet), timesPreset('oop', 2.5, bet)];
        pick = inPosition ? 'ip' : 'oop';
        break;
      }
      case 'four-bet':
        spot = 'fiveBet';
        list = [timesPreset('5bet', 2.2, bet)];
        pick = 'allin';
        break;
    }
  } else if (r.type === 'bet') {
    spot = 'bet';
    list = [33, 50, 75].map((n) => ({ key: `p${n}`, label: 'table.sizing.percent', n, amount: (pot * n) / 100 }));
    list.push({ key: 'pot', label: 'table.sizing.pot', amount: pot });
    // An overbet: one and a half pots.
    list.push({ key: 'over', label: 'table.sizing.percent', n: 150, amount: pot * 1.5 });
    pick = 'p50';
  } else {
    spot = 'raise';
    list = [timesPreset('x2.5', 2.5, bet), timesPreset('x3', 3, bet), potRaise];
    pick = 'x3';
  }

  const presets: SizingPreset[] = [];
  const seen = new Set<number>();
  for (const p of list) {
    const amount = clamp(p.amount, r.min, r.max);
    // Anything at or past the stack is the same all-in, which has its own chip.
    if (amount >= r.max || seen.has(amount)) continue;
    seen.add(amount);
    presets.push({ ...p, amount });
  }
  presets.push({ key: 'allin', label: 'table.sizing.allIn', amount: r.max });

  const picked = list.find((p) => p.key === pick);
  const recommended = picked ? clamp(picked.amount, r.min, r.max) : r.max;
  return { spot, presets, recommended };
}
