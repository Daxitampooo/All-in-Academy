import {
  createSeededRng,
  handEquity,
  rangeEquity,
  type Card,
  type EquityResult,
  type Holding,
  type Rng,
} from '@pokerall/poker-engine';
import { getRandomBytes } from 'expo-crypto';

/** Runouts checked exactly when there are at most this many; otherwise sampled. */
const EXACT_LIMIT = 60_000;
/** Samples for Monte Carlo, split into small batches so the screen stays responsive. */
export const EQUITY_SAMPLES = 60_000;
const BATCH = 2_500;

export type EquityProgress = { result: EquityResult; done: number; total: number };

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function merge(a: EquityResult | null, b: EquityResult): EquityResult {
  if (!a) return b;
  const n = a.samples + b.samples;
  const mix = (x: number[], y: number[]) => x.map((v, i) => (v * a.samples + y[i]! * b.samples) / n);
  return { win: mix(a.win, b.win), tie: mix(a.tie, b.tie), equity: mix(a.equity, b.equity), samples: n, exact: false };
}

function binomial(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/**
 * Equity of every player, worked out in batches between frames. Known hands with few runouts left are counted
 * exactly; everything else is sampled. `onProgress` gets the running result; `isCancelled` stops early.
 */
export async function runEquity(
  holdings: Holding[],
  board: Card[],
  dead: Card[],
  onProgress: (p: EquityProgress) => void,
  isCancelled: () => boolean,
): Promise<EquityResult | null> {
  const allKnown = holdings.every((h) => 'cards' in h);
  if (allKnown) {
    const used = holdings.length * 2 + board.length + dead.length;
    const runouts = binomial(52 - used, 5 - board.length);
    if (runouts <= EXACT_LIMIT) {
      await nextTick();
      if (isCancelled()) return null;
      const hands = holdings.map((h) => ('cards' in h ? h.cards : [0, 0]));
      const result = handEquity(hands, board, { dead, exactLimit: EXACT_LIMIT });
      onProgress({ result, done: 1, total: 1 });
      return result;
    }
  }
  const rng: Rng = createSeededRng(getRandomBytes(32));
  let total: EquityResult | null = null;
  const batches = Math.ceil(EQUITY_SAMPLES / BATCH);
  for (let b = 0; b < batches; b++) {
    await nextTick();
    if (isCancelled()) return null;
    const part = allKnown
      ? handEquity(
          holdings.map((h) => ('cards' in h ? h.cards : [0, 0])),
          board,
          { dead, exactLimit: 0, iterations: BATCH, rng },
        )
      : rangeEquity(holdings, board, { dead, iterations: BATCH, rng });
    total = merge(total, part);
    onProgress({ result: total, done: b + 1, total: batches });
  }
  return total;
}
