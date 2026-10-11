import { assertDistinct, type Card } from './cards';
import { describeHand, type CategoryId, type HandValue } from './evaluator';
import { positionsFor, type Position } from './positions';
import { buildPots, splitPot, type Pot } from './pots';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Phase = Street | 'complete';

export type SeatConfig = {
  /** Player id (any string the caller uses). */
  id: string;
  /** Chips at the start of the hand. Whole numbers only. */
  stack: number;
};

export type HandConfig = {
  /** Players in clockwise seat order. 2 to 10 players, each with chips. */
  players: SeatConfig[];
  /** Index in `players` of the dealer button. */
  button: number;
  smallBlind: number;
  bigBlind: number;
  /** Ante every player posts before the blinds (0 or omitted for none). */
  ante?: number;
};

export type PlayerState = {
  id: string;
  seat: number;
  position: Position;
  startStack: number;
  /** Chips still in front of the player. */
  stack: number;
  /** Chips put in on the current street (blinds count, antes don't). */
  streetBet: number;
  /** Chips put in during the whole hand, antes included. */
  totalBet: number;
  holeCards: [Card, Card];
  folded: boolean;
  allIn: boolean;
  /** Has made a voluntary decision on this street (posting a blind isn't one). */
  acted: boolean;
  /** The bet to match at the moment of the player's last decision on this street. */
  lastActionLevel: number;
};

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';

/** `amount` for bet and raise is the player's total for the street ("raise to"). */
export type PlayerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number };

export type HandEvent =
  | { type: 'ante'; seat: number; amount: number; allIn: boolean }
  | { type: 'blind'; seat: number; blind: 'small' | 'big'; amount: number; allIn: boolean }
  | {
      type: 'action';
      seat: number;
      street: Street;
      action: ActionType;
      /** Chips added by this action. */
      added: number;
      /** Player's street total after the action. */
      streetBet: number;
      allIn: boolean;
    }
  | { type: 'street'; street: Exclude<Street, 'preflop'>; cards: Card[]; board: Card[] }
  | { type: 'uncalled'; seat: number; amount: number }
  | { type: 'showdown'; seat: number; cards: [Card, Card]; value: HandValue; categoryId: CategoryId; bestFive: Card[] }
  | { type: 'pot'; index: number; amount: number; eligible: number[]; winners: number[]; shares: number[] }
  | { type: 'hand-end' };

export type HandResult = {
  /** True when everyone else folded and nobody showed cards. */
  uncontested: boolean;
  pots: (Pot & { winners: number[]; shares: number[] })[];
  /** Chips won by each seat from the pots. */
  won: number[];
  /** Change of each seat's stack over the hand. */
  net: number[];
};

export type HandState = {
  config: HandConfig;
  players: PlayerState[];
  button: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  deck: Card[];
  /** Next undealt card in `deck`. */
  deckPos: number;
  board: Card[];
  phase: Phase;
  /** Highest street total any player has reached on this street. */
  currentBet: number;
  /** Size of the last full bet or raise on this street; the next raise must add at least this. */
  minRaise: number;
  /** Seat whose turn it is, or null when no decision is pending. */
  toAct: number | null;
  events: HandEvent[];
  result: HandResult | null;
};

export type LegalActions = {
  seat: number;
  canFold: boolean;
  canCheck: boolean;
  /** Chips needed to call, capped by the stack; 0 when there's nothing to call. */
  callAmount: number;
  /** Set when the player may bet or raise: allowed "to" amounts, inclusive. */
  raise: { type: 'bet' | 'raise'; min: number; max: number } | null;
};

function isWhole(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

function clonePlayers(players: readonly PlayerState[]): PlayerState[] {
  return players.map((p) => ({ ...p }));
}

/** Seats in clockwise order starting at `from` (inclusive). */
function seatsFrom(from: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => (from + i) % count);
}

/**
 * Starts a hand: posts antes and blinds and deals hole cards from `deck`
 * (a full shuffled deck). Pure: the same config and deck give the same hand.
 */
