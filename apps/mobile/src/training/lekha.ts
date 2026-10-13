import { DEFAULT_PROFILE, preflopStrength, profileBot } from '@pokerall/bots';
import { evaluate, shuffledDeck, viewFor, type Card, type HandState } from '@pokerall/poker-engine';

import { finalBoard, riverValue } from './cards';
import type { TrainingBot } from './index';

/** A loose, sticky player who chases every draw: on a fair deck he'd be easy to beat. */
const LEKHA_PROFILE = {
  ...DEFAULT_PROFILE,
  vpip: 0.55,
  pfr: 0.1,
  threeBet: 0.03,
  foldToRaise: 0.25,
  aggression: 0.35,
  bluff: 0.08,
  stickiness: 0.25,
  drawLove: 0.9,
  accuracy: 0.6,
  samples: 160,
};

/** Share of hands where the deck is bent his way. */
export const LEKHA_RIG_SHARE = 0.15;
/** Shuffles tried per rigged hand. */
const CANDIDATES = 40;

/**
 * How good a deck is for the lesson: Lekha must win on the river, and the best decks are the painful
 * ones, where the opponent starts with the better hand and is still ahead on the flop.
 */
function badBeatScore(state: HandState, seat: number): number {
  const board = finalBoard(state);
  const mine = riverValue(state, seat, board);
  let score = 0;
  for (const p of state.players) {
    if (p.seat === seat) continue;
    if (riverValue(state, p.seat, board) >= mine) return -1;
    const theirs = p.holeCards as [Card, Card];
    const own = state.players[seat]!.holeCards as [Card, Card];
    if (preflopStrength(theirs).equity > preflopStrength(own).equity) score += 1;
    const flop = board.slice(0, 3);
    if (evaluate([...theirs, ...flop]) > evaluate([...own, ...flop])) score += 2;
  }
  return score;
}

/**
 * Lekha "Lucky": plays weak, honest decisions, but some decks are picked so that he is behind after the
 * flop and still wins the river. Playing well against him wins on EV and can still lose the match.
 */
export function createLekha(rigShare = LEKHA_RIG_SHARE): TrainingBot {
  const brain = profileBot('lekha', LEKHA_PROFILE);
  let rigged = 0;
  return {
    id: 'lekha',
    dealHand(deal, seat, rng) {
      if (rng.nextInt(1000) >= rigShare * 1000) return deal(shuffledDeck(rng));
      let best: HandState | null = null;
      let bestScore = -1;
      for (let i = 0; i < CANDIDATES && bestScore < 3; i++) {
        const hand = deal(shuffledDeck(rng));
        const score = badBeatScore(hand, seat);
        if (score > bestScore) {
          best = hand;
          bestScore = score;
        }
      }
      // Only true bad beats: the opponent is ahead after the flop and Lekha gets there by the river.
      if (!best || bestScore < 2) return deal(shuffledDeck(rng));
      rigged += 1;
      return best;
    },
    decide: (state, seat, rng) => brain.decide(viewFor(state, seat), rng),
    handFinished: (state, seat) => brain.handFinished?.(viewFor(state, seat)),
    riggedHands: () => rigged,
  };
}
