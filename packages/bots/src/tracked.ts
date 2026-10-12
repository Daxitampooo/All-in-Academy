import type { PlayerView } from '@pokerall/poker-engine';

import { profileDecision, type BrainContext } from './brain';
import { OpponentModel, SizingTells, type OpponentRead } from './reads';
import type { Bot, BotProfile } from './types';

/** What a bot remembers during one match. */
export type MatchMemory = {
  /** Hands finished so far. */
  hands: number;
  /** Its own result in the last hand, in big blinds. */
  lastNetBB: number;
  /** Its picture of the opponents' habits. */
  model: OpponentModel;
};

/** The bot's own chips won minus chips put in, from the view of a finished hand. */
export function netOf(view: PlayerView): number {
  let won = 0;
  for (const e of view.events) {
    if (e.type !== 'pot') continue;
    e.winners.forEach((seat, i) => {
      if (seat === view.seat) won += e.shares[i]!;
    });
  }
  return won - (view.players[view.seat]?.totalBet ?? 0);
}

/**
 * A bot that changes over the match: it watches opponents, and its style can depend on what has happened
 * so far (tilt after a big loss, impatience late in the evening). One instance per match.
 */
export function trackedBot(
  id: string,
  options: {
    profile: (memory: MatchMemory) => BotProfile;
    /** Reads opponents' bet sizes against what they showed down. */
    readsSizing?: boolean;
    afterHand?: (memory: MatchMemory) => void;
  },
): Bot {
  const memory: MatchMemory = { hands: 0, lastNetBB: 0, model: new OpponentModel() };
  const tells = options.readsSizing ? new SizingTells() : null;

  const adjustReads = tells
    ? (reads: OpponentRead[], view: PlayerView): OpponentRead[] =>
        reads.map((r) => {
          const tell = tells.tell(r.seat);
          if (tell <= 0.1) return r;
          // Their current bet relative to the pot: big bets have meant strength, small ones weakness.
          let last: Extract<PlayerView['events'][number], { type: 'action' }> | undefined;
          for (let i = view.events.length - 1; i >= 0 && !last; i--) {
            const e = view.events[i]!;
            if (e.type === 'action' && e.seat === r.seat && e.street === view.phase) last = e;
          }
          if (!last || (last.action !== 'bet' && last.action !== 'raise')) return r;
          const potBefore = Math.max(1, view.pot - last.added);
          const ratio = last.added / potBefore;
          const shift = ratio >= 0.7 ? 1 + tell * 3 : ratio < 0.5 ? Math.max(0, 1 - tell * 3) : 1;
          return { ...r, pressure: r.pressure * shift };
        })
    : undefined;

  const ctx: BrainContext = { model: memory.model, adjustReads };
  return {
    id,
    decide: (view, rng) => profileDecision(options.profile(memory), view, rng, ctx),
    handFinished(view) {
      memory.model.observe(view);
      tells?.observe(view);
      memory.hands += 1;
      memory.lastNetBB = netOf(view) / view.bigBlind;
      options.afterHand?.(memory);
    },
  };
}