export function startHand(config: HandConfig, deck: readonly Card[]): HandState {
  const n = config.players.length;
  if (n < 2 || n > 10) throw new Error(`A hand needs 2 to 10 players, got ${n}`);
  if (!Number.isInteger(config.button) || config.button < 0 || config.button >= n) {
    throw new Error(`Bad button ${config.button}`);
  }
  const ante = config.ante ?? 0;
  if (!isWhole(config.smallBlind) || !isWhole(config.bigBlind) || !isWhole(ante) || config.bigBlind <= 0) {
    throw new Error('Blinds and ante must be whole numbers and the big blind above zero');
  }
  if (config.smallBlind > config.bigBlind) throw new Error('Small blind is bigger than the big blind');
  for (const p of config.players) {
    if (!Number.isInteger(p.stack) || p.stack <= 0) throw new Error(`Player ${p.id} needs a positive whole stack`);
  }
  if (deck.length !== 52) throw new Error('Deck must have 52 cards');
  assertDistinct(deck);

  const button = config.button;
  const headsUp = n === 2;
  const smallBlindSeat = headsUp ? button : (button + 1) % n;
  const bigBlindSeat = headsUp ? (button + 1) % n : (button + 2) % n;
  const positions = positionsFor(n, button);

  // Deal one card at a time, starting left of the button (heads-up: the big blind).
  const holes: Card[][] = Array.from({ length: n }, () => []);
  let deckPos = 0;
  const dealOrder = seatsFrom((button + 1) % n, n);
  for (let round = 0; round < 2; round++) for (const seat of dealOrder) holes[seat]!.push(deck[deckPos++]!);

  const players: PlayerState[] = config.players.map((p, seat) => ({
    id: p.id,
    seat,
    position: positions[seat]!,
    startStack: p.stack,
    stack: p.stack,
    streetBet: 0,
    totalBet: 0,
    holeCards: [holes[seat]![0]!, holes[seat]![1]!],
    folded: false,
    allIn: false,
    acted: false,
    lastActionLevel: 0,
  }));

  const events: HandEvent[] = [];
  if (ante > 0) {
    for (const seat of dealOrder) {
      const p = players[seat]!;
      const amount = Math.min(ante, p.stack);
      p.stack -= amount;
      p.totalBet += amount;
      p.allIn = p.stack === 0;
      events.push({ type: 'ante', seat, amount, allIn: p.allIn });
    }
  }
  const postBlind = (seat: number, size: number, blind: 'small' | 'big') => {
    const p = players[seat]!;
    const amount = Math.min(size, p.stack);
    if (amount === 0) return; // already all-in from the ante
    p.stack -= amount;
    p.streetBet += amount;
    p.totalBet += amount;
    p.allIn = p.stack === 0;
    events.push({ type: 'blind', seat, blind, amount, allIn: p.allIn });
  };
  postBlind(smallBlindSeat, config.smallBlind, 'small');
  postBlind(bigBlindSeat, config.bigBlind, 'big');

  const state: HandState = {
    config,
    players,
    button,
    smallBlindSeat,
    bigBlindSeat,
    deck: deck.slice(),
    deckPos,
    board: [],
    phase: 'preflop',
    // Callers must match the full big blind even if the big blind is all-in for less.
    currentBet: Math.max(config.bigBlind, ...players.map((p) => p.streetBet)),
    minRaise: config.bigBlind,
    toAct: null,
    events,
    result: null,
  };

  const firstPreflop = headsUp ? smallBlindSeat : (bigBlindSeat + 1) % n;
  return continueHand(state, firstPreflop);
}

function needsToAct(state: HandState, p: PlayerState): boolean {
  return !p.folded && !p.allIn && (!p.acted || p.streetBet < state.currentBet);
}

function liveCount(state: HandState): number {
  return state.players.filter((p) => !p.folded).length;
}

function canStillBetCount(state: HandState): number {
  return state.players.filter((p) => !p.folded && !p.allIn).length;
}

