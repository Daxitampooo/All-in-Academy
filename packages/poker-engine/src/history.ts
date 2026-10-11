import type { Card } from './cards';
import { applyAction, startHand, type HandConfig, type HandState, type PlayerAction } from './game';

/**
 * Everything needed to replay a hand exactly: the setup, the deck order and
 * the decisions. Small enough to store thousands of hands on the phone.
 */
export type HandHistory = {
  version: 1;
  config: HandConfig;
  deck: Card[];
  actions: { seat: number; action: PlayerAction }[];
};

/** Extracts the replayable history from a hand in progress or finished. */
export function historyOf(state: HandState): HandHistory {
  const actions: HandHistory['actions'] = [];
  for (const e of state.events) {
    if (e.type !== 'action') continue;
    const action: PlayerAction =
      e.action === 'bet' || e.action === 'raise'
        ? { type: e.action, amount: e.streetBet }
        : { type: e.action };
    actions.push({ seat: e.seat, action });
  }
  return { version: 1, config: state.config, deck: state.deck.slice(), actions };
}

/** Rebuilds a hand step by step: the state after the deal, then after each decision. */
export function replay(history: HandHistory): HandState[] {
  if (history.version !== 1) throw new Error(`Unknown hand history version ${history.version}`);
  const states = [startHand(history.config, history.deck)];
  for (const { seat, action } of history.actions) {
    const current = states[states.length - 1]!;
    if (current.toAct !== seat) {
      throw new Error(`History expects seat ${seat} to act, but it's seat ${current.toAct}'s turn`);
    }
    states.push(applyAction(current, action));
  }
  return states;
}
