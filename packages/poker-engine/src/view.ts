import type { Card } from './cards';
import { legalActions, potSize, type HandEvent, type HandState, type LegalActions, type Phase } from './game';
import type { Position } from './positions';

/** What one player can see about another seat. */
export type SeatView = {
  seat: number;
  id: string;
  position: Position;
  stack: number;
  streetBet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  /** Own cards always; other players' cards only once shown at showdown. */
  holeCards: [Card, Card] | null;
};

/**
 * The hand as seen from one seat: public information plus the viewer's own
 * cards. Bots and (later) online clients get this, never the full HandState,
 * so they can't see opponents' cards or the deck.
 */
export type PlayerView = {
  /** Viewer's seat, or -1 for a spectator. */
  seat: number;
  phase: Phase;
  board: Card[];
  /** All chips in the middle, current street bets included. */
  pot: number;
  currentBet: number;
  minRaise: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  button: number;
  toAct: number | null;
  players: SeatView[];
  /** Public events: antes, blinds, actions, streets, showdowns, pots. */
  events: HandEvent[];
  /** Viewer's legal actions when it's their turn. */
  legal: LegalActions | null;
};

export function viewFor(state: HandState, seat: number): PlayerView {
  const shown = new Map<number, [Card, Card]>();
  for (const e of state.events) if (e.type === 'showdown') shown.set(e.seat, e.cards);

  return {
    seat,
    phase: state.phase,
    board: state.board.slice(),
    pot: potSize(state),
    currentBet: state.currentBet,
    minRaise: state.minRaise,
    smallBlind: state.config.smallBlind,
    bigBlind: state.config.bigBlind,
    ante: state.config.ante ?? 0,
    button: state.button,
    toAct: state.toAct,
    players: state.players.map((p) => ({
      seat: p.seat,
      id: p.id,
      position: p.position,
      stack: p.stack,
      streetBet: p.streetBet,
      totalBet: p.totalBet,
      folded: p.folded,
      allIn: p.allIn,
      holeCards: p.seat === seat ? ([...p.holeCards] as [Card, Card]) : (shown.get(p.seat) ?? null),
    })),
    // Events never carry hidden cards: showdown cards are public by then.
    events: state.events.slice(),
    legal: state.toAct === seat ? legalActions(state) : null,
  };
}