/** Finds the next decision starting at `from`, or closes the street when nobody needs to act. */
function continueHand(state: HandState, from: number): HandState {
  const n = state.players.length;
  for (;;) {
    if (liveCount(state) === 1) return finishHand(state);

    // When at most one player can still bet and nobody faces a bet, there's nothing to decide.
    const bettors = canStillBetCount(state);
    const pending = seatsFrom(from, n).find((seat) => needsToAct(state, state.players[seat]!));
    if (pending !== undefined && !(bettors <= 1 && state.players[pending]!.streetBet >= state.currentBet)) {
      state.toAct = pending;
      return state;
    }

    // The betting round is over.
    returnUncalled(state);
    if (state.phase === 'river') return finishHand(state);
    dealNextStreet(state);
    from = (state.button + 1) % n;
  }
}

/** Gives back the part of the biggest bet on this street that nobody matched. */
function returnUncalled(state: HandState): void {
  const bets = state.players.map((p) => p.streetBet);
  const top = Math.max(...bets);
  if (top === 0) return;
  const leaders = state.players.filter((p) => p.streetBet === top);
  if (leaders.length !== 1) return;
  const leader = leaders[0]!;
  const second = Math.max(0, ...state.players.filter((p) => p !== leader).map((p) => p.streetBet));
  const amount = top - second;
  if (amount <= 0) return;
  leader.stack += amount;
  leader.streetBet -= amount;
  leader.totalBet -= amount;
  if (leader.stack > 0) leader.allIn = false;
  state.events.push({ type: 'uncalled', seat: leader.seat, amount });
}

function dealNextStreet(state: HandState): void {
  const next: Record<Street, Exclude<Street, 'preflop'> | null> = {
    preflop: 'flop',
    flop: 'turn',
    turn: 'river',
    river: null,
  };
  const street = next[state.phase as Street];
  if (!street) throw new Error('No street after the river');
  state.deckPos++; // burn
  const count = street === 'flop' ? 3 : 1;
  const cards = state.deck.slice(state.deckPos, state.deckPos + count);
  state.deckPos += count;
  state.board = [...state.board, ...cards];
  state.phase = street;
  state.currentBet = 0;
  state.minRaise = state.config.bigBlind;
  for (const p of state.players) {
    p.streetBet = 0;
    p.acted = false;
    p.lastActionLevel = 0;
  }
  state.events.push({ type: 'street', street, cards, board: state.board.slice() });
}

function finishHand(state: HandState): HandState {
  returnUncalled(state);
  const n = state.players.length;
  const live = state.players.filter((p) => !p.folded);
  const uncontested = live.length === 1;

  // Run out the board when the hand ends in an all-in.
  if (!uncontested) while (state.board.length < 5) dealNextStreet(state);

  const pots = buildPots(
    state.players.map((p) => p.totalBet),
    state.players.map((p) => p.folded),
  );

  const values = new Map<number, HandValue>();
  if (!uncontested) {
    for (const p of live) {
      const d = describeHand([...p.holeCards, ...state.board]);
      values.set(p.seat, d.value);
      state.events.push({
        type: 'showdown',
        seat: p.seat,
        cards: p.holeCards,
        value: d.value,
        categoryId: d.categoryId,
        bestFive: d.bestFive,
      });
    }
  }

  const won = new Array<number>(n).fill(0);
  const resultPots: HandResult['pots'] = pots.map((pot, index) => {
    let winners: number[];
    if (uncontested) winners = [live[0]!.seat];
    else {
      const best = Math.max(...pot.eligible.map((s) => values.get(s)!));
      winners = pot.eligible.filter((s) => values.get(s) === best);
    }
    const shares = splitPot(pot.amount, winners, state.button, n);
    winners.forEach((seat, i) => {
      won[seat]! += shares[i]!;
    });
    state.events.push({ type: 'pot', index, amount: pot.amount, eligible: pot.eligible, winners, shares });
    return { ...pot, winners, shares };
  });

  for (const p of state.players) {
    p.stack += won[p.seat]!;
    p.streetBet = 0;
  }
  state.result = {
    uncontested,
    pots: resultPots,
    won,
    net: state.players.map((p) => p.stack - p.startStack),
  };
  state.phase = 'complete';
  state.toAct = null;
  state.events.push({ type: 'hand-end' });
  return state;
}

