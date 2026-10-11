import { RANKS, cardToString, makeCard, parseCard, rankOf, suitOf, type Card } from './cards';

/**
 * A range: a weight from 0 to 1 for each of the 1326 two-card combos.
 * Index of a combo (a < b) is b * (b - 1) / 2 + a.
 */
export type Range = Float32Array;

export const COMBO_COUNT = 1326;

export function comboIndex(a: Card, b: Card): number {
  if (a === b) throw new Error('A combo needs two different cards');
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return (hi * (hi - 1)) / 2 + lo;
}

const COMBO_HI = new Uint8Array(1326);
const COMBO_LO = new Uint8Array(1326);
for (let hi = 1; hi < 52; hi++) {
  for (let lo = 0; lo < hi; lo++) {
    const i = (hi * (hi - 1)) / 2 + lo;
    COMBO_HI[i] = hi;
    COMBO_LO[i] = lo;
  }
}

/** The two cards of a combo index, higher card first. */
export function comboCards(index: number): [Card, Card] {
  if (!Number.isInteger(index) || index < 0 || index >= 1326) throw new Error(`Bad combo index ${index}`);
  return [COMBO_HI[index]!, COMBO_LO[index]!];
}

export function emptyRange(): Range {
  return new Float32Array(COMBO_COUNT);
}

/** Hand class such as "AA", "AKs", "T9o". */
export type HandClass = string;

/** Rank characters from ace down: the order of rows and columns in the 13×13 grid. */
const GRID_RANKS = 'AKQJT98765432';

/**
 * Hand class in the 13×13 grid cell. Rows and columns go from ace to deuce;
 * pairs are on the diagonal, suited hands above it, offsuit below.
 */
export function gridClass(row: number, col: number): HandClass {
  const a = GRID_RANKS[row]!;
  const b = GRID_RANKS[col]!;
  if (row === col) return a + b;
  return row < col ? a + b + 's' : b + a + 'o';
}

/** Grid cell of a hand class. */
export function classCell(cls: HandClass): { row: number; col: number } {
  const { high, low, kind } = splitClass(cls);
  const r1 = 12 - high;
  const r2 = 12 - low;
  if (kind === 'pair') return { row: r1, col: r1 };
  return kind === 'suited' ? { row: r1, col: r2 } : { row: r2, col: r1 };
}

type ClassParts = { high: number; low: number; kind: 'pair' | 'suited' | 'offsuit' | 'any' };

function splitClass(cls: string): ClassParts {
  const m = /^([2-9TJQKA])([2-9TJQKA])([so]?)$/i.exec(cls.trim());
  if (!m) throw new Error(`Can't read hand "${cls}"`);
  let high = RANKS.indexOf(m[1]!.toUpperCase());
  let low = RANKS.indexOf(m[2]!.toUpperCase());
  if (low > high) [high, low] = [low, high];
  const suffix = m[3]!.toLowerCase();
  if (high === low) {
    if (suffix) throw new Error(`A pair can't be suited or offsuit: "${cls}"`);
    return { high, low, kind: 'pair' };
  }
  return { high, low, kind: suffix === 's' ? 'suited' : suffix === 'o' ? 'offsuit' : 'any' };
}

function classOf(high: number, low: number, kind: 'pair' | 'suited' | 'offsuit'): HandClass {
  if (kind === 'pair') return RANKS[high]! + RANKS[high]!;
  return RANKS[high]! + RANKS[low]! + (kind === 'suited' ? 's' : 'o');
}

/** All combos of a hand class: 6 for a pair, 4 suited, 12 offsuit. */
export function classCombos(cls: HandClass): [Card, Card][] {
  const { high, low, kind } = splitClass(cls);
  const out: [Card, Card][] = [];
  for (let s1 = 0; s1 < 4; s1++) {
    for (let s2 = 0; s2 < 4; s2++) {
      if (kind === 'pair') {
        if (s1 < s2) out.push([makeCard(high, s1), makeCard(high, s2)]);
      } else if ((kind === 'suited' || kind === 'any') && s1 === s2) {
        out.push([makeCard(high, s1), makeCard(low, s2)]);
      } else if ((kind === 'offsuit' || kind === 'any') && s1 !== s2) {
        out.push([makeCard(high, s1), makeCard(low, s2)]);
      }
    }
  }
  return out;
}

