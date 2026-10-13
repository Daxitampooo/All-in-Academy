import { legalActions, potSize, shuffledDeck, type HandState, type PlayerAction, type Rng } from '@pokerall/poker-engine';

import { riverOutcome } from './cards';
import type { TrainingBot } from './index';

const chance = (rng: Rng, p: number) => rng.nextInt(1000) < p * 1000;

/** A "to" amount for a bet or raise of `fraction` of the pot, kept inside the legal range. */
function sized(state: HandState, fraction: number): PlayerAction | null {
  const legal = legalActions(state);
  if (!legal?.raise) return null;
  const { type, min, max } = legal.raise;
  // After calling, the pot grows by the call; the bet or raise goes on top of the current bet.
  const to = Math.round(state.currentBet + (potSize(state) + legal.callAmount) * fraction);
  return { type, amount: Math.max(min, Math.min(max, to)) };
}

/**
 * Danil sees everything: both hands and the board still in the deck. When he is going to win he builds
 * the pot, when he is going to lose he gives up, and now and then he bluffs so that folding to him every
 * time doesn't work either.
 */
export function decideDanil(state: HandState, seat: number, rng: Rng): PlayerAction {
  const legal = legalActions(state)!;
  const outcome = riverOutcome(state, seat);
  const toCall = legal.callAmount;
  const preflop = state.phase === 'preflop';
  const passive: PlayerAction = legal.canCheck ? { type: 'check' } : { type: 'call' };

  if (outcome === 1) {
    if (toCall === 0) {
      // Checks some flops and turns to let the other player catch up and bet.
      if (!preflop && state.phase !== 'river' && chance(rng, 0.3)) return { type: 'check' };
      return sized(state, preflop ? 1 : 0.55 + rng.nextInt(40) / 100) ?? passive;
    }
    if (chance(rng, preflop ? 0.45 : 0.35)) return sized(state, 1) ?? { type: 'call' };
    return { type: 'call' };
  }

  if (outcome === 0.5) return passive;

  // Losing.
  if (toCall === 0) {
    if (!preflop && chance(rng, 0.14)) return sized(state, 0.6) ?? { type: 'check' };
    return { type: 'check' };
  }
  // Completes the small blind now and then, like any player would.
  if (preflop && toCall <= state.config.bigBlind / 2 && chance(rng, 0.35)) return { type: 'call' };
  return legal.canCheck ? { type: 'check' } : { type: 'fold' };
}

export function createDanil(): TrainingBot {
  return {
    id: 'danil',
    dealHand: (deal, _seat, rng) => deal(shuffledDeck(rng)),
    decide: decideDanil,
    handFinished: () => {},
    riggedHands: () => 0,
  };
}
