import {
  applyAction,
  arrangeDeck,
  legalActions,
  parseCards,
  startHand,
  type Card,
  type HandConfig,
  type HandState,
  type PlayerAction,
} from '../src';

export function cards(text: string): Card[] {
  return parseCards(text);
}

export function two(text: string): [Card, Card] {
  const c = parseCards(text);
  if (c.length !== 2) throw new Error(`Expected two cards: ${text}`);
  return [c[0]!, c[1]!];
}

/** Starts a hand with given stacks; hole cards and board are optional. */
export function deal(
  stacks: number[],
  opts: {
    button?: number;
    sb?: number;
    bb?: number;
    ante?: number;
    holes?: (string | undefined)[];
    board?: string;
  } = {},
): HandState {
  const button = opts.button ?? 0;
  const config: HandConfig = {
    players: stacks.map((stack, i) => ({ id: `p${i}`, stack })),
    button,
    smallBlind: opts.sb ?? 50,
    bigBlind: opts.bb ?? 100,
    ante: opts.ante ?? 0,
  };
  const deck = arrangeDeck({
    playerCount: stacks.length,
    button,
    holeCards: (opts.holes ?? []).map((h) => (h ? two(h) : undefined)),
    board: opts.board ? cards(opts.board) : [],
  });
  return startHand(config, deck);
}

/** Applies a list of actions written like "call", "fold", "check", "raise 300", "bet 200", "allin". */
export function play(state: HandState, ...moves: string[]): HandState {
  let s = state;
  for (const move of moves) {
    const [word, amountText] = move.split(' ');
    let action: PlayerAction;
    if (word === 'allin') {
      const legal = legalActions(s);
      if (!legal) throw new Error('No one to act');
      action = legal.raise
        ? { type: legal.raise.type, amount: legal.raise.max }
        : { type: 'call' };
    } else if (word === 'bet' || word === 'raise') {
      action = { type: word, amount: Number(amountText) };
    } else {
      action = { type: word as 'fold' | 'check' | 'call' };
    }
    s = applyAction(s, action);
  }
  return s;
}

export function stacks(state: HandState): number[] {
  return state.players.map((p) => p.stack);
}
