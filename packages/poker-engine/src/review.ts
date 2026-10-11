import { legalActions, potSize, type HandEvent, type HandState, type Street } from './game';
import { historyOf, replay } from './history';

/** One decision a player made during a hand, with the numbers they faced at that moment. */
export type Decision = {
  street: Street;
  /** The hand right before the decision. */
  before: HandState;
  action: Extract<HandEvent, { type: 'action' }>;
  /** Chips the player needed to put in to call; 0 when there was nothing to call. */
  toCall: number;
  /** Chips in the middle before the decision, bets on this street included. */
  pot: number;
  /** Share of equity a call needed to break even: toCall / (pot + toCall). Null with nothing to call. */
  potOdds: number | null;
};

/** Every decision `seat` made in a hand, in order. Works on finished hands and hands in progress. */
export function decisionsOf(state: HandState, seat: number): Decision[] {
  const states = replay(historyOf(state));
  const out: Decision[] = [];
  for (let i = 0; i + 1 < states.length; i++) {
    const before = states[i]!;
    if (before.toAct !== seat || before.phase === 'complete') continue;
    const after = states[i + 1]!;
    let action: Extract<HandEvent, { type: 'action' }> | undefined;
    for (let j = after.events.length - 1; j >= 0 && !action; j--) {
      const e = after.events[j]!;
      if (e.type === 'action') action = e;
    }
    if (!action || action.seat !== seat) continue;
    const legal = legalActions(before);
    const toCall = legal?.callAmount ?? 0;
    const pot = potSize(before);
    out.push({
      street: before.phase,
      before,
      action,
      toCall,
      pot,
      potOdds: toCall > 0 ? toCall / (pot + toCall) : null,
    });
  }
  return out;
}
