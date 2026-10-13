import {
  blendReads,
  estimateEquityVsReads,
  handFeatures,
  preflopStrength,
  readsFromView,
  type OpponentRead,
} from '@pokerall/bots';
import {
  decisionsOf,
  hasPositionOn,
  preflopSituation,
  replay,
  viewFor,
  type Card,
  type Decision,
  type HandHistory,
  type HandState,
  type Rng,
} from '@pokerall/poker-engine';

import type { DecisionReview, Grade, HandReview, LessonId, Move, Reason } from './types';

/**
 * Share of starting hands a solid player raises first in, by the number of players still to act behind
 * (heads-up the button plays most hands). Simplified teaching ranges, not solver output.
 */
export function openShare(players: number, behind: number): number {
  if (players === 2) return 0.8;
  if (behind >= 5) return 0.17;
  if (behind === 4) return 0.21;
  if (behind === 3) return 0.28;
  if (behind === 2) return 0.45;
  return 0.4;
}

/** Typical share of hands that move all-in for `depth` big blinds before the flop. */
export function jamShare(depth: number): number {
  if (depth <= 10) return 0.55;
  if (depth <= 15) return 0.4;
  if (depth <= 25) return 0.25;
  return 0.12;
}

/** Players who act after `seat` before the flop, up to and including the big blind. */
export function seatsBehind(state: HandState, seat: number): number {
  const n = state.players.length;
  const bigBlind = n === 2 ? (state.button + 1) % n : (state.button + 2) % n;
  if (seat === bigBlind) return 0;
  let count = 0;
  for (let s = (seat + 1) % n; ; s = (s + 1) % n) {
    count += 1;
    if (s === bigBlind) break;
  }
  return count;
}

/** Likely range of every opponent who put chips in voluntarily before the flop. */
function preflopReads(state: HandState, hero: number): OpponentRead[] {
  const n = state.players.length;
  const reads = new Map<number, number>();
  let level = 0;
  for (const e of state.events) {
    if (e.type !== 'action' || e.street !== 'preflop' || e.seat === hero) {
      if (e.type === 'action' && e.street === 'preflop' && (e.action === 'raise' || e.action === 'bet')) level += 1;
      continue;
    }
    if (e.action === 'raise' || e.action === 'bet') {
      level += 1;
      let share = level === 1 ? openShare(n, seatsBehind(state, e.seat)) : level === 2 ? 0.07 : 0.03;
      // Moving all-in narrows the range the deeper the stack: few hands are worth risking 100 big blinds.
      if (e.allIn) share = Math.min(share, jamShare(e.streetBet / state.config.bigBlind));
      reads.set(e.seat, share);
    } else if (e.action === 'call') {
      const share = level === 0 ? 0.5 : level === 1 ? 0.25 : 0.05;
      reads.set(e.seat, Math.min(reads.get(e.seat) ?? 1, share));
    }
  }
  const out: OpponentRead[] = [];
  for (const [seat, share] of reads) {
    if (!state.players[seat]!.folded) out.push({ seat, share, pressure: 0 });
  }
  return out;
}

function moveOf(d: Decision): Move {
  return d.action.action;
}

const pct = (x: number) => Math.round(x * 100);
const bbOf = (chips: number, d: Decision) => Math.round((chips / d.before.config.bigBlind) * 10) / 10;

type Verdict = {
  grade: Grade;
  reason: Reason;
  better: Move | null;
  evLossBB: number | null;
  lesson: LessonId;
  params?: Record<string, string | number>;
};

