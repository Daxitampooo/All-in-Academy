import { evaluate, handClassOf, rankOf, straightHigh, suitOf, type Card, type Rng } from '@pokerall/poker-engine';

import { PREFLOP_TABLE } from './preflop-table';

export type PreflopStrength = {
  /** Hand class such as "AKs". */
  handClass: string;
  /** All-in equity against one random hand. */
  equity: number;
  /** Share of all starting combos at least this strong: 0.01 is top 1%, 0.9 is trash. */
  percentile: number;
};

export function preflopStrength(hole: readonly [Card, Card]): PreflopStrength {
  const handClass = handClassOf(hole[0], hole[1]);
  const row = PREFLOP_TABLE[handClass];
  if (!row) throw new Error(`No preflop data for ${handClass}`);
  return { handClass, equity: row[0], percentile: row[1] };
}

export type HandFeatures = {
  /** A pocket pair, or a hole card pairs the board. */
  pairWithHole: boolean;
  /** Four to a flush that uses a hole card, with cards still to come. */
  flushDraw: boolean;
  /** Ranks that would complete a straight using a hole card: 1 = gutshot, 2 = open-ended. */
  straightDrawRanks: number;
  /** Both hole cards are above every board card. */
  overcards: boolean;
};

export function handFeatures(hole: readonly [Card, Card], board: readonly Card[]): HandFeatures {
  const boardRanks = board.map(rankOf);
  const pocketPair = rankOf(hole[0]) === rankOf(hole[1]);
  const pairWithHole = pocketPair || hole.some((c) => boardRanks.includes(rankOf(c)));
  const drawing = board.length >= 3 && board.length < 5;

  let flushDraw = false;
  if (drawing) {
    for (let s = 0; s < 4; s++) {
      const count = [...hole, ...board].filter((c) => suitOf(c) === s).length;
      if (count === 4 && hole.some((c) => suitOf(c) === s)) flushDraw = true;
    }
  }

  let straightDrawRanks = 0;
  if (drawing) {
    const boardMask = boardRanks.reduce((m, r) => m | (1 << r), 0);
    const mask = hole.reduce((m, c) => m | (1 << rankOf(c)), boardMask);
    if (straightHigh(mask) < 0) {
      for (let r = 0; r < 13; r++) {
        if (mask & (1 << r)) continue;
        const withHole = straightHigh(mask | (1 << r)) >= 0;
        const boardOnly = straightHigh(boardMask | (1 << r)) >= 0;
        if (withHole && !boardOnly) straightDrawRanks++;
      }
    }
  }

  const topBoard = boardRanks.length ? Math.max(...boardRanks) : -1;
  const overcards = board.length > 0 && hole.every((c) => rankOf(c) > topBoard);
  return { pairWithHole, flushDraw, straightDrawRanks, overcards };
}

/**
 * Monte Carlo share of the pot against `opponents` random hands: random hole
 * cards for each opponent and a random runout. Fast enough for many decisions per second.
 */
export function estimateEquity(
  hole: readonly [Card, Card],
  board: readonly Card[],
  opponents: number,
  samples: number,
  rng: Rng,
): number {
  if (opponents < 1) return 1;
  const used = new Uint8Array(52);
  for (const c of hole) used[c] = 1;
  for (const c of board) used[c] = 1;
  const deck: Card[] = [];
  for (let c = 0; c < 52; c++) if (!used[c]) deck.push(c);

  const missing = 5 - board.length;
  const need = opponents * 2 + missing;
  const full: Card[] = [...board];
  const mine: Card[] = [hole[0], hole[1], 0, 0, 0, 0, 0];
  const theirs: Card[] = [0, 0, 0, 0, 0, 0, 0];
  let score = 0;

  for (let it = 0; it < samples; it++) {
    for (let i = 0; i < need; i++) {
      const j = i + rng.nextInt(deck.length - i);
      const t = deck[i]!;
      deck[i] = deck[j]!;
      deck[j] = t;
    }
    full.length = board.length;
    for (let i = 0; i < missing; i++) full.push(deck[opponents * 2 + i]!);
    for (let i = 0; i < 5; i++) {
      mine[2 + i] = full[i]!;
      theirs[2 + i] = full[i]!;
    }
    const my = evaluate(mine);
    let best = -1;
    let tiedWithBest = 0;
    for (let o = 0; o < opponents; o++) {
      theirs[0] = deck[o * 2]!;
      theirs[1] = deck[o * 2 + 1]!;
      const v = evaluate(theirs);
      if (v > best) {
        best = v;
        tiedWithBest = 1;
      } else if (v === best) tiedWithBest++;
    }
    if (my > best) score += 1;
    else if (my === best) score += 1 / (tiedWithBest + 1);
  }
  return score / samples;
}
