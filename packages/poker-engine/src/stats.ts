import type { HandEvent, HandState } from './game';

/**
 * Counters behind the usual poker statistics for one player over a set of finished hands.
 * Percentages are derived from them by `statRates`, so counters from many sessions can be added up.
 */
export type PlayerStats = {
  hands: number;
  /** Hands where the player put chips in before the flop voluntarily (a call or a raise; blinds don't count). */
  vpip: number;
  /** Hands where the player raised before the flop. */
  pfr: number;
  /** Times the player faced exactly one raise before the flop and could re-raise. */
  threeBetChances: number;
  /** Times the player re-raised in that spot. */
  threeBets: number;
  /** Bets and raises after the flop. */
  postflopAggressive: number;
  /** Calls after the flop. */
  postflopCalls: number;
  /** Hands where the player was still in when the flop came. */
  sawFlop: number;
  /** Of those, hands that reached a showdown with the player still in. */
  showdowns: number;
  /** Showdowns where the player won at least part of a pot. */
  showdownsWon: number;
  /** Hands where the player won at least part of a pot. */
  handsWon: number;
  /** Total change of the player's stack. */
  net: number;
};

export function emptyStats(): PlayerStats {
  return {
    hands: 0,
    vpip: 0,
    pfr: 0,
    threeBetChances: 0,
    threeBets: 0,
    postflopAggressive: 0,
    postflopCalls: 0,
    sawFlop: 0,
    showdowns: 0,
    showdownsWon: 0,
    handsWon: 0,
    net: 0,
  };
}

type ActionEvent = Extract<HandEvent, { type: 'action' }>;

/** Adds one finished hand to the counters of `seat`. Unfinished hands are ignored. */
export function addHand(stats: PlayerStats, state: HandState, seat: number): PlayerStats {
  if (state.phase !== 'complete' || !state.result) return stats;
  const out = { ...stats, hands: stats.hands + 1 };
  let raises = 0;
  let voluntary = false;
  let raised = false;
  let foldedPreflop = false;
  let flop = false;
  let showdown = false;

  for (const e of state.events) {
    if (e.type === 'street' && e.street === 'flop') flop = true;
    if (e.type === 'showdown' && e.seat === seat) showdown = true;
    if (e.type !== 'action') continue;
    const a: ActionEvent = e;
    const aggressive = a.action === 'bet' || a.action === 'raise';
    if (a.street === 'preflop') {
      if (a.seat === seat) {
        if (raises === 1) {
          out.threeBetChances += 1;
          if (aggressive) out.threeBets += 1;
        }
        if (aggressive) raised = true;
        if (aggressive || a.action === 'call') voluntary = true;
        if (a.action === 'fold') foldedPreflop = true;
      }
      if (aggressive) raises += 1;
    } else if (a.seat === seat) {
      if (aggressive) out.postflopAggressive += 1;
      else if (a.action === 'call') out.postflopCalls += 1;
    }
  }

  if (voluntary) out.vpip += 1;
  if (raised) out.pfr += 1;
  const won = state.result.won[seat] ?? 0;
  if (won > 0) out.handsWon += 1;
  if (flop && !foldedPreflop) {
    out.sawFlop += 1;
    if (showdown) {
      out.showdowns += 1;
      if (won > 0) out.showdownsWon += 1;
    }
  }
  out.net += state.result.net[seat] ?? 0;
  return out;
}

/** Counters for `seat` over all `hands`. */
export function statsFor(hands: readonly HandState[], seat: number): PlayerStats {
  return hands.reduce((acc, h) => addHand(acc, h, seat), emptyStats());
}

/** Shares between 0 and 1 (AF is a ratio); null where the player never had the chance. */
export type StatRates = {
  vpip: number | null;
  pfr: number | null;
  threeBet: number | null;
  af: number | null;
  wtsd: number | null;
  wsd: number | null;
};

export function statRates(s: PlayerStats): StatRates {
  const share = (part: number, whole: number) => (whole > 0 ? part / whole : null);
  return {
    vpip: share(s.vpip, s.hands),
    pfr: share(s.pfr, s.hands),
    threeBet: share(s.threeBets, s.threeBetChances),
    af: s.postflopCalls > 0 ? s.postflopAggressive / s.postflopCalls : s.postflopAggressive > 0 ? Infinity : null,
    wtsd: share(s.showdowns, s.sawFlop),
    wsd: share(s.showdownsWon, s.showdowns),
  };
}