/** Calling or folding to a bet: the price decides. `equity` already counts how much of it gets realized. */
function callOrFold(d: Decision, equity: number, lesson: LessonId): Verdict {
  const toCall = d.toCall;
  const potOdds = d.potOdds ?? 0;
  const callEv = equity * (d.pot + toCall) - toCall;
  const gap = equity - potOdds;
  const called = moveOf(d) === 'call';
  const loss = called ? Math.max(0, -callEv) : Math.max(0, callEv);
  const lossBB = bbOf(loss, d);
  const wrong = called ? -gap : gap;
  let grade: Grade = wrong <= 0.03 || lossBB < 0.3 ? 'good' : wrong <= 0.1 ? 'inaccuracy' : 'mistake';
  // Small pots: a wrong price there costs little, so it's an inaccuracy at most.
  if (grade === 'mistake' && lossBB < 1) grade = 'inaccuracy';
  let reason: Reason;
  if (called) reason = grade === 'good' ? (Math.abs(gap) <= 0.03 ? 'callClose' : 'callGood') : 'callBad';
  else reason = grade === 'good' ? (Math.abs(gap) <= 0.03 ? 'foldClose' : 'foldGood') : 'foldBad';
  return {
    grade,
    reason,
    better: grade === 'good' ? null : called ? 'fold' : 'call',
    evLossBB: grade === 'good' ? 0 : lossBB,
    lesson,
  };
}

const SUITED_ACE_BLUFFS = new Set(['A5s', 'A4s', 'A3s', 'A2s', 'A9s', 'A8s', 'A7s', 'A6s', 'KJs', 'KTs', 'QJs', 'JTs', 'T9s', '98s', '87s', '76s', '65s']);

