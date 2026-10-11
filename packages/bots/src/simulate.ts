import {
  applyAction,
  shuffledDeck,
  startHand,
  viewFor,
  type HandState,
  type Rng,
} from '@pokerall/poker-engine';

import type { Bot } from './types';

export type SeatStats = {
  hands: number;
  /** Hands where the seat put chips in preflop voluntarily (call or raise). */
  vpip: number;
  /** Hands where the seat raised preflop. */
  pfr: number;
  /** Net chips won. */
  net: number;
};

/** Plays one hand to the end with every seat controlled by a bot. */
export function playBotHand(bots: Bot[], stacks: number[], button: number, bigBlind: number, rng: Rng): HandState {
  let state = startHand(
    {
      players: bots.map((b, i) => ({ id: `${b.id}#${i}`, stack: stacks[i]! })),
      button,
      smallBlind: Math.max(1, Math.floor(bigBlind / 2)),
      bigBlind,
    },
    shuffledDeck(rng),
  );
  while (state.toAct !== null) {
    const seat = state.toAct;
    state = applyAction(state, bots[seat]!.decide(viewFor(state, seat), rng));
  }
  bots.forEach((b, seat) => b.handFinished?.(viewFor(state, seat)));
  return state;
}

/**
 * Plays many hands at one table. Busted seats rebuy to the starting stack,
 * so stats cover the whole run. Used for tests and bot calibration.
 */
export function simulateTable(options: {
  bots: Bot[];
  hands: number;
  rng: Rng;
  bigBlind?: number;
  startingBigBlinds?: number;
}): SeatStats[] {
  const { bots, hands, rng } = options;
  const bb = options.bigBlind ?? 100;
  const start = bb * (options.startingBigBlinds ?? 100);
  const stacks = bots.map(() => start);
  const stats: SeatStats[] = bots.map(() => ({ hands: 0, vpip: 0, pfr: 0, net: 0 }));
  let button = 0;

  for (let h = 0; h < hands; h++) {
    const state = playBotHand(bots, stacks, button, bb, rng);
    state.players.forEach((p, seat) => {
      const s = stats[seat]!;
      s.hands++;
      s.net += state.result!.net[seat]!;
      const pre = state.events.filter((e) => e.type === 'action' && e.seat === seat && e.street === 'preflop');
      if (pre.some((e) => e.type === 'action' && (e.action === 'call' || e.action === 'raise'))) s.vpip++;
      if (pre.some((e) => e.type === 'action' && e.action === 'raise')) s.pfr++;
      stacks[seat] = p.stack > 0 ? p.stack : start;
    });
    button = (button + 1) % bots.length;
  }
  return stats;
}

/**
 * Heads-up match to the bust, both players starting with the same stack.
 * Returns the index (0 or 1) of the winner, or null if `maxHands` ran out.
 */
export function playHeadsUpMatch(options: {
  bots: [Bot, Bot];
  rng: Rng;
  bigBlind?: number;
  startingBigBlinds?: number;
  maxHands?: number;
}): { winner: 0 | 1 | null; hands: number } {
  const bb = options.bigBlind ?? 100;
  const start = bb * (options.startingBigBlinds ?? 100);
  const stacks = [start, start];
  let button = 0;
  const maxHands = options.maxHands ?? 1000;
  for (let h = 1; h <= maxHands; h++) {
    const state = playBotHand(options.bots, stacks, button, bb, options.rng);
    stacks[0] = state.players[0]!.stack;
    stacks[1] = state.players[1]!.stack;
    if (stacks[0] === 0) return { winner: 1, hands: h };
    if (stacks[1] === 0) return { winner: 0, hands: h };
    button = 1 - button;
  }
  return { winner: null, hands: maxHands };
}
