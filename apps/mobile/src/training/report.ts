import { allInSplit, evaluate, type HandState, type Rng } from '@pokerall/poker-engine';

import type { TrainingBotId } from './index';

/** What a match against a training bot showed, revealed at the end. */
export type TrainingReport = {
  botId: TrainingBotId;
  /** Hero's chips won or lost over the match, as it happened. */
  realNet: number;
  /** The same with every all-in counted by the equity at the moment the chips went in. */
  evNet: number;
  /** Showdowns the hero lost after being ahead on the flop. */
  badBeats: number;
  /** Hands dealt from a deck picked for the bot (Lekha). */
  riggedHands: number;
};

/** Hero's result in one hand by all-in equity: the actual result when there was no all-in before the river. */
export function evNetOf(hand: HandState, seat: number, rng: Rng): number {
  const split = allInSplit(hand, { rng, iterations: 20_000 });
  return split ? split.net[seat]! : hand.result!.net[seat]!;
}

/** True when `seat` lost the showdown after holding the best hand on the flop. */
export function isBadBeat(hand: HandState, seat: number): boolean {
  if (!hand.events.some((e) => e.type === 'showdown') || hand.board.length < 5) return false;
  if (hand.result!.net[seat]! >= 0) return false;
  const me = hand.players[seat]!;
  if (me.folded) return false;
  const flop = hand.board.slice(0, 3);
  const mine = evaluate([...me.holeCards, ...flop]);
  return hand.players.every((p) => p.seat === seat || p.folded || evaluate([...p.holeCards, ...flop]) < mine);
}
