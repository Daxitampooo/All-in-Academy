import { evaluate, type Card, type HandState } from '@pokerall/poker-engine';

/**
 * The full board this hand will have if it goes to the river: the cards already out plus the ones waiting
 * in the deck, with a burn card before every street the way the engine deals them.
 */
export function finalBoard(state: HandState): Card[] {
  const board = [...state.board];
  let pos = state.deckPos;
  while (board.length < 5) {
    pos += 1; // burn
    const count = board.length === 0 ? 3 : 1;
    for (let i = 0; i < count; i++) board.push(state.deck[pos++]!);
  }
  return board;
}

/** Hand value of `seat` on the river; higher wins. */
export function riverValue(state: HandState, seat: number, board = finalBoard(state)): number {
  return evaluate([...state.players[seat]!.holeCards, ...board]);
}

/** 1 when `seat` beats everyone still in the hand on the river, 0.5 on a tie, 0 when it loses. */
export function riverOutcome(state: HandState, seat: number): 0 | 0.5 | 1 {
  const board = finalBoard(state);
  const mine = riverValue(state, seat, board);
  let best = -1;
  for (const p of state.players) {
    if (p.seat === seat || p.folded) continue;
    best = Math.max(best, riverValue(state, p.seat, board));
  }
  if (mine > best) return 1;
  return mine === best ? 0.5 : 0;
}
