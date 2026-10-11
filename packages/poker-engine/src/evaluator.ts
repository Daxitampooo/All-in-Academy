import type { Card } from './cards';

/**
 * Hand strength as one integer: a bigger number is a better hand, equal
 * numbers are a split. Layout: category in bits 20+, then up to five ranks
 * (4 bits each) that break ties inside the category, most important first.
 */
export type HandValue = number;

export const HandCategory = {
  HighCard: 0,
  Pair: 1,
  TwoPair: 2,
  Trips: 3,
  Straight: 4,
  Flush: 5,
  FullHouse: 6,
  Quads: 7,
  StraightFlush: 8,
} as const;
export type HandCategory = (typeof HandCategory)[keyof typeof HandCategory];

/** Stable ids for translations: `hands.<id>` in the app's locale files. */
export const categoryIds = [
  'high-card',
  'pair',
  'two-pair',
  'trips',
  'straight',
  'flush',
  'full-house',
  'quads',
  'straight-flush',
] as const;
export type CategoryId = (typeof categoryIds)[number] | 'royal-flush';

const CATEGORY_SHIFT = 20;

function pack(category: number, r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0): HandValue {
  return (category << CATEGORY_SHIFT) | (r1 << 16) | (r2 << 12) | (r3 << 8) | (r4 << 4) | r5;
}

/** Highest card of a straight inside a 13-bit rank mask, or -1. Wheel (A-2-3-4-5) is 3. */
export function straightHigh(mask: number): number {
  for (let hi = 12; hi >= 4; hi--) {
    if (((mask >> (hi - 4)) & 0x1f) === 0x1f) return hi;
  }
  return (mask & 0x100f) === 0x100f ? 3 : -1;
}

function popcount(v: number): number {
  let n = 0;
  while (v) {
    v &= v - 1;
    n++;
  }
  return n;
}

/** The `count` highest ranks in a mask, excluding `skip` bits, highest first. */
function topRanks(mask: number, count: number): number[] {
  const out: number[] = [];
  for (let r = 12; r >= 0 && out.length < count; r--) if (mask & (1 << r)) out.push(r);
  return out;
}

// Scratch buffer reused between calls: evaluation runs millions of times in equity loops.
const counts = new Uint8Array(13);

/** Evaluates the best five-card hand out of 5, 6 or 7 cards. */
export function evaluate(cards: readonly Card[]): HandValue {
  const n = cards.length;
  if (n < 5 || n > 7) throw new Error(`Need 5 to 7 cards, got ${n}`);

  counts.fill(0);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let rankMask = 0;
  for (let i = 0; i < n; i++) {
    const c = cards[i]!;
    const r = c >> 2;
    const bit = 1 << r;
    switch (c & 3) {
      case 0:
        s0 |= bit;
        break;
      case 1:
        s1 |= bit;
        break;
      case 2:
        s2 |= bit;
        break;
      default:
        s3 |= bit;
    }
    counts[r]!++;
    rankMask |= bit;
  }

  // With at most 7 cards, five of one suit rules out quads and full houses,
  // so a flush or straight flush is already the best hand.
  for (const suitMask of [s0, s1, s2, s3]) {
    if (popcount(suitMask) >= 5) {
      const sf = straightHigh(suitMask);
      if (sf >= 0) return pack(HandCategory.StraightFlush, sf);
      const [a, b, c, d, e] = topRanks(suitMask, 5);
      return pack(HandCategory.Flush, a, b, c, d, e);
    }
  }

  let quad = -1;
  let trip1 = -1;
  let trip2 = -1;
  let pair1 = -1;
  let pair2 = -1;
  let pair3 = -1;
  for (let r = 12; r >= 0; r--) {
    const k = counts[r]!;
    if (k === 4) quad = r;
    else if (k === 3) {
      if (trip1 < 0) trip1 = r;
      else if (trip2 < 0) trip2 = r;
    } else if (k === 2) {
      if (pair1 < 0) pair1 = r;
      else if (pair2 < 0) pair2 = r;
      else if (pair3 < 0) pair3 = r;
    }
  }

  if (quad >= 0) {
    const [kicker = 0] = topRanks(rankMask & ~(1 << quad), 1);
    return pack(HandCategory.Quads, quad, kicker);
  }
  if (trip1 >= 0 && (trip2 >= 0 || pair1 >= 0)) {
    return pack(HandCategory.FullHouse, trip1, Math.max(trip2, pair1));
  }
  const straight = straightHigh(rankMask);
  if (straight >= 0) return pack(HandCategory.Straight, straight);
  if (trip1 >= 0) {
    const [k1, k2] = topRanks(rankMask & ~(1 << trip1), 2);
    return pack(HandCategory.Trips, trip1, k1, k2);
  }
  if (pair2 >= 0) {
    // A third pair can still be the kicker.
    const [kicker = 0] = topRanks(rankMask & ~(1 << pair1) & ~(1 << pair2), 1);
    return pack(HandCategory.TwoPair, pair1, pair2, kicker);
  }
  if (pair1 >= 0) {
    const [k1, k2, k3] = topRanks(rankMask & ~(1 << pair1), 3);
    return pack(HandCategory.Pair, pair1, k1, k2, k3);
  }
  const [a, b, c, d, e] = topRanks(rankMask, 5);
  return pack(HandCategory.HighCard, a, b, c, d, e);
}

export function categoryOf(value: HandValue): HandCategory {
  return (value >> CATEGORY_SHIFT) as HandCategory;
}

/** Category id for display, with a royal flush told apart from other straight flushes. */
export function categoryIdOf(value: HandValue): CategoryId {
  const category = categoryOf(value);
  if (category === HandCategory.StraightFlush && ((value >> 16) & 0xf) === 12) return 'royal-flush';
  return categoryIds[category]!;
}

/** Positive if `a` wins, negative if `b` wins, 0 for a split. */
export function compareHands(a: HandValue, b: HandValue): number {
  return a - b;
}

export type HandDescription = {
  value: HandValue;
  category: HandCategory;
  categoryId: CategoryId;
  /** The five cards that make the hand, strongest first. */
  bestFive: Card[];
};

/** Full description for display. Slower than `evaluate`; use it for showdowns, not simulations. */
export function describeHand(cards: readonly Card[]): HandDescription {
  const value = evaluate(cards);
  let best: Card[] = cards.slice(0, 5);
  if (cards.length > 5) {
    const n = cards.length;
    search: for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++)
        for (let c = b + 1; c < n; c++)
          for (let d = c + 1; d < n; d++)
            for (let e = d + 1; e < n; e++) {
              const five = [cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!];
              if (evaluate(five) === value) {
                best = five;
                break search;
              }
            }
  }
  return {
    value,
    category: categoryOf(value),
    categoryId: categoryIdOf(value),
    bestFive: orderBestFive(best, value),
  };
}

/** Orders five cards the way players read them: groups first, then by rank (wheel ends with the ace). */
function orderBestFive(five: Card[], value: HandValue): Card[] {
  const freq = new Map<number, number>();
  for (const c of five) freq.set(c >> 2, (freq.get(c >> 2) ?? 0) + 1);
  const category = categoryOf(value);
  const isWheel =
    (category === HandCategory.Straight || category === HandCategory.StraightFlush) &&
    ((value >> 16) & 0xf) === 3;
  const rankKey = (c: Card) => (isWheel && c >> 2 === 12 ? -1 : c >> 2);
  return five
    .slice()
    .sort((x, y) => freq.get(y >> 2)! - freq.get(x >> 2)! || rankKey(y) - rankKey(x) || (y & 3) - (x & 3));
}
