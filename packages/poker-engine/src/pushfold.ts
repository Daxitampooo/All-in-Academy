import { PREFLOP_EQUITY_PERMILLE } from './preflopEquity';
import { classCombos, comboIndex, emptyRange, gridClass, type HandClass, type Range } from './ranges';

/**
 * Push/fold equilibrium for short stacks: the first player in goes all-in or folds, the players behind call
 * or fold. Hands are the 169 starting-hand classes in grid order (row × 13 + column, as on the 13×13 matrix).
 *
 * Model (the usual one for push/fold charts):
 * - all stacks are equal (the effective stack), blinds 0.5 and 1, an ante from every player;
 * - only one player calls: players behind a caller fold (overcalls are rare and ignored);
 * - equities are all-in preflop equities of hand classes with card removal between the two hands.
 * Solved by fictitious play: both sides keep answering the other's average strategy until it settles.
 */

export const CLASS_COUNT = 169;

export type PushFoldSpot = {
  /** Players dealt in, 2–9. */
  players: number;
  /** Players left to act behind the pusher: 1 is the small blind against the big blind. */
  behind: number;
  /** Effective stack in big blinds before posting blinds and antes. */
  stack: number;
  /** Ante of every player, in big blinds. */
  ante: number;
};

export type PushFoldSolution = {
  spot: PushFoldSpot;
  /** Push frequency per class, 0 or 1 (borderline hands may be mixed). */
  push: Float32Array;
  /** Call frequency per class for each player behind, in the order they act (the last is the big blind). */
  calls: Float32Array[];
  /** EV of pushing minus EV of folding per class, in big blinds. */
  pushGain: Float32Array;
  /** EV of calling minus EV of folding per class for each player behind, in big blinds. */
  callGain: Float32Array[];
};

let equityMatrix: Float32Array | null = null;
let compatMatrix: Uint8Array | null = null;
let classComboCount: Uint8Array | null = null;

function pairIndex(i: number, j: number): number {
  return i * CLASS_COUNT - (i * (i + 1)) / 2 + (j - i - 1);
}

/** Equity of class i all-in preflop against class j. */
export function classEquity(i: number, j: number): number {
  if (i === j) return 0.5;
  return i < j ? PREFLOP_EQUITY_PERMILLE[pairIndex(i, j)]! / 1000 : 1 - PREFLOP_EQUITY_PERMILLE[pairIndex(j, i)]! / 1000;
}

function tables() {
  if (equityMatrix && compatMatrix && classComboCount) return { eq: equityMatrix, compat: compatMatrix, count: classComboCount };
  const n = CLASS_COUNT;
  const eq = new Float32Array(n * n);
  const compat = new Uint8Array(n * n);
  const count = new Uint8Array(n);
  const combos = Array.from({ length: n }, (_, i) => classCombos(gridClass(Math.floor(i / 13), i % 13)));
  for (let i = 0; i < n; i++) {
    count[i] = combos[i]!.length;
    // All combos of a class are the same up to suits, so one is enough to count what the other hand can hold.
    const [a, b] = combos[i]![0]!;
    for (let j = 0; j < n; j++) {
      eq[i * n + j] = classEquity(i, j);
      let k = 0;
      for (const [c, d] of combos[j]!) if (c !== a && c !== b && d !== a && d !== b) k++;
      compat[i * n + j] = k;
    }
  }
  equityMatrix = eq;
  compatMatrix = compat;
  classComboCount = count;
  return { eq, compat, count };
}

/** Big blinds each player behind has already posted: the last is the big blind, the one before it the small blind. */
function postedBehind(behind: number): number[] {
  return Array.from({ length: behind }, (_, j) => (j === behind - 1 ? 1 : j === behind - 2 ? 0.5 : 0));
}

export function checkSpot(spot: PushFoldSpot): void {
  const { players, behind, stack, ante } = spot;
  if (!Number.isInteger(players) || players < 2 || players > 9) throw new Error('Players must be 2 to 9');
  if (!Number.isInteger(behind) || behind < 1 || behind > players - 1) throw new Error('Bad number of players behind');
  if (!(stack >= 1 && stack <= 100)) throw new Error('Stack must be 1 to 100 BB');
  if (!(ante >= 0 && ante <= 1)) throw new Error('Ante must be 0 to 1 BB');
}

/** Iterations that settle the ranges well enough for charts. */
export const PUSH_FOLD_ITERATIONS = 150;

/**
 * Push/fold solver that runs in steps, so an app can spread the work over several frames and keep the
 * screen responsive. `solvePushFold` runs it to the end at once.
 */
export class PushFoldSolver {
  readonly spot: PushFoldSpot;
  private readonly heroFold: number;
  private readonly allFold: number;
  private readonly pots: number[];
  private readonly callerFold: number[];
  private readonly push: Float32Array;
  private readonly calls: Float32Array[];
  private readonly pushGain: Float32Array;
  private readonly callGain: Float32Array[];
  private t = 0;