/** Hand class of two cards, e.g. As Kd -> "AKo". */
export function handClassOf(a: Card, b: Card): HandClass {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra === rb) return classOf(ra, ra, 'pair');
  const [high, low] = ra > rb ? [ra, rb] : [rb, ra];
  return classOf(high, low, suitOf(a) === suitOf(b) ? 'suited' : 'offsuit');
}

/** Expands one token without its weight: "AA", "AKs", "22+", "ATs+", "KQ", "A5s-A2s", "TT-77", "AhKh". */
function expandToken(token: string): { classes: HandClass[]; combos: [Card, Card][] } {
  const t = token.trim();

  // A specific combo such as "AhKh".
  if (/^[2-9TJQKA][cdhs][2-9TJQKA][cdhs]$/i.test(t)) {
    const a = parseCard(t.slice(0, 2));
    const b = parseCard(t.slice(2, 4));
    if (a === b) throw new Error(`Same card twice in "${token}"`);
    return { classes: [], combos: [[a, b]] };
  }

  const kinds = (k: ClassParts['kind']): ('pair' | 'suited' | 'offsuit')[] =>
    k === 'any' ? ['suited', 'offsuit'] : [k as 'pair' | 'suited' | 'offsuit'];

  // Ranges with a dash: "TT-77" or "A5s-A2s" (same first card).
  const dash = /^(\w{2,3})-(\w{2,3})$/.exec(t);
  if (dash) {
    const a = splitClass(dash[1]!);
    const b = splitClass(dash[2]!);
    const classes: HandClass[] = [];
    if (a.kind === 'pair' && b.kind === 'pair') {
      for (let r = Math.min(a.high, b.high); r <= Math.max(a.high, b.high); r++) classes.push(classOf(r, r, 'pair'));
    } else if (a.high === b.high && a.kind === b.kind && a.kind !== 'pair') {
      for (let r = Math.min(a.low, b.low); r <= Math.max(a.low, b.low); r++) {
        for (const k of kinds(a.kind)) classes.push(classOf(a.high, r, k));
      }
    } else {
      throw new Error(`Can't read range "${token}"`);
    }
    return { classes, combos: [] };
  }

  // "22+" pairs upward, "ATs+" kicker upward up to just below the first card.
  if (t.endsWith('+')) {
    const base = splitClass(t.slice(0, -1));
    const classes: HandClass[] = [];
    if (base.kind === 'pair') {
      for (let r = base.high; r <= 12; r++) classes.push(classOf(r, r, 'pair'));
    } else {
      for (let r = base.low; r < base.high; r++) for (const k of kinds(base.kind)) classes.push(classOf(base.high, r, k));
    }
    return { classes, combos: [] };
  }

  const one = splitClass(t);
  return { classes: kinds(one.kind).map((k) => classOf(one.high, one.low, k)), combos: [] };
}

/**
 * Reads range notation used by popular poker tools:
 * "22+, A2s+, KTo+, QJs, AhKh, A5s-A2s, AKo:0.5". A weight after ":" is a
 * share (0.5) or a percentage (50). Later tokens override earlier ones.
 */
export function parseRange(text: string): Range {
  const range = emptyRange();
  const tokens = text
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const raw of tokens) {
    const [body, weightText] = raw.split(':') as [string, string | undefined];
    let weight = 1;
    if (weightText !== undefined) {
      const w = Number(weightText.replace('%', ''));
      if (!Number.isFinite(w) || w < 0) throw new Error(`Bad weight in "${raw}"`);
      weight = w > 1 || weightText.includes('%') ? w / 100 : w;
      if (weight > 1) throw new Error(`Weight above 100% in "${raw}"`);
    }
    const { classes, combos } = expandToken(body);
    for (const cls of classes) for (const [a, b] of classCombos(cls)) range[comboIndex(a, b)] = weight;
    for (const [a, b] of combos) range[comboIndex(a, b)] = weight;
  }
  return range;
}

