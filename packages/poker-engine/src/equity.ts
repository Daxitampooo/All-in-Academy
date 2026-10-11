import { assertDistinct, type Card } from './cards';
import { evaluate } from './evaluator';
import type { WeightedCombo } from './ranges';
import type { Rng } from './rng';

export type EquityResult = {
  /** Share of runouts each player wins outright. */
  win: number[];
  /** Share of runouts each player splits. */
  tie: number[];
  /** Expected share of the pot: wins plus split shares. */
  equity: number[];
  /** Number of runouts examined. */
  samples: number;
  /** True when every possible runout was checked (no sampling error). */
  exact: boolean;
};

export type EquityOptions = {
  /** Cards known to be out of play (folded or seen). */
  dead?: Card[];
  /** Check every runout when there are at most this many (default 100 000). */
  exactLimit?: number;
  /** Runouts to sample otherwise (default 20 000). */
  iterations?: number;
  /** Required for sampling. */
  rng?: Rng;
};

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** Scores one runout: adds 1 to `win` for a sole winner, or a split share to `tie`/`share`. */
function scoreRunout(hands: Card[][], board: Card[], win: number[], tie: number[], share: number[], buf: Card[]): void {
  let best = -1;
  let winners = 0;
  const values: number[] = [];
  for (let i = 0; i < hands.length; i++) {
    const h = hands[i]!;
    buf.length = 0;
    buf.push(h[0]!, h[1]!, ...board);
    const v = evaluate(buf);
    values.push(v);
    if (v > best) {
      best = v;
      winners = 1;
    } else if (v === best) winners++;
  }
  for (let i = 0; i < hands.length; i++) {
    if (values[i] !== best) continue;
    if (winners === 1) win[i]!++;
    else {
      tie[i]!++;
      share[i]! += 1 / winners;
    }
  }
}

/**
 * Equity of known hands (two cards each) on a board of 0, 3, 4 or 5 cards.
 * Exact when the number of runouts is small enough, Monte Carlo otherwise.
 */
export function handEquity(hands: Card[][], board: Card[] = [], options: EquityOptions = {}): EquityResult {
  if (hands.length < 2) throw new Error('Equity needs at least two hands');
  for (const h of hands) if (h.length !== 2) throw new Error('Each hand must have two cards');
  if (![0, 3, 4, 5].includes(board.length)) throw new Error('Board must have 0, 3, 4 or 5 cards');
  const dead = options.dead ?? [];
  const used = [...hands.flat(), ...board, ...dead];
  assertDistinct(used);

  const taken = new Uint8Array(52);
  for (const c of used) taken[c] = 1;
  const stub: Card[] = [];
  for (let c = 0; c < 52; c++) if (!taken[c]) stub.push(c);

  const need = 5 - board.length;
  const n = hands.length;
  const win = new Array<number>(n).fill(0);
  const tie = new Array<number>(n).fill(0);
  const share = new Array<number>(n).fill(0);
  const buf: Card[] = [];
  const runout: Card[] = board.slice();

  const total = binomial(stub.length, need);
  const exactLimit = options.exactLimit ?? 100_000;
  let samples = 0;
  let exact = false;

  if (total <= exactLimit) {
    exact = true;
    const idx = Array.from({ length: need }, (_, i) => i);
    const m = stub.length;
    for (;;) {
      runout.length = board.length;
      for (const i of idx) runout.push(stub[i]!);
      scoreRunout(hands, runout, win, tie, share, buf);
      samples++;
      // next combination of `need` indexes out of m
      let k = need - 1;
      while (k >= 0 && idx[k] === m - need + k) k--;
      if (k < 0) break;
      idx[k]!++;
      for (let j = k + 1; j < need; j++) idx[j] = idx[j - 1]! + 1;
    }
  } else {
    const rng = options.rng;
    if (!rng) throw new Error('Sampling needs an rng');
    const iterations = options.iterations ?? 20_000;
    const pool = stub.slice();
    for (let it = 0; it < iterations; it++) {
      // Partial Fisher–Yates: the first `need` cards become a random runout.
      for (let i = 0; i < need; i++) {
        const j = i + rng.nextInt(pool.length - i);
        const t = pool[i]!;
        pool[i] = pool[j]!;
        pool[j] = t;
      }
      runout.length = board.length;
      for (let i = 0; i < need; i++) runout.push(pool[i]!);
      scoreRunout(hands, runout, win, tie, share, buf);
    }
    samples = iterations;
  }

  return {
    win: win.map((w) => w / samples),
    tie: tie.map((t) => t / samples),
    equity: win.map((w, i) => (w + share[i]!) / samples),
    samples,
    exact,
  };
}