  constructor(
    spot: PushFoldSpot,
    readonly iterations = PUSH_FOLD_ITERATIONS,
  ) {
    checkSpot(spot);
    this.spot = spot;
    const { players, behind, stack: S, ante: A } = spot;
    const heroBlind = behind === 1 ? 0.5 : 0;
    const posted = postedBehind(behind);
    this.heroFold = -(heroBlind + A);
    this.allFold = 1.5 + players * A - heroBlind - A;
    this.pots = posted.map((b) => 2 * S + (1.5 - heroBlind - b) + (players - 2) * A);
    this.callerFold = posted.map((b) => -(b + A));
    this.push = new Float32Array(CLASS_COUNT).fill(1);
    this.calls = posted.map(() => new Float32Array(CLASS_COUNT).fill(0.5));
    this.pushGain = new Float32Array(CLASS_COUNT);
    this.callGain = posted.map(() => new Float32Array(CLASS_COUNT));
  }

  get done(): boolean {
    return this.t >= this.iterations;
  }

  /** Share of the work done, 0..1. */
  get progress(): number {
    return Math.min(1, this.t / this.iterations);
  }

  /** Runs up to `count` more iterations. */
  run(count: number): void {
    const n = CLASS_COUNT;
    for (let k = 0; k < count && this.t < this.iterations; k++) {
      this.t++;
      const step = 1 / (this.t + 1);
      this.bestPush();
      for (let j = 0; j < this.calls.length; j++) this.bestCall(j);
      for (let h = 0; h < n; h++) this.push[h]! += ((this.pushGain[h]! > 0 ? 1 : 0) - this.push[h]!) * step;
      for (let j = 0; j < this.calls.length; j++) {
        const c = this.calls[j]!;
        const g = this.callGain[j]!;
        for (let x = 0; x < n; x++) c[x]! += ((g[x]! > 0 ? 1 : 0) - c[x]!) * step;
      }
    }
  }

  /** Clean ranges: the best answer of each side to the other side's settled strategy. */
  solution(): PushFoldSolution {
    this.bestPush();
    for (let j = 0; j < this.calls.length; j++) this.bestCall(j);
    return {
      spot: this.spot,
      push: Float32Array.from(this.pushGain, (g) => (g > 0 ? 1 : 0)),
      calls: this.callGain.map((g) => Float32Array.from(g, (v) => (v > 0 ? 1 : 0))),
      pushGain: Float32Array.from(this.pushGain),
      callGain: this.callGain.map((g) => Float32Array.from(g)),
    };
  }

  private bestPush(): void {
    const { eq, compat } = tables();
    const n = CLASS_COUNT;
    const S = this.spot.stack;
    for (let h = 0; h < n; h++) {
      let reachAll = 1;
      let ev = 0;
      for (let j = 0; j < this.calls.length; j++) {
        const c = this.calls[j]!;
        const pot = this.pots[j]!;
        let mass = 0;
        let callEv = 0;
        for (let x = 0; x < n; x++) {
          const w = c[x]! * compat[h * n + x]!;
          if (w === 0) continue;
          mass += w;
          callEv += w * (eq[h * n + x]! * pot - S);
        }
        // 1225 = the two-card hands left once the pusher's two cards are known.
        ev += reachAll * (callEv / 1225);
        reachAll *= 1 - mass / 1225;
      }
      ev += reachAll * this.allFold;
      this.pushGain[h] = ev - this.heroFold;
    }
  }

  private bestCall(j: number): void {
    const { eq, compat } = tables();
    const n = CLASS_COUNT;
    const S = this.spot.stack;
    const pot = this.pots[j]!;
    const out = this.callGain[j]!;
    for (let x = 0; x < n; x++) {
      let mass = 0;
      let ev = 0;
      for (let h = 0; h < n; h++) {
        // How likely the pusher holds class h once the caller's cards are known.
        const w = this.push[h]! * compat[x * n + h]!;
        if (w === 0) continue;
        mass += w;
        ev += w * ((1 - eq[h * n + x]!) * pot - S);
      }
      out[x] = mass > 0 ? ev / mass - this.callerFold[j]! : -Infinity;
    }
  }
}

export function solvePushFold(spot: PushFoldSpot, iterations = PUSH_FOLD_ITERATIONS): PushFoldSolution {
  const solver = new PushFoldSolver(spot, iterations);
  solver.run(iterations);
  return solver.solution();
}

/** Class index on the 13×13 grid. */
export function classIndex(cls: HandClass): number {
  for (let i = 0; i < CLASS_COUNT; i++) if (gridClass(Math.floor(i / 13), i % 13) === cls) return i;
  throw new Error(`Unknown hand class ${cls}`);
}

export function classAt(index: number): HandClass {
  return gridClass(Math.floor(index / 13), index % 13);
}

/** Turns per-class frequencies into a 1326-combo range for the range matrix. */
export function classRange(weights: Float32Array): Range {
  const range = emptyRange();
  for (let i = 0; i < CLASS_COUNT; i++) {
    const w = weights[i]!;
    if (w <= 0) continue;
    for (const [a, b] of classCombos(classAt(i))) range[comboIndex(a, b)] = w;
  }
  return range;
}

/** Share of all 1326 hands in per-class frequencies. */
export function classShare(weights: Float32Array): number {
  const { count } = tables();
  let sum = 0;
  for (let i = 0; i < CLASS_COUNT; i++) sum += weights[i]! * count[i]!;
  return sum / 1326;
}
