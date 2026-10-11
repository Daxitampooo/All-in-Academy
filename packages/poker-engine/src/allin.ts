import type { Card } from './cards';
import { handEquity } from './equity';
import type { HandState } from './game';
import type { Rng } from './rng';

/** The board as it was when the last decision of the hand was made. */
export function boardAtLastDecision(state: HandState): Card[] {
  let board: Card[] = [];
  let atDecision: Card[] = [];
  for (const e of state.events) {
    if (e.type === 'street') board = e.board;
    else if (e.type === 'action') atDecision = board;
  }
  return atDecision.slice();
}

/** A hand settled by equity instead of by the cards that came after the all-in. */
export type AllInSplit = {
  /** Board when the betting ended; the rest of it was dealt with nobody able to act. */
  board: Card[];
  /** Each seat's share of the main pot at that moment, 0 for players not in it. */
  equity: number[];
  /** Chips each seat gets from the pots by equity (instead of `result.won`). */
  won: number[];
  /** Change of each seat's stack over the hand with this split (instead of `result.net`). */
  net: number[];
};

/** Splits `amount` whole chips in proportion to `weights`, giving leftover chips to the largest remainders. */
export function splitByWeights(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (total > 0 ? (amount * w) / total : amount / weights.length));
  const out = exact.map((x) => Math.floor(x));
  let rest = amount - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, fraction: x - Math.floor(x) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    out[i]! += 1;
    rest -= 1;
  }
  return out;
}

/**
 * "All-in by equity": when the betting ended with an all-in before the river, every pot is split by the
 * players' chances at that moment instead of by the cards that came after. Luck on the runout stops
 * deciding matches; getting your chips in with the better hand does.
 *
 * Returns null when the hand didn't end that way (someone folded, or the betting reached the river).
 * Cards of folded players are out of the deck, so they can't come on the board.
 */
export function allInSplit(state: HandState, options: { rng: Rng; iterations?: number }): AllInSplit | null {
  const result = state.result;
  if (state.phase !== 'complete' || !result || result.uncontested) return null;
  const board = boardAtLastDecision(state);
  if (board.length >= state.board.length) return null;

  const n = state.players.length;
  const dead = state.players.filter((p) => p.folded).flatMap((p) => p.holeCards);
  const won = new Array<number>(n).fill(0);
  const equity = new Array<number>(n).fill(0);
  result.pots.forEach((pot, index) => {
    let shares: number[];
    let chances: number[];
    if (pot.eligible.length === 1) {
      chances = [1];
      shares = [pot.amount];
    } else {
      const hands = pot.eligible.map((seat) => state.players[seat]!.holeCards);
      chances = handEquity(hands, board, { dead, rng: options.rng, iterations: options.iterations ?? 40_000 }).equity;
      shares = splitByWeights(pot.amount, chances);
    }
    pot.eligible.forEach((seat, i) => {
      won[seat]! += shares[i]!;
      if (index === 0) equity[seat] = chances[i]!;
    });
  });

  const net = state.players.map((p) => result.net[p.seat]! - result.won[p.seat]! + won[p.seat]!);
  return { board, equity, won, net };
}
