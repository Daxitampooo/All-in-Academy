import type { LegalActions, PlayerAction, PlayerView, Rng } from '@pokerall/poker-engine';

import { estimateEquity, handFeatures, preflopStrength } from './strength';
import type { Bot, BotProfile } from './types';

/** Uniform random number in [0, 1). */
export function chance(rng: Rng): number {
  return rng.nextInt(1 << 30) / (1 << 30);
}

function clampRaise(legal: LegalActions, amount: number): PlayerAction | null {
  const r = legal.raise;
  if (!r) return null;
  let to = Math.round(amount);
  if (to < r.min) to = r.min;
  // Leaving a small remainder behind makes no sense: go all-in instead.
  if (to > r.max || (r.max - to) / r.max < 0.25) to = r.max;
  return { type: r.type, amount: to };
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
  const open = Math.min(4, Math.pow(5 / behind, 0.75));
  const defend = Math.sqrt(6 / view.players.length);
  return { open, defend };
}

function preflopDecision(p: BotProfile, view: PlayerView, legal: LegalActions, rng: Rng): PlayerAction {
  const me = view.players[view.seat]!;
  const { percentile } = preflopStrength(me.holeCards!);
  const raises = raisesThisStreet(view);
  const bb = view.bigBlind;
  const widen = rangeWidening(p, view);

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

  // Facing a raise: a cheap call relative to the pot widens what it continues with.
  const toCall = legal.callAmount;
  const price = toCall / (view.pot + toCall);
  const cheap = price < 0.2 ? 0.1 : 0;
  const callLimit = Math.min(0.9, Math.max(0, (p.vpip * (1 - p.foldToRaise) + cheap + p.stickiness * 0.15) * widen.defend));

  if (raises === 1) {
    if (percentile <= p.threeBet * widen.defend) {
      const raise = clampRaise(legal, view.currentBet * 3);
      if (raise) return raise;
    }
    if (percentile <= callLimit) return callOrCheck(legal);
    return passive(legal);
  }

  // Facing a 3-bet or more: only premium hands continue.
  if (percentile <= p.threeBet * 0.35) {
    const raise = clampRaise(legal, view.currentBet * 2.5);
    if (raise) return raise;
    return callOrCheck(legal);
  }
  if (percentile <= callLimit * 0.4) return callOrCheck(legal);
  return passive(legal);
}

function postflopDecision(p: BotProfile, view: PlayerView, legal: LegalActions, rng: Rng): PlayerAction {
  const me = view.players[view.seat]!;
  const hole = me.holeCards!;
  const opponents = view.players.filter((o) => o.seat !== view.seat && !o.folded).length;
  const features = handFeatures(hole, view.board);

  let equity = estimateEquity(hole, view.board, opponents, p.samples, rng);
  // A less accurate player misjudges the hand by up to ±25%.
  equity += (chance(rng) * 2 - 1) * (1 - p.accuracy) * 0.25;
  if (features.pairWithHole && p.pairLove > 0) equity = Math.max(equity, 0.55 + 0.3 * p.pairLove);
  equity = Math.min(1, Math.max(0, equity));

  const hasDraw = features.flushDraw || features.straightDrawRanks > 0;
  const toCall = legal.callAmount;
  const pot = view.pot;

  if (toCall === 0) {
    const threshold = p.valueOnly ? Math.max(p.valueThreshold, 0.7) : p.valueThreshold;
    if (equity >= threshold && chance(rng) < p.aggression) {
      return clampRaise(legal, view.currentBet + pot * p.sizes.bet) ?? { type: 'check' };
    }
    if (!p.valueOnly && equity < 0.4 && chance(rng) < p.bluff) {
      return clampRaise(legal, view.currentBet + pot * p.sizes.bet) ?? { type: 'check' };
    }
    return { type: 'check' };
  }

  if (p.panicFold > 0 && equity >= 0.6 && chance(rng) < p.panicFold) return { type: 'fold' };

  const strong = equity >= 0.8 - 0.1 * p.aggression;
  if (strong && legal.raise && chance(rng) < p.aggression * 0.7) {
    const raise = clampRaise(legal, view.currentBet + (pot + toCall) * p.sizes.raise);
    if (raise) return raise;
  }
  if (!p.valueOnly && legal.raise && chance(rng) < p.bluff * 0.2) {
    const raise = clampRaise(legal, view.currentBet + (pot + toCall) * p.sizes.raise);
    if (raise) return raise;
  }

  // Draw chasers call with any draw, whatever the price.
  if (hasDraw && p.drawLove > 0 && chance(rng) < p.drawLove) return { type: 'call' };
  const price = toCall / (pot + toCall);
  const effective = equity + p.stickiness * 0.35;
  return effective >= price ? { type: 'call' } : { type: 'fold' };
}

/** Decision for one spot from a style profile. */
export function profileDecision(p: BotProfile, view: PlayerView, rng: Rng): PlayerAction {
  const legal = view.legal;
  if (!legal) throw new Error('The bot was asked to act out of turn');
  if (p.randomness > 0 && chance(rng) < p.randomness) return randomAction(legal, rng);
  return view.phase === 'preflop' ? preflopDecision(p, view, legal, rng) : postflopDecision(p, view, legal, rng);
}

/** A stateless bot that plays a profile. */
export function profileBot(id: string, profile: BotProfile): Bot {
  return {
    id,
    decide: (view, rng) => profileDecision(profile, view, rng),
  };
}
