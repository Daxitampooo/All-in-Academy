import { straightHigh, rankOf, suitOf, type LegalActions, type PlayerAction, type PlayerView, type Rng } from '@pokerall/poker-engine';

import { blendReads, estimateEquityVsReads, readsFromView, type OpponentModel, type OpponentRead } from './reads';
import { estimateEquity, handFeatures, preflopStrength } from './strength';
import type { Bot, BotProfile } from './types';

/** Uniform random number in [0, 1). */
export function chance(rng: Rng): number {
  return rng.nextInt(1 << 30) / (1 << 30);
}

/** What a bot carries from hand to hand: its picture of the opponents. */
export type BrainContext = {
  model?: OpponentModel | null;
  /** Last word on the reads, e.g. what an opponent's bet size gives away. */
  adjustReads?: (reads: OpponentRead[], view: PlayerView) => OpponentRead[];
};

function clampRaise(legal: LegalActions, amount: number): PlayerAction | null {
  const r = legal.raise;
  if (!r) return null;
  let to = Math.round(amount);
  if (to < r.min) to = r.min;
  // Leaving a small remainder behind makes no sense: go all-in instead.
  if (to > r.max || (r.max - to) / r.max < 0.25) to = r.max;
  return { type: r.type, amount: to };
}

function allIn(legal: LegalActions): PlayerAction {
  return legal.raise ? { type: legal.raise.type, amount: legal.raise.max } : callOrCheck(legal);
}

function passive(legal: LegalActions): PlayerAction {
  return legal.canCheck ? { type: 'check' } : { type: 'fold' };
}

function callOrCheck(legal: LegalActions): PlayerAction {
  return legal.canCheck ? { type: 'check' } : { type: 'call' };
}

/** A legal action picked uniformly by kind, with mostly small raise sizes. */
export function randomAction(legal: LegalActions, rng: Rng): PlayerAction {
  const kinds: PlayerAction[] = [];
  if (legal.canFold) kinds.push({ type: 'fold' });
  kinds.push(callOrCheck(legal));
  if (legal.raise) {
    const { type, min, max } = legal.raise;
    const roll = chance(rng);
    const amount = roll < 0.6 ? min : roll < 0.9 ? Math.round((min + max) / 2) : max;
    kinds.push({ type, amount });
  }
  return kinds[rng.nextInt(kinds.length)]!;
}

/** Raises made on the current street before this decision. */
function raisesThisStreet(view: PlayerView): number {
  const street = view.phase;
  return view.events.filter(
    (e) => e.type === 'action' && e.street === street && (e.action === 'raise' || e.action === 'bet'),
  ).length;
}

/** Players who called the big blind preflop without raising. */
function limpers(view: PlayerView): number {
  return view.events.filter((e) => e.type === 'action' && e.street === 'preflop' && e.action === 'call').length;
}

/** Seat of the last preflop raise, or -1. */
function preflopRaiser(view: PlayerView): number {
  let seat = -1;
  for (const e of view.events) {
    if (e.type === 'action' && e.street === 'preflop' && (e.action === 'raise' || e.action === 'bet')) seat = e.seat;
  }
  return seat;
}

/** Players still to act after this seat preflop, up to and including the big blind. */
function playersBehind(view: PlayerView): number {
  const n = view.players.length;
  const bigBlind = n === 2 ? (view.button + 1) % n : (view.button + 2) % n;
  let count = 0;
  for (let seat = (view.seat + 1) % n; seat !== view.seat; seat = (seat + 1) % n) {
    const p = view.players[seat]!;
    if (!p.folded && !p.allIn) count++;
    if (seat === bigBlind) break;
  }
  return view.seat === bigBlind ? 0 : count;
}

/** How much wider than its base ranges a position-aware player plays here. */
function rangeWidening(p: BotProfile, view: PlayerView): { open: number; defend: number } {
  if (!p.positionAware) return { open: 1, defend: 1 };
  const behind = Math.max(1, playersBehind(view));
  let open = Math.min(4, Math.pow(5 / behind, 0.75));
  // Stealers open even wider from the cutoff, the button and the small blind.
  if (p.steal > 0 && behind <= 2) open *= 1 + p.steal * 1.2;
  const defend = Math.sqrt(6 / view.players.length);
  return { open, defend };
}