/** What the player to act may do right now. */
export function legalActions(state: HandState): LegalActions | null {
  if (state.toAct === null) return null;
  const p = state.players[state.toAct]!;
  const toCall = Math.max(0, state.currentBet - p.streetBet);
  const others = state.players.filter((o) => o !== p && !o.folded && !o.allIn).length;
  // A short all-in doesn't reopen the betting for someone who already acted.
  const reopened = !p.acted || state.currentBet - p.lastActionLevel >= state.minRaise;
  let raise: LegalActions['raise'] = null;
  if (p.stack > toCall && others > 0 && reopened) {
    const max = p.streetBet + p.stack;
    const fullMin = state.currentBet + state.minRaise;
    raise = { type: state.currentBet === 0 ? 'bet' : 'raise', min: Math.min(fullMin, max), max };
  }
  return {
    seat: p.seat,
    canFold: toCall > 0,
    canCheck: toCall === 0,
    callAmount: Math.min(toCall, p.stack),
    raise,
  };
}

/** Applies the action of the player whose turn it is. Returns a new state; throws on illegal actions. */
export function applyAction(prev: HandState, action: PlayerAction): HandState {
  const legal = legalActions(prev);
  if (!legal) throw new Error('No decision is pending in this hand');

  const state: HandState = {
    ...prev,
    players: clonePlayers(prev.players),
    board: prev.board.slice(),
    events: prev.events.slice(),
  };
  const p = state.players[legal.seat]!;
  const street = state.phase as Street;
  const record = (type: ActionType, added: number) =>
    state.events.push({ type: 'action', seat: p.seat, street, action: type, added, streetBet: p.streetBet, allIn: p.allIn });
  const put = (amount: number) => {
    p.stack -= amount;
    p.streetBet += amount;
    p.totalBet += amount;
    p.allIn = p.stack === 0;
  };

  switch (action.type) {
    case 'fold':
      if (!legal.canFold) throw new Error('Nothing to call: check instead of folding');
      p.folded = true;
      record('fold', 0);
      break;
    case 'check':
      if (!legal.canCheck) throw new Error(`Can't check facing a bet of ${state.currentBet}`);
      record('check', 0);
      break;
    case 'call':
      if (legal.callAmount === 0) throw new Error('Nothing to call');
      put(legal.callAmount);
      record('call', legal.callAmount);
      break;
    case 'bet':
    case 'raise': {
      const r = legal.raise;
      if (!r) throw new Error('Raising is not allowed here');
      if (r.type !== action.type) throw new Error(`Use "${r.type}" here, not "${action.type}"`);
      if (!Number.isInteger(action.amount) || action.amount < r.min || action.amount > r.max) {
        throw new Error(`${action.type} must be between ${r.min} and ${r.max}, got ${action.amount}`);
      }
      const added = action.amount - p.streetBet;
      const raiseSize = action.amount - state.currentBet;
      put(added);
      if (raiseSize >= state.minRaise) state.minRaise = raiseSize;
      state.currentBet = action.amount;
      record(action.type, added);
      break;
    }
    default:
      throw new Error(`Unknown action ${(action as { type: string }).type}`);
  }
  p.acted = true;
  p.lastActionLevel = state.currentBet;

  return continueHand(state, (p.seat + 1) % state.players.length);
}

/** Total chips in the middle, including bets on the current street. */
export function potSize(state: HandState): number {
  return state.players.reduce((sum, p) => sum + p.totalBet, 0);
}

/** A move that `legalActions` allows, picked by the caller, e.g. a bot. */
export function isLegal(state: HandState, action: PlayerAction): boolean {
  try {
    applyAction(state, action);
    return true;
  } catch {
    return false;
  }
}
