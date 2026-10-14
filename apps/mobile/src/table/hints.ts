import { drawOuts } from '@pokerall/content';
import { HandCategory, categoryOf, evaluate, type Card } from '@pokerall/poker-engine';

export type DrawHint = { outs: number; /** Chance to hit by the river, 0..1. */ chance: number };

/**
 * Outs to a straight or better while the hand isn't one yet, with the exact chance to hit by the river
 * (two cards to come on the flop, one on the turn). Null without a real draw.
 */
export function drawHint(hole: readonly Card[], board: readonly Card[]): DrawHint | null {
  if (board.length < 3 || board.length > 4) return null;
  if (categoryOf(evaluate([...hole, ...board])) >= HandCategory.Straight) return null;
  const outs = drawOuts(hole, board).length;
  if (outs < 4) return null;
  const unseen = 52 - 2 - board.length;
  const chance = board.length === 3 ? 1 - ((unseen - outs) * (unseen - outs - 1)) / (unseen * (unseen - 1)) : outs / unseen;
  return { outs, chance };
}