/** The new card makes the board scary: a third card of a suit, four to a straight, or an ace or king on top. */
function scaryBoard(view: PlayerView): boolean {
  const board = view.board;
  if (board.length < 4) return false;
  const last = board[board.length - 1]!;
  const before = board.slice(0, -1);
  const suited = board.filter((c) => suitOf(c) === suitOf(last)).length;
  if (suited >= 3 && before.filter((c) => suitOf(c) === suitOf(last)).length < 3) return true;
  const mask = board.reduce((m, c) => m | (1 << rankOf(c)), 0);
  for (let r = 0; r < 13; r++) if (!(mask & (1 << r)) && straightHigh(mask | (1 << r)) >= 0) return true;
  const top = Math.max(...before.map(rankOf));
  return rankOf(last) >= 11 && rankOf(last) > top;
}

function preflopDecision(p: BotProfile, view: PlayerView, legal: LegalActions, ctx: BrainContext): PlayerAction {
  const me = view.players[view.seat]!;
  const { percentile } = preflopStrength(me.holeCards!);
  const raises = raisesThisStreet(view);
  const bb = view.bigBlind;
  const widen = rangeWidening(p, view);

  // Effective stack: the smaller of its own and the biggest opponent's, in big blinds.
  const deepest = Math.max(...view.players.filter((o) => o.seat !== view.seat && !o.folded).map((o) => o.stack + o.streetBet));
  const effective = Math.min(me.stack + me.streetBet, deepest) / bb;
  if (p.pushFold && effective <= p.pushFold.maxDepth) {
    // Push or fold: all-in or nothing, ranges a little wider in position.
    if (raises === 0) {
      if (percentile <= Math.min(0.9, p.pushFold.share * Math.sqrt(widen.open))) return allIn(legal);
      return passive(legal);
    }
    if (percentile <= p.pushFold.callShare * widen.defend) return allIn(legal);
    return passive(legal);
  }

  if (raises === 0) {
    const pfr = Math.min(0.95, p.pfr * widen.open);
    const vpip = Math.min(0.95, Math.max(p.vpip * widen.open, pfr));
    if (!p.limps && percentile <= pfr) {
      const raise = clampRaise(legal, bb * p.sizes.open + limpers(view) * bb);
      if (raise) return raise;
    }
    if (percentile <= vpip) return callOrCheck(legal);
    return passive(legal);
  }

  // Against someone it has seen raise far too often, it fights back with more hands.
  const raiser = preflopRaiser(view);
  const seenPfr = raiser >= 0 && p.rangeAware >= 0.5 ? ctx.model?.pfr(raiser) ?? null : null;
  const exploit = seenPfr !== null ? Math.min(2.2, Math.max(1, seenPfr / 0.22)) : 1;

  // Facing a raise: a cheap call relative to the pot widens what it continues with.
  const toCall = legal.callAmount;
  const price = toCall / (view.pot + toCall);
  const cheap = price < 0.2 ? 0.1 : 0;
  const callLimit = Math.min(
    0.9,
    Math.max(0, (p.vpip * (1 - p.foldToRaise) + cheap + p.stickiness * 0.15) * widen.defend * exploit),
  );

  if (raises === 1) {
    const threeBet = p.threeBet * widen.defend * exploit * (1 + p.steal);
    if (percentile <= threeBet) {
      const raise = p.jamThreeBets ? allIn(legal) : clampRaise(legal, view.currentBet * 3);
      if (raise) return raise;
    }
    if (percentile <= callLimit) return callOrCheck(legal);
    return passive(legal);
  }

  // Facing a 3-bet or more: only premium hands continue.
  if (percentile <= p.threeBet * 0.35 * exploit) {
    const raise = clampRaise(legal, view.currentBet * 2.5);
    if (raise) return raise;
    return callOrCheck(legal);
  }
  if (percentile <= callLimit * 0.4) return callOrCheck(legal);
  return passive(legal);
}

