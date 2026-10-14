/**
 * ICM (Independent Chip Model, Malmuth–Harville): each player's share of the prizes, from the stacks.
 * The chance to finish first is the player's share of the chips; the next places repeat the same rule among
 * the players still in. Computed over subsets of players, so it is fast for up to 12 players.
 */

export const ICM_MAX_PLAYERS = 12;

/**
 * Expected prize of every player. `payouts[0]` is first place; places beyond the list pay nothing.
 * Players with an empty stack are out and get 0.
 */
export function icmEquity(stacks: readonly number[], payouts: readonly number[]): number[] {
  const n = stacks.length;
  if (n === 0) return [];
  if (n > ICM_MAX_PLAYERS) throw new Error(`ICM supports up to ${ICM_MAX_PLAYERS} players`);
  for (const s of stacks) if (!(s >= 0) || !Number.isFinite(s)) throw new Error('Stacks must be 0 or more');
  for (const p of payouts) if (!(p >= 0) || !Number.isFinite(p)) throw new Error('Payouts must be 0 or more');

  const alive = stacks.map((s, i) => (s > 0 ? i : -1)).filter((i) => i >= 0);
  const m = alive.length;
  const out = new Array<number>(n).fill(0);
  if (m === 0) return out;

  const full = (1 << m) - 1;
  // Probability that exactly the players in `set` are still unplaced.
  const reach = new Float64Array(1 << m);
  reach[full] = 1;
  const size = (set: number) => {
    let c = 0;
    for (let s = set; s; s &= s - 1) c++;
    return c;
  };
  // Larger sets first: every set is finished before any of its subsets is read.
  const order = Array.from({ length: full + 1 }, (_, s) => s).sort((a, b) => size(b) - size(a));
  for (const set of order) {
    const p = reach[set]!;
    if (set === 0 || p === 0) continue;
    const place = m - size(set);
    let total = 0;
    for (let k = 0; k < m; k++) if (set & (1 << k)) total += stacks[alive[k]!]!;
    for (let k = 0; k < m; k++) {
      if (!(set & (1 << k))) continue;
      const q = (p * stacks[alive[k]!]!) / total;
      if (place < payouts.length) out[alive[k]!]! += q * payouts[place]!;
      reach[set & ~(1 << k)]! += q;
    }
  }
  return out;
}

export type IcmCall = {
  /** Hero's expected prize after folding (the dead money goes to the villain). */
  fold: number;
  win: number;
  lose: number;
  /** Equity the call needs by ICM. */
  requiredEquity: number;
  /** Equity the call would need if chips were prizes. */
  chipEquity: number;
  /** What losing costs divided by what winning gains; above 1 means calls need more equity than pot odds. */
  bubbleFactor: number;
};

/**
 * Hero calls an all-in from `villain`. Stacks are what each player has behind; `deadMoney` is already in the
 * pot (blinds, antes) and goes to the winner.
 */
export function icmCall(
  stacks: readonly number[],
  payouts: readonly number[],
  hero: number,
  villain: number,
  deadMoney = 0,
): IcmCall {
  if (hero === villain) throw new Error('Hero and villain must differ');
  const risk = Math.min(stacks[hero]!, stacks[villain]!);
  if (!(risk > 0)) throw new Error('Both players need chips');
  const after = (heroWins: boolean) => {
    const s = stacks.slice();
    s[hero] = s[hero]! + (heroWins ? risk + deadMoney : -risk);
    s[villain] = s[villain]! + (heroWins ? -risk : risk + deadMoney);
    return icmEquity(s, payouts)[hero]!;
  };
  const folded = stacks.slice();
  folded[villain] = folded[villain]! + deadMoney;
  const fold = icmEquity(folded, payouts)[hero]!;
  const win = after(true);
  // Busting now means finishing last among the players still in, which may still pay.
  const alive = stacks.filter((s) => s > 0).length;
  const lose = stacks[hero]! <= stacks[villain]! ? (payouts[alive - 1] ?? 0) : after(false);
  const gain = win - fold;
  const loss = fold - lose;
  return {
    fold,
    win,
    lose,
    requiredEquity: win > lose ? loss / (win - lose) : 1,
    chipEquity: risk / (2 * risk + deadMoney),
    bubbleFactor: gain > 0 ? loss / gain : Infinity,
  };
}
