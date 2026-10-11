import { rankOf, type Card, type CategoryId, type HandEvent } from '@pokerall/poker-engine';
import type { TFunction } from 'i18next';

import { formatChips } from '@/lib/format';
import type { HandRecord, SeatInfo } from '@/table/useTableGame';

/** Translation key of a hand name; three of a kind is a set with a pocket pair, trips otherwise. */
export function handNameKey(categoryId: CategoryId, hole: readonly Card[]): string {
  if (categoryId === 'trips') return rankOf(hole[0]!) === rankOf(hole[1]!) ? 'hands.set' : 'hands.trips';
  return `hands.${categoryId}`;
}

/** "You" for the hero, the bot's short name otherwise. */
export function seatName(info: SeatInfo, t: TFunction): string {
  return info.kind === 'hero' ? t('table.you') : t(`bots.list.${info.botId}.short`);
}

/** One line about how a finished hand ended, from the point of view of seat `hero`. */
export function handOutcome(record: HandRecord, seats: SeatInfo[], hero: number, t: TFunction): string | null {
  const { hand, won, split } = record;
  if (split) {
    return t('table.splitResult', { pct: Math.round(split.equity[hero]! * 100), amount: formatChips(won[hero]!) });
  }
  const showdown = new Map<number, Extract<HandEvent, { type: 'showdown' }>>();
  for (const e of hand.events) if (e.type === 'showdown') showdown.set(e.seat, e);
  const handName = (seat: number) => {
    const sd = showdown.get(seat);
    return sd ? t(handNameKey(sd.categoryId, sd.cards)) : null;
  };
  const winners = hand.players.filter((p) => won[p.seat]! > 0);
  if (winners.length > 1) {
    const name = handName(winners[0]!.seat);
    return name ? `${t('table.split')}: ${name}` : t('table.split');
  }
  const w = winners[0];
  if (!w) return null;
  const name = handName(w.seat);
  const amount = formatChips(won[w.seat]!);
  if (w.seat === hero) return name ? t('table.youWinWith', { amount, hand: name }) : t('table.youWin', { amount });
  const who = seatName(seats[w.seat]!, t);
  return name ? t('table.winnerWith', { name: who, amount, hand: name }) : t('table.winner', { name: who, amount });
}

/**
 * For a hand settled by equity: whether the cards that came would have given the hero the whole pot,
 * or none of it. Null when the runout would have split the pot anyway, or the hand wasn't split.
 */
export function splitNote(record: HandRecord, hero: number, t: TFunction): string | null {
  if (!record.split) return null;
  const actual = record.hand.result!.won[hero]!;
  const pot = record.hand.result!.pots.reduce((sum, p) => sum + p.amount, 0);
  if (actual === 0) return t('table.splitNoteLost');
  if (actual === pot) return t('table.splitNoteWon');
  return null;
}