/** Weight of a hand class: the average weight of its combos. */
export function classWeight(range: Range, cls: HandClass): number {
  const combos = classCombos(cls);
  return combos.reduce((sum, [a, b]) => sum + range[comboIndex(a, b)]!, 0) / combos.length;
}

/** The 13×13 grid of class weights, rows from ace to deuce. */
export function rangeGrid(range: Range): number[][] {
  return Array.from({ length: 13 }, (_, row) =>
    Array.from({ length: 13 }, (_, col) => classWeight(range, gridClass(row, col))),
  );
}

/** Number of combos in the range (weighted), skipping combos that use dead cards. */
export function comboCount(range: Range, dead: readonly Card[] = []): number {
  const blocked = new Uint8Array(52);
  for (const c of dead) blocked[c] = 1;
  let total = 0;
  for (let i = 0; i < COMBO_COUNT; i++) {
    const w = range[i]!;
    if (w === 0) continue;
    const [a, b] = comboCards(i);
    if (!blocked[a] && !blocked[b]) total += w;
  }
  return total;
}

/** Share of all 1326 combos that the range covers, from 0 to 1. */
export function rangeShare(range: Range): number {
  return comboCount(range) / COMBO_COUNT;
}

export type WeightedCombo = { cards: [Card, Card]; weight: number };

/** Combos with a positive weight that don't use any dead card. */
export function rangeCombos(range: Range, dead: readonly Card[] = []): WeightedCombo[] {
  const blocked = new Uint8Array(52);
  for (const c of dead) blocked[c] = 1;
  const out: WeightedCombo[] = [];
  for (let i = 0; i < COMBO_COUNT; i++) {
    const w = range[i]!;
    if (w <= 0) continue;
    const cards = comboCards(i);
    if (!blocked[cards[0]] && !blocked[cards[1]]) out.push({ cards, weight: w });
  }
  return out;
}

function weightSuffix(w: number): string {
  if (w >= 1) return '';
  return ':' + Number(w.toFixed(3)).toString();
}

/**
 * Writes a range back in compact notation: pairs as "22+" or "TT-77",
 * suited and offsuit runs as "A2s+" or "K9s-K6s", partial classes as specific combos.
 */
export function formatRange(range: Range): string {
  const tokens: string[] = [];
  const uniform = (cls: HandClass): number | null => {
    const combos = classCombos(cls);
    const first = range[comboIndex(combos[0]![0], combos[0]![1])]!;
    return combos.every(([a, b]) => Math.abs(range[comboIndex(a, b)]! - first) < 1e-6) ? first : null;
  };
  const specific: string[] = [];
  const addSpecific = (cls: HandClass) => {
    for (const [a, b] of classCombos(cls)) {
      const w = range[comboIndex(a, b)]!;
      if (w > 0) specific.push(cardToString(a) + cardToString(b) + weightSuffix(w));
    }
  };

  // Runs over a list of classes ordered from strongest to weakest.
  const emitRuns = (classes: HandClass[], topIsOpenEnded: boolean, label: (hi: HandClass, lo: HandClass, open: boolean) => string) => {
    let i = 0;
    while (i < classes.length) {
      const w = uniform(classes[i]!);
      if (w === null) {
        addSpecific(classes[i]!);
        i++;
        continue;
      }
      if (w === 0) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < classes.length && uniform(classes[j + 1]!) === w) j++;
      const open = topIsOpenEnded && i === 0 && j > i;
      const text = j === i ? classes[i]! : label(classes[i]!, classes[j]!, open);
      tokens.push(text + weightSuffix(w));
      i = j + 1;
    }
  };

  const pairs = Array.from({ length: 13 }, (_, k) => classOf(12 - k, 12 - k, 'pair'));
  emitRuns(pairs, true, (hi, lo, open) => (open ? `${lo}+` : `${hi}-${lo}`));

  for (let high = 12; high >= 1; high--) {
    for (const kind of ['suited', 'offsuit'] as const) {
      const classes = Array.from({ length: high }, (_, k) => classOf(high, high - 1 - k, kind));
      emitRuns(classes, true, (hi, lo, open) => (open ? `${lo}+` : `${hi}-${lo}`));
    }
  }
  return [...tokens, ...specific].join(', ');
}