function postflopDecision(p: BotProfile, view: PlayerView, legal: LegalActions, rng: Rng, ctx: BrainContext): PlayerAction {
  const me = view.players[view.seat]!;
  const hole = me.holeCards!;
  const opponents = view.players.filter((o) => o.seat !== view.seat && !o.folded).length;
  const features = handFeatures(hole, view.board);

  let equity: number;
  if (p.rangeAware > 0) {
    let reads = blendReads(readsFromView(view, ctx.model ?? null), p.rangeAware);
    if (ctx.adjustReads) reads = ctx.adjustReads(reads, view);
    equity = estimateEquityVsReads(hole, view.board, reads, p.samples, rng);
  } else {
    equity = estimateEquity(hole, view.board, opponents, p.samples, rng);
  }
  // A less accurate player misjudges the hand by up to ±25%.
  equity += (chance(rng) * 2 - 1) * (1 - p.accuracy) * 0.25;
  if (features.pairWithHole && p.pairLove > 0) equity = Math.max(equity, 0.55 + 0.3 * p.pairLove);
  equity = Math.min(1, Math.max(0, equity));

  const hasDraw = features.flushDraw || features.straightDrawRanks > 0;
  const toCall = legal.callAmount;
  const pot = view.pot;
  const river = view.phase === 'river';
  const monster = equity >= 0.8;
  const betSize = (fraction: number) => clampRaise(legal, view.currentBet + pot * fraction);
  const raiseSize = (fraction: number) => clampRaise(legal, view.currentBet + (pot + toCall) * fraction);

  if (toCall === 0) {
    // Trapping: check a monster on the flop and turn, then bet big on the river.
    if (monster && !river && chance(rng) < p.slowplay) return { type: 'check' };
    if (monster && river && p.slowplay > 0) return betSize(p.sizes.bet * 1.5) ?? { type: 'check' };

    const threshold = p.valueOnly ? Math.max(p.valueThreshold, 0.7) : p.valueThreshold;
    if (equity >= threshold && chance(rng) < p.aggression) return betSize(p.sizes.bet) ?? { type: 'check' };
    if (p.valueOnly) return { type: 'check' };

    const flop = view.phase === 'flop';
    if (flop && p.cbet > 0 && preflopRaiser(view) === view.seat && raisesThisStreet(view) === 0 && chance(rng) < p.cbet) {
      return betSize(p.sizes.bet * 0.6) ?? { type: 'check' };
    }
    if (hasDraw && !river && chance(rng) < p.semiBluff) return betSize(p.sizes.bet) ?? { type: 'check' };
    if (equity < 0.45 && p.scareBluff > 0 && scaryBoard(view) && chance(rng) < p.scareBluff) {
      return betSize(p.sizes.bet * 1.1) ?? { type: 'check' };
    }
    if (equity < 0.4 && chance(rng) < p.bluff) return betSize(p.sizes.bet) ?? { type: 'check' };
    return { type: 'check' };
  }

  if (p.panicFold > 0 && equity >= 0.6 && chance(rng) < p.panicFold) return { type: 'fold' };

  // A big bet scares some players off anything short of a very strong hand.
  const bigBet = toCall >= 0.7 * Math.max(1, pot - toCall);
  if (bigBet && equity < 0.75 && chance(rng) < p.foldToBigBet) return { type: 'fold' };

  // Trapping: just call with a monster until the river.
  if (monster && !river && chance(rng) < p.slowplay) return { type: 'call' };

  const strong = equity >= 0.8 - 0.1 * p.aggression;
  if (legal.raise && strong && chance(rng) < p.aggression * 0.7) {
    const raise = raiseSize(p.sizes.raise);
    if (raise) return raise;
  }
  if (legal.raise && !river && (strong || hasDraw) && chance(rng) < p.checkRaise) {
    const raise = raiseSize(p.sizes.raise);
    if (raise) return raise;
  }
  if (legal.raise && hasDraw && !river && chance(rng) < p.semiBluff * 0.4) {
    const raise = raiseSize(p.sizes.raise);
    if (raise) return raise;
  }
  if (!p.valueOnly && legal.raise && chance(rng) < p.bluff * 0.2) {
    const raise = raiseSize(p.sizes.raise);
    if (raise) return raise;
  }

  // Draw chasers call with any draw, whatever the price.
  if (hasDraw && p.drawLove > 0 && chance(rng) < p.drawLove) return { type: 'call' };
  const price = toCall / (pot + toCall);
  const effective = equity + p.stickiness * 0.35;
  return effective >= price ? { type: 'call' } : { type: 'fold' };
}

/** Decision for one spot from a style profile. */
export function profileDecision(p: BotProfile, view: PlayerView, rng: Rng, ctx: BrainContext = {}): PlayerAction {
  const legal = view.legal;
  if (!legal) throw new Error('The bot was asked to act out of turn');
  if (p.randomness > 0 && chance(rng) < p.randomness) return randomAction(legal, rng);
  return view.phase === 'preflop' ? preflopDecision(p, view, legal, ctx) : postflopDecision(p, view, legal, rng, ctx);
}

/** A stateless bot that plays a profile. */
export function profileBot(id: string, profile: BotProfile): Bot {
  return {
    id,
    decide: (view, rng) => profileDecision(profile, view, rng),
  };
}
