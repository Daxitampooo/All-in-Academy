import {
  HandCategory,
  categoryOf,
  evaluate,
  rankOf,
  type Card,
  type HandEvent,
  type PlayerView,
  type Rng,
} from '@pokerall/poker-engine';

import { handFeatures, preflopStrength } from './strength';

type ActionEvent = Extract<HandEvent, { type: 'action' }>;

/** Uniform random number in [0, 1). */
function uniform(rng: Rng): number {
  return rng.nextInt(1 << 30) / (1 << 30);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Rough strength of a holding on a board, 0..1: nothing, weak pair, top pair, two pair, sets and better,
 * with draws counted as half-strong. Used to shape what an opponent who keeps betting probably holds.
 */
export function boardStrength(hole: readonly [Card, Card], board: readonly Card[]): number {
  if (board.length < 3) return preflopStrength(hole).equity;
  const value = evaluate([...hole, ...board]);
  const category = categoryOf(value);
  const f = handFeatures(hole, board);
  const draw = f.flushDraw ? 0.5 : f.straightDrawRanks >= 2 ? 0.45 : f.straightDrawRanks === 1 ? 0.28 : 0;
  let made: number;
  if (category >= HandCategory.Straight) made = 0.96;
  else if (category === HandCategory.Trips) made = 0.9;
  else if (category === HandCategory.TwoPair) made = f.pairWithHole ? 0.8 : 0.3;
  else if (category === HandCategory.Pair) {
    const pairRank = (value >> 16) & 0xf;
    const ranks = board.map(rankOf).sort((a, b) => b - a);
    if (!f.pairWithHole) made = 0.12;
    else if (pairRank > ranks[0]!) made = 0.7;
    else if (pairRank === ranks[0]) made = 0.6;
    else if (pairRank === ranks[1]) made = 0.42;
    else made = 0.3;
  } else made = f.overcards ? 0.18 : 0.08;
  return Math.max(made, draw);
}

/** What a bot believes about one opponent's hand from the way they played it. */
export type OpponentRead = {
  seat: number;
  /** Their hand is among the top `share` of starting hands (1 = any two cards). */
  share: number;
  /** Weight of their bets and raises after the flop; more pressure means a stronger range. */
  pressure: number;
};

/** What a bot has seen an opponent do over a match. */
export type OpponentStats = { hands: number; vpip: number; pfr: number };

/** Remembers each opponent's habits over a match: how many hands they play and raise. */
export class OpponentModel {
  private readonly stats = new Map<number, OpponentStats>();

  /** Call with the view of a finished hand. */
  observe(view: PlayerView): void {
    for (const p of view.players) {
      if (p.seat === view.seat) continue;
      const s = this.stats.get(p.seat) ?? { hands: 0, vpip: 0, pfr: 0 };
      const pre = view.events.filter(
        (e): e is ActionEvent => e.type === 'action' && e.street === 'preflop' && e.seat === p.seat,
      );
      s.hands += 1;
      if (pre.some((e) => e.action === 'call' || e.action === 'raise' || e.action === 'bet')) s.vpip += 1;
      if (pre.some((e) => e.action === 'raise' || e.action === 'bet')) s.pfr += 1;
      this.stats.set(p.seat, s);
    }
  }

  /** Share of hands the opponent raises preflop, once there's enough to go on. */
  pfr(seat: number): number | null {
    const s = this.stats.get(seat);
    return s && s.hands >= 12 ? clamp(s.pfr / s.hands, 0.03, 0.95) : null;
  }

  /** Share of hands the opponent plays voluntarily, once there's enough to go on. */
  vpip(seat: number): number | null {
    const s = this.stats.get(seat);
    return s && s.hands >= 12 ? clamp(s.vpip / s.hands, 0.05, 1) : null;
  }
}

/**
 * Reads every opponent still in the hand from public actions: who raised and how many times before the
 * flop, and how hard they've bet since. Typical ranges are used until the model has seen the player.
 */
export function readsFromView(view: PlayerView, model: OpponentModel | null): OpponentRead[] {
  const out: OpponentRead[] = [];
  for (const p of view.players) {
    if (p.seat === view.seat || p.folded) continue;
    let level = 0;
    let raisedAt = 0;
    let calledAt = -1;
    let pressure = 0;
    for (const e of view.events) {
      if (e.type !== 'action') continue;
      const aggressive = e.action === 'bet' || e.action === 'raise';
      if (e.street === 'preflop') {
        if (aggressive) level += 1;
        if (e.seat !== p.seat) continue;
        if (aggressive) raisedAt = level;
        else if (e.action === 'call') calledAt = Math.max(calledAt, level);
      } else if (e.seat === p.seat && aggressive) {
        pressure += e.street === 'river' ? 1.4 : e.street === 'turn' ? 1.15 : 1;
      }
    }
    const pfr = model?.pfr(p.seat) ?? 0.2;
    const vpip = model?.vpip(p.seat) ?? 0.4;
    const byLevel = (n: number) => (n <= 0 ? vpip : n === 1 ? pfr : n === 2 ? pfr * 0.35 : 0.04);
    let share = 1;
    if (raisedAt > 0) share = byLevel(raisedAt);
    else if (calledAt >= 0) share = Math.min(1, byLevel(calledAt) * (calledAt === 0 ? 1 : 1.6));
    out.push({ seat: p.seat, share: clamp(share, 0.02, 1), pressure });
  }
  return out;
}

/** Softens reads: at `awareness` 0 every opponent holds any two cards, at 1 the reads apply in full. */
export function blendReads(reads: OpponentRead[], awareness: number): OpponentRead[] {
  return reads.map((r) => ({ ...r, share: 1 - awareness * (1 - r.share), pressure: r.pressure * awareness }));
}

function accepts(hand: [Card, Card], board: readonly Card[], read: OpponentRead, rng: Rng): boolean {
  if (read.share < 0.999) {
    const pct = preflopStrength(hand).percentile;
    if (pct > read.share) {
      // A soft edge: hands just outside the range still turn up sometimes.
      const over = (pct - read.share) / (read.share * 0.5 + 0.05);
      if (over >= 1 || uniform(rng) < over) return false;
    }
  }
  if (read.pressure > 0 && board.length >= 3) {
    const keep = Math.pow(Math.max(0.05, boardStrength(hand, board)), read.pressure);
    if (uniform(rng) >= keep) return false;
  }
  return true;
}

/**
 * Monte Carlo share of the pot against opponents whose hands are drawn from their reads: a raiser holds
 * stronger hands, and someone who keeps betting holds something that connects with the board.
 */
export function estimateEquityVsReads(
  hole: readonly [Card, Card],
  board: readonly Card[],
  reads: readonly OpponentRead[],
  samples: number,
  rng: Rng,
): number {
  if (reads.length === 0) return 1;
  const used = new Uint8Array(52);
  for (const c of hole) used[c] = 1;
  for (const c of board) used[c] = 1;
  const deck: Card[] = [];
  for (let c = 0; c < 52; c++) if (!used[c]) deck.push(c);
  const taken = new Uint8Array(52);
  const missing = 5 - board.length;
  const mine: Card[] = [hole[0], hole[1], 0, 0, 0, 0, 0];
  const theirs: Card[] = [0, 0, 0, 0, 0, 0, 0];
  const hands: [Card, Card][] = reads.map(() => [0, 0]);
  const full: Card[] = [];

  const draw = (): Card => {
    for (;;) {
      const c = deck[rng.nextInt(deck.length)]!;
      if (!taken[c]) {
        taken[c] = 1;
        return c;
      }
    }
  };

  let score = 0;
  for (let it = 0; it < samples; it++) {
    taken.fill(0);
    reads.forEach((read, o) => {
      let a = 0;
      let b = 0;
      for (let attempt = 0; attempt < 25; attempt++) {
        a = draw();
        b = draw();
        if (accepts([a, b], board, read, rng)) break;
        taken[a] = 0;
        taken[b] = 0;
        if (attempt === 24) {
          taken[a] = 1;
          taken[b] = 1;
        }
      }
      hands[o]![0] = a;
      hands[o]![1] = b;
    });
    full.length = 0;
    for (const c of board) full.push(c);
    for (let i = 0; i < missing; i++) full.push(draw());
    for (let i = 0; i < 5; i++) {
      mine[2 + i] = full[i]!;
      theirs[2 + i] = full[i]!;
    }
    const my = evaluate(mine);
    let best = -1;
    let tied = 0;
    for (const h of hands) {
      theirs[0] = h[0];
      theirs[1] = h[1];
      const v = evaluate(theirs);
      if (v > best) {
        best = v;
        tied = 1;
      } else if (v === best) tied += 1;
    }
    if (my > best) score += 1;
    else if (my === best) score += 1 / (tied + 1);
  }
  return score / samples;
}

/**
 * Learns whether an opponent's bet size gives their hand away: from showdowns, how strong they were when
 * they bet big (70% of the pot or more) and when they bet small (under half the pot).
 */
export class SizingTells {
  private readonly seen = new Map<number, { big: number[]; small: number[] }>();

  observe(view: PlayerView): void {
    let board: Card[] = [];
    for (const e of view.events) {
      if (e.type === 'street') {
        board = e.board;
        continue;
      }
      if (e.type !== 'action' || e.street === 'preflop' || e.seat === view.seat) continue;
      if (e.action !== 'bet' && e.action !== 'raise') continue;
      const hole = view.players[e.seat]?.holeCards;
      if (!hole) continue;
      const potBefore = this.potBefore(view.events, e);
      const ratio = e.added / Math.max(1, potBefore);
      const entry = this.seen.get(e.seat) ?? { big: [], small: [] };
      const strength = boardStrength(hole, board);
      if (ratio >= 0.7) entry.big.push(strength);
      else if (ratio < 0.5) entry.small.push(strength);
      this.seen.set(e.seat, entry);
    }
  }

  private potBefore(events: HandEvent[], action: ActionEvent): number {
    let pot = 0;
    for (const e of events) {
      if (e === action) break;
      if (e.type === 'ante' || e.type === 'blind') pot += e.amount;
      else if (e.type === 'action') pot += e.added;
      else if (e.type === 'uncalled') pot -= e.amount;
    }
    return pot;
  }

  /**
   * How much a bet of this size says about the hand: positive when big bets have meant strong hands
   * (and small bets weak ones), 0 when there's nothing to learn yet.
   */
  tell(seat: number): number {
    const s = this.seen.get(seat);
    if (!s || s.big.length < 2 || s.small.length < 2) return 0;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    return clamp(mean(s.big) - mean(s.small), -0.5, 0.5);
  }
}
