import type { HandState } from './game';

/**
 * What the player to act faces before the flop. The table uses it to name bet sizes
 * (open, iso-raise, 3-bet, squeeze, 4-bet), and hand analysis to pick the right chart.
 */
export type PreflopSituation =
  /** Nobody has put chips in voluntarily: an open-raise. */
  | { kind: 'unopened' }
  /** Players called the big blind and nobody raised: an iso-raise. */
  | { kind: 'limped'; limpers: number[] }
  /** One raise: a 3-bet, or a squeeze when someone called it. */
  | { kind: 'open'; raiser: number; callers: number[] }
  /** Two raises: a 4-bet. */
  | { kind: 'three-bet'; raiser: number; callers: number[] }
  /** Three raises or more: a 5-bet, usually all-in. */
  | { kind: 'four-bet'; raiser: number; callers: number[]; raises: number };

/** Reads the preflop actions so far. Blinds aren't actions, so the big blind alone leaves the pot unopened. */
export function preflopSituation(state: HandState): PreflopSituation {
  let raises = 0;
  let raiser = -1;
  const limpers: number[] = [];
  let callers: number[] = [];
  for (const e of state.events) {
    if (e.type !== 'action' || e.street !== 'preflop') continue;
    if (e.action === 'raise' || e.action === 'bet') {
      raises += 1;
      raiser = e.seat;
      callers = [];
    } else if (e.action === 'call') {
      if (raises === 0) limpers.push(e.seat);
      else callers.push(e.seat);
    }
  }
  if (raises === 0) return limpers.length > 0 ? { kind: 'limped', limpers } : { kind: 'unopened' };
  if (raises === 1) return { kind: 'open', raiser, callers };
  if (raises === 2) return { kind: 'three-bet', raiser, callers };
  return { kind: 'four-bet', raiser, callers, raises };
}

/** Order of play on the flop, turn and river: 0 acts first, the button acts last (heads-up too). */
export function postflopOrder(state: HandState, seat: number): number {
  const n = state.players.length;
  return (((seat - state.button - 1) % n) + n) % n;
}

/** True when `seat` acts after every one of `others` after the flop, i.e. plays in position against them. */
export function hasPositionOn(state: HandState, seat: number, others: readonly number[]): boolean {
  const mine = postflopOrder(state, seat);
  return others.every((other) => other === seat || postflopOrder(state, other) < mine);
}