/** A player's holding: known cards or a weighted range of combos. */
export type Holding = { cards: [Card, Card] } | { range: WeightedCombo[] };

/**
 * Equity when some players hold ranges: each sample draws a combo for every
 * range (by weight, avoiding card conflicts) and a random runout.
 */
export function rangeEquity(
  holdings: Holding[],
  board: Card[] = [],
  options: EquityOptions & { rng: Rng },
): EquityResult {
  if (holdings.length < 2) throw new Error('Equity needs at least two players');
  if (![0, 3, 4, 5].includes(board.length)) throw new Error('Board must have 0, 3, 4 or 5 cards');
  const dead = options.dead ?? [];
  const fixed = holdings.flatMap((h) => ('cards' in h ? h.cards : []));
  assertDistinct([...fixed, ...board, ...dead]);

  const rng = options.rng;
  const iterations = options.iterations ?? 20_000;
  const n = holdings.length;
  const win = new Array<number>(n).fill(0);
  const tie = new Array<number>(n).fill(0);
  const share = new Array<number>(n).fill(0);
  const buf: Card[] = [];

  const baseTaken = new Uint8Array(52);
  for (const c of [...fixed, ...board, ...dead]) baseTaken[c] = 1;

  // Cumulative weights for fast weighted sampling.
  const tables = holdings.map((h) => {
    if ('cards' in h) return null;
    const combos = h.range.filter((c) => c.weight > 0 && !baseTaken[c.cards[0]] && !baseTaken[c.cards[1]]);
    if (combos.length === 0) throw new Error('A range has no combos left after removing known cards');
    const cumulative: number[] = [];
    let sum = 0;
    for (const c of combos) cumulative.push((sum += c.weight));
    return { combos, cumulative, sum };
  });

  const taken = new Uint8Array(52);
  const hands: Card[][] = holdings.map(() => [0, 0]);
  const runout: Card[] = [];
  let samples = 0;
  let attempts = 0;
  const maxAttempts = iterations * 50;

  while (samples < iterations && attempts < maxAttempts) {
    attempts++;
    taken.set(baseTaken);
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      const h = holdings[i]!;
      if ('cards' in h) {
        hands[i] = h.cards;
        continue;
      }
      const t = tables[i]!;
      const x = (rng.nextInt(1 << 30) / (1 << 30)) * t.sum;
      let lo = 0;
      let hi = t.cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (t.cumulative[mid]! > x) hi = mid;
        else lo = mid + 1;
      }
      const [a, b] = t.combos[lo]!.cards;
      if (taken[a] || taken[b]) ok = false;
      else {
        taken[a] = 1;
        taken[b] = 1;
        hands[i] = [a, b];
      }
    }
    if (!ok) continue;

    runout.length = 0;
    runout.push(...board);
    while (runout.length < 5) {
      const c = rng.nextInt(52);
      if (taken[c]) continue;
      taken[c] = 1;
      runout.push(c);
    }
    scoreRunout(hands, runout, win, tie, share, buf);
    samples++;
  }
  if (samples === 0) throw new Error('Ranges conflict with each other on every sample');

  return {
    win: win.map((w) => w / samples),
    tie: tie.map((t) => t / samples),
    equity: win.map((w, i) => (w + share[i]!) / samples),
    samples,
    exact: false,
  };
}
