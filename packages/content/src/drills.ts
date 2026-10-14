import {
  HandCategory,
  categoryOf,
  classCombos,
  classWeight,
  evaluate,
  gridClass,
  handClassOf,
  shuffle,
  shuffledDeck,
  type Card,
  type Rng,
} from '@pokerall/poker-engine';

import { RFI_RANGES, rangeActions } from './academy';

/**
 * Question generators for the trainers. Pure: give them an Rng and they return a question with its
 * answer, so the app only draws and checks.
 */

export const RFI_SEATS = ['UTG', 'HJ', 'CO', 'BTN', 'SB'] as const;
export type RfiSeat = (typeof RFI_SEATS)[number];

export type PreflopQuestion = {
  seat: RfiSeat;
  cards: [Card, Card];
  handClass: string;
  /** How often the reference range opens this hand, 0..1. */
  raise: number;
};

/** Hand classes on the edge of a range: in it next to a fold, or out of it next to a raise. */
function borderClasses(seat: RfiSeat): string[] {
  const range = rangeActions(RFI_RANGES[seat]!).raise!;
  const w = (r: number, c: number) => (r < 0 || c < 0 || r > 12 || c > 12 ? null : classWeight(range, gridClass(r, c)));
  const out: string[] = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const own = w(r, c)!;
      const around = [w(r - 1, c), w(r + 1, c), w(r, c - 1), w(r, c + 1)].filter((x): x is number => x !== null);
      if ((own > 0 && around.some((x) => x === 0)) || (own === 0 && around.some((x) => x > 0)) || (own > 0 && own < 1)) {
        out.push(gridClass(r, c));
      }
    }
  }
  return out;
}

const borders = new Map<RfiSeat, string[]>();

/**
 * Folded to you at a 6-max table, 100 big blinds: raise or fold? Half the hands come from the edge of the
 * opening range, where the decision teaches something.
 */
export function preflopQuestion(rng: Rng, seat?: RfiSeat): PreflopQuestion {
  const s = seat ?? RFI_SEATS[rng.nextInt(RFI_SEATS.length)]!;
  let cards: [Card, Card];
  if (rng.nextInt(2) === 0) {
    let list = borders.get(s);
    if (!list) {
      list = borderClasses(s);
      borders.set(s, list);
    }
    const cls = list[rng.nextInt(list.length)]!;
    const combos = classCombos(cls);
    cards = combos[rng.nextInt(combos.length)]!;
  } else {
    const deck = shuffledDeck(rng);
    cards = [deck[0]!, deck[1]!];
  }
  const handClass = handClassOf(cards[0], cards[1]);
  const raise = classWeight(rangeActions(RFI_RANGES[s]!).raise!, handClass);
  return { seat: s, cards, handClass, raise };
}

/** Whether a move matches the range; a hand played part of the time accepts both moves. */
export function checkPreflop(q: PreflopQuestion, move: 'raise' | 'fold'): { correct: boolean; mixed: boolean } {
  const mixed = q.raise > 0.01 && q.raise < 0.99;
  if (mixed) return { correct: true, mixed };
  return { correct: (q.raise >= 0.5) === (move === 'raise'), mixed };
}

export type ChoiceQuestion = {
  /** Answer options as numbers (percents or counts). */
  options: number[];
  /** Index of the right option. */
  answer: number;
};

/** Options around a right value: the value and three different wrong ones, shuffled. */
function choices(rng: Rng, right: number, pool: number[]): ChoiceQuestion {
  const wrong = shuffle(
    pool.filter((v) => v !== right),
    rng,
  ).slice(0, 3);
  const options = shuffle([right, ...wrong], rng);
  return { options, answer: options.indexOf(right) };
}

export type PotOddsQuestion = ChoiceQuestion & {
  pot: number;
  bet: number;
  /** Equity a call needs, in whole percents. */
  need: number;
};

const BET_SHARES = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.5, 2];
const NEEDS = [14, 17, 20, 25, 29, 30, 33, 38, 40, 45, 50];

/** The pot and a bet: how much equity does a call need? bet / (pot + 2 × bet). */
export function potOddsQuestion(rng: Rng): PotOddsQuestion {
  const pot = (2 + rng.nextInt(19)) * 50;
  const share = BET_SHARES[rng.nextInt(BET_SHARES.length)]!;
  const bet = Math.round((pot * share) / 10) * 10;
  const need = Math.round((bet / (pot + 2 * bet)) * 100);
  return { pot, bet, need, ...choices(rng, need, NEEDS.filter((n) => Math.abs(n - need) >= 3)) };
}

export type OutsQuestion = ChoiceQuestion & {
  hole: [Card, Card];
  board: Card[];
  /** Cards that make a straight or better on the turn. */
  outs: Card[];
};

/** Unseen cards that turn the hand into a straight, a flush or better. */
export function drawOuts(hole: readonly Card[], board: readonly Card[]): Card[] {
  const seen = new Set<Card>([...hole, ...board]);
  const out: Card[] = [];
  for (let c = 0; c < 52; c++) {
    if (seen.has(c)) continue;
    if (categoryOf(evaluate([...hole, ...board, c])) >= HandCategory.Straight) out.push(c);
  }
  return out;
}

/** A flop where you have a draw: count the outs to a straight or a flush. */
export function outsQuestion(rng: Rng): OutsQuestion {
  for (let tries = 0; tries < 5000; tries++) {
    const deck = shuffledDeck(rng);
    const hole: [Card, Card] = [deck[0]!, deck[1]!];
    const board = deck.slice(2, 5);
    if (categoryOf(evaluate([...hole, ...board])) >= HandCategory.Straight) continue;
    const outs = drawOuts(hole, board);
    if (outs.length < 4 || outs.length > 15) continue;
    const n = outs.length;
    return { hole, board, outs, ...choices(rng, n, [4, 6, 8, 9, 10, 12, 15, n + 1, n - 1].filter((v, i, a) => v > 0 && a.indexOf(v) === i)) };
  }
  throw new Error('No draw found');
}

export type ShowdownQuestion = {
  board: Card[];
  hands: [[Card, Card], [Card, Card]];
  /** 0 or 1: that hand wins; 2: a split pot. */
  winner: 0 | 1 | 2;
};

/** Two hands on a full board: which one wins? Mostly hands of the same kind, where kickers decide. */
export function showdownQuestion(rng: Rng): ShowdownQuestion {
  let fallback: ShowdownQuestion | null = null;
  for (let tries = 0; tries < 200; tries++) {
    const deck = shuffledDeck(rng);
    const board = deck.slice(0, 5);
    const hands: [[Card, Card], [Card, Card]] = [
      [deck[5]!, deck[6]!],
      [deck[7]!, deck[8]!],
    ];
    const a = evaluate([...hands[0], ...board]);
    const b = evaluate([...hands[1], ...board]);
    const q: ShowdownQuestion = { board, hands, winner: a > b ? 0 : b > a ? 1 : 2 };
    fallback ??= q;
    // Same category makes the question worth asking; otherwise keep looking for a while.
    if (categoryOf(a) === categoryOf(b) || rng.nextInt(4) === 0) return q;
  }
  return fallback!;
}
