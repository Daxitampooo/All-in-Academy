/** A pot and the seats that can win it. */
export type Pot = {
  amount: number;
  /** Seats that put chips in at this level and haven't folded. */
  eligible: number[];
};

/**
 * Splits everyone's total contribution into a main pot and side pots.
 * Folded players' chips stay in the pots they reached but they can't win them.
 * Uncalled chips must already be returned before calling this.
 */
export function buildPots(contributions: readonly number[], folded: readonly boolean[]): Pot[] {
  const remaining = contributions.slice();
  const pots: Pot[] = [];
  for (;;) {
    let level = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      if (!folded[i] && remaining[i]! > 0) level = Math.min(level, remaining[i]!);
    }
    if (level === Infinity) break;

    let amount = 0;
    const eligible: number[] = [];
    for (let i = 0; i < remaining.length; i++) {
      const put = Math.min(remaining[i]!, level);
      if (put > 0) {
        amount += put;
        remaining[i] = remaining[i]! - put;
        if (!folded[i]) eligible.push(i);
      }
    }
    const last = pots[pots.length - 1];
    if (last && sameSeats(last.eligible, eligible)) last.amount += amount;
    else pots.push({ amount, eligible });
  }

  // Chips from folded players above every live player's contribution. This
  // can't happen after uncalled bets are returned, but never lose chips.
  const leftover = remaining.reduce((a, b) => a + b, 0);
  if (leftover > 0) {
    if (pots.length === 0) throw new Error('Chips in the pot but no live players');
    pots[pots.length - 1]!.amount += leftover;
  }
  return pots;
}

function sameSeats(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Splits `amount` between `winners` (seat indexes). Odd chips go one each to
 * the winners closest to the left of the button.
 */
export function splitPot(amount: number, winners: readonly number[], button: number, seatCount: number): number[] {
  if (winners.length === 0) throw new Error('A pot needs at least one winner');
  const ordered = winners
    .slice()
    .sort((a, b) => ((a - button - 1 + seatCount) % seatCount) - ((b - button - 1 + seatCount) % seatCount));
  const base = Math.floor(amount / winners.length);
  let odd = amount - base * winners.length;
  const shares = new Map<number, number>();
  for (const seat of ordered) {
    shares.set(seat, base + (odd > 0 ? 1 : 0));
    if (odd > 0) odd--;
  }
  return winners.map((seat) => shares.get(seat)!);
}
