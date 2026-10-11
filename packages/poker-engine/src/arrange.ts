import { assertDistinct, type Card } from './cards';
import { shuffle, type Rng } from './rng';

export type ArrangeOptions = {
  playerCount: number;
  button: number;
  /** Hole cards per seat; leave a seat undefined to deal it random cards. */
  holeCards?: (readonly [Card, Card] | undefined)[];
  /** Up to five board cards in order: flop, turn, river. */
  board?: Card[];
  /** Shuffles the unspecified cards; without it they stay in ascending order. */
  rng?: Rng;
};

/**
 * Builds a deck that deals the chosen hole cards and board through
 * `startHand`. Used for tests, Academy example hands and drills.
 */
export function arrangeDeck(options: ArrangeOptions): Card[] {
  const { playerCount: n, button } = options;
  const holes = options.holeCards ?? [];
  const board = options.board ?? [];
  if (board.length > 5) throw new Error('Board has at most five cards');
  const fixedCards = [...holes.flatMap((h) => (h ? [...h] : [])), ...board];
  assertDistinct(fixedCards);

  const deck = new Array<Card | undefined>(52).fill(undefined);
  for (let seat = 0; seat < n; seat++) {
    const h = holes[seat];
    if (!h) continue;
    const order = (seat - button - 1 + 2 * n) % n;
    deck[order] = h[0];
    deck[n + order] = h[1];
  }
  // After the hole cards: burn, flop x3, burn, turn, burn, river.
  const boardSlots = [2 * n + 1, 2 * n + 2, 2 * n + 3, 2 * n + 5, 2 * n + 7];
  board.forEach((c, i) => {
    deck[boardSlots[i]!] = c;
  });

  const used = new Uint8Array(52);
  for (const c of fixedCards) used[c] = 1;
  let rest: Card[] = [];
  for (let c = 0; c < 52; c++) if (!used[c]) rest.push(c);
  if (options.rng) rest = shuffle(rest, options.rng);
  let k = 0;
  return deck.map((c) => (c === undefined ? rest[k++]! : c));
}
