/** Chance to hit one of `outs` cards with one card to come (47 unseen) or two. */
export function hitChance(outs: number, cards: 1 | 2): number {
  if (cards === 1) return outs / 47;
  return 1 - ((47 - outs) / 47) * ((46 - outs) / 46);
}