function reviewPreflop(d: Decision, hero: number, rng: Rng, samples: number): { verdict: Verdict; equity: number | null } {
  const state = d.before;
  const me = state.players[hero]!;
  const hole = me.holeCards as [Card, Card];
  const { handClass, percentile } = preflopStrength(hole);
  const n = state.players.length;
  const share = openShare(n, seatsBehind(state, hero));
  const situation = preflopSituation(state);
  const move = moveOf(d);
  const bb = state.config.bigBlind;
  const params = { hand: handClass, pos: me.position, share: pct(share) };

  if (situation.kind === 'unopened') {
    if (move === 'raise' || move === 'bet') {
      const deep = (me.stack + me.streetBet) / bb > 30;
      if (d.action.allIn && deep && percentile > 0.05) {
        return { verdict: { grade: 'inaccuracy', reason: 'jamDeep', better: 'raise', evLossBB: null, lesson: 'sizing-preflop', params }, equity: null };
      }
      if (percentile <= share * 1.3) return { verdict: { grade: 'good', reason: 'openGood', better: null, evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
      const grade: Grade = percentile <= share * 2 + 0.1 ? 'inaccuracy' : 'mistake';
      return { verdict: { grade, reason: 'openLoose', better: 'fold', evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
    }
    if (move === 'call') {
      // Heads-up, completing from the button with a playable hand is a fine, if passive, line.
      if (n === 2 && percentile <= share) {
        return { verdict: { grade: 'good', reason: 'limpHu', better: null, evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
      }
      return {
        verdict: { grade: 'inaccuracy', reason: 'limp', better: percentile <= share ? 'raise' : 'fold', evLossBB: null, lesson: 'preflop-rfi', params },
        equity: null,
      };
    }
    if (move === 'fold' && percentile <= share * 0.6) {
      const grade: Grade = percentile <= share * 0.25 ? 'mistake' : 'inaccuracy';
      return { verdict: { grade, reason: 'foldOpenable', better: 'raise', evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
    }
    return { verdict: { grade: 'good', reason: 'foldWeak', better: null, evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
  }

  if (situation.kind === 'limped') {
    if (move === 'raise' || move === 'bet') {
      const ok = percentile <= share;
      return { verdict: { grade: ok ? 'good' : 'inaccuracy', reason: ok ? 'isoRaise' : 'isoLoose', better: ok ? null : 'check', evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
    }
    if (move === 'check') {
      const strong = percentile <= 0.15;
      return { verdict: { grade: strong ? 'inaccuracy' : 'good', reason: strong ? 'checkStrong' : 'checkBB', better: strong ? 'raise' : null, evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
    }
    if (move === 'call') {
      const strong = percentile <= share * 0.6;
      return { verdict: { grade: strong ? 'inaccuracy' : 'good', reason: strong ? 'limpStrong' : 'overlimp', better: strong ? 'raise' : null, evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
    }
    // Folding the small blind to limpers: only a problem with a hand worth playing.
    const playable = percentile <= share * 0.7;
    return { verdict: { grade: playable ? 'inaccuracy' : 'good', reason: playable ? 'foldOpenable' : 'foldWeak', better: playable ? 'raise' : null, evLossBB: null, lesson: 'preflop-rfi', params }, equity: null };
  }

  // Facing a raise, a 3-bet or more: the hand against the raisers' likely ranges.
  const reads = preflopReads(state, hero);
  const raw = reads.length ? estimateEquityVsReads(hole, [], reads, samples, rng) : 0.5;
  const aggressor = situation.raiser;
  const goesAllIn = d.toCall >= me.stack || state.players[aggressor]!.allIn;
  // Not all of the equity turns into chips when there is play left after the flop, less so out of position.
  const realize = goesAllIn ? 1 : hasPositionOn(state, hero, [aggressor]) ? 0.95 : 0.8;
  const equity = raw * realize;
  const lesson: LessonId = situation.kind === 'open' ? 'preflop-vs-open' : 'preflop-3bet';
  const withEq = { ...params, eq: pct(equity) };

  if (move === 'fold' || move === 'call' || move === 'check') {
    const v = callOrFold(d, equity, goesAllIn ? 'math-pot-odds' : lesson);
    return { verdict: { ...v, params: withEq }, equity };
  }

  // A re-raise.
  if (d.action.allIn && situation.kind !== 'open') {
    const ok = raw >= (d.potOdds ?? 0.4) - 0.02 || percentile <= 0.03;
    return { verdict: { grade: ok ? 'good' : 'mistake', reason: ok ? 'jamGood' : 'jamBad', better: ok ? null : 'fold', evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
  }
  if (situation.kind === 'open') {
    if (percentile <= 0.07) return { verdict: { grade: 'good', reason: 'threeBetValue', better: null, evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
    if (SUITED_ACE_BLUFFS.has(handClass)) return { verdict: { grade: 'good', reason: 'threeBetBluff', better: null, evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
    if (equity >= (d.potOdds ?? 0) + 0.05) return { verdict: { grade: 'good', reason: 'threeBetValue', better: null, evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
    return { verdict: { grade: 'inaccuracy', reason: 'threeBetLoose', better: equity >= (d.potOdds ?? 0) ? 'call' : 'fold', evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
  }
  if (percentile <= 0.03) return { verdict: { grade: 'good', reason: 'fourBetValue', better: null, evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
  if (percentile <= 0.12 && handClass.startsWith('A') && handClass.endsWith('s')) {
    return { verdict: { grade: 'good', reason: 'fourBetBluff', better: null, evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
  }
  return { verdict: { grade: 'inaccuracy', reason: 'fourBetLoose', better: equity >= (d.potOdds ?? 0) ? 'call' : 'fold', evLossBB: null, lesson: 'preflop-3bet', params: withEq }, equity: raw };
}

/** Whether the decision ended the betting on its street (a check behind, or a call). */
function closesStreet(after: HandState, before: HandState): boolean {
  return after.phase !== before.phase;
}

function reviewPostflop(d: Decision, after: HandState, hero: number, rng: Rng, samples: number): { verdict: Verdict; equity: number } {
  const state = d.before;
  const hole = state.players[hero]!.holeCards as [Card, Card];
  const reads = blendReads(readsFromView(viewFor(state, hero), null), 0.8);
  const equity = estimateEquityVsReads(hole, state.board, reads, samples, rng);
  const features = handFeatures(hole, state.board);
  const draw = features.flushDraw || features.straightDrawRanks > 0;
  const river = state.phase === 'river';
  const opponents = reads.length;
  const move = moveOf(d);
  const params = { eq: pct(equity), need: d.potOdds === null ? 0 : pct(d.potOdds), opponents };

  if (d.toCall > 0) {
    if (move === 'call' || move === 'fold') {
      const v = callOrFold(d, equity, draw && !river ? 'postflop-draws' : 'math-pot-odds');
      // A monster that only called on the river left value behind.
      if (move === 'call' && river && equity >= 0.85 && !state.players[hero]!.allIn && d.toCall < state.players[hero]!.stack) {
        return { verdict: { grade: 'inaccuracy', reason: 'missedRaise', better: 'raise', evLossBB: null, lesson: 'postflop-value', params }, equity };
      }
      return { verdict: { ...v, params }, equity };
    }
    // A raise.
    if (equity >= 0.6) return { verdict: { grade: 'good', reason: 'raiseValue', better: null, evLossBB: null, lesson: 'postflop-value', params }, equity };
    if (draw && !river) return { verdict: { grade: 'good', reason: 'raiseSemi', better: null, evLossBB: null, lesson: 'postflop-draws', params }, equity };
    if (equity >= (d.potOdds ?? 0)) return { verdict: { grade: 'good', reason: 'raiseOk', better: null, evLossBB: null, lesson: 'postflop-value', params }, equity };
    return {
      verdict: { grade: 'inaccuracy', reason: 'raiseBluff', better: equity >= (d.potOdds ?? 0) - 0.05 ? 'call' : 'fold', evLossBB: null, lesson: 'postflop-bluff', params },
      equity,
    };
  }

  if (move === 'bet' || move === 'raise') {
    if (equity >= 0.55) return { verdict: { grade: 'good', reason: 'valueBet', better: null, evLossBB: null, lesson: 'postflop-value', params }, equity };
    if (draw && !river) return { verdict: { grade: 'good', reason: 'semiBluff', better: null, evLossBB: null, lesson: 'postflop-draws', params }, equity };
    if (equity < 0.35) {
      if (opponents >= 2) return { verdict: { grade: 'inaccuracy', reason: 'bluffMultiway', better: 'check', evLossBB: null, lesson: 'postflop-bluff', params }, equity };
      return { verdict: { grade: 'good', reason: 'bluff', better: null, evLossBB: null, lesson: 'postflop-bluff', params }, equity };
    }
    return { verdict: { grade: 'good', reason: 'betThin', better: null, evLossBB: null, lesson: 'postflop-value', params }, equity };
  }

  // A check.
  if (river && equity >= 0.75 && closesStreet(after, state)) {
    return { verdict: { grade: 'inaccuracy', reason: 'missedValue', better: 'bet', evLossBB: null, lesson: 'postflop-value', params }, equity };
  }
  if (equity >= 0.8 && !river) return { verdict: { grade: 'good', reason: 'slowplay', better: null, evLossBB: null, lesson: 'postflop-value', params }, equity };
  return { verdict: { grade: 'good', reason: 'check', better: null, evLossBB: null, lesson: 'postflop-value', params }, equity };
}

export type ReviewOptions = {
  rng: Rng;
  /** Monte Carlo samples per equity estimate. */
  samples?: number;
};

/**
 * Reviews every decision `seat` made in a hand. Equity is measured against the opponents' likely
 * ranges from what they did, never against their real cards: a good decision can lose and a bad one
 * can win, and the review is about the decision.
 */
export function reviewHand(history: HandHistory, seat: number, options: ReviewOptions): HandReview {
  const samples = options.samples ?? 1500;
  const states = replay(history);
  const final = states[states.length - 1]!;
  const decisions = decisionsOf(final, seat);
  const out: DecisionReview[] = [];
  for (const d of decisions) {
    const step = d.before.events.filter((e) => e.type === 'action').length;
    const after = states[step + 1] ?? final;
    const { verdict, equity } = d.street === 'preflop' ? reviewPreflop(d, seat, options.rng, samples) : reviewPostflop(d, after, seat, options.rng, samples);
    const a = d.action;
    out.push({
      step,
      street: d.street,
      move: a.action,
      amount: a.action === 'bet' || a.action === 'raise' ? a.streetBet : null,
      allIn: a.allIn,
      grade: verdict.grade,
      evLossBB: verdict.evLossBB,
      equity,
      potOdds: d.potOdds,
      better: verdict.better,
      reason: verdict.reason,
      params: { ...(verdict.params ?? {}), ...(verdict.evLossBB ? { loss: verdict.evLossBB } : {}) },
      lesson: verdict.lesson,
    });
  }
  const counts: Record<Grade, number> = { good: 0, inaccuracy: 0, mistake: 0 };
  let total = 0;
  for (const r of out) {
    counts[r.grade] += 1;
    total += r.evLossBB ?? 0;
  }
  return { version: 1, decisions: out, counts, totalLossBB: Math.round(total * 10) / 10 };
}
