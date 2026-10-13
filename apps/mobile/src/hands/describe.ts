import type { HandEvent } from '@pokerall/poker-engine';
import type { TFunction } from 'i18next';

import { formatChips } from '@/lib/format';
import type { SavedHand } from '@/store/hands';
import { seatName } from '@/table/describe';

type ActionEvent = Extract<HandEvent, { type: 'action' }>;

/** "Raise to 750", "Call 300", "All-in 9 800". */
export function actionText(a: ActionEvent, t: TFunction): string {
  if (a.allIn && a.action !== 'fold' && a.action !== 'check') return t('analysis.act.allIn', { amount: formatChips(a.streetBet) });
  if (a.action === 'call') return t('analysis.act.call', { amount: formatChips(a.added) });
  if (a.action === 'bet' || a.action === 'raise') return t(`analysis.act.${a.action}`, { amount: formatChips(a.streetBet) });
  return t(`analysis.act.${a.action}`);
}

/** Who the hand was against: the bot of a heads-up match, or the league of a practice table. */
export function opponentOf(hand: SavedHand, t: TFunction): string {
  if (hand.mode === 'hu' && hand.botId) return t(`bots.list.${hand.botId}.short`);
  return t('hands.tableOf', { league: t(`bots.leagues.${hand.league ?? 'novices'}`) });
}

export function seatLabel(hand: SavedHand, seat: number, t: TFunction, nickname: string | null): string {
  const info = hand.seats[seat]!;
  if (info.kind === 'hero') return nickname ?? t('table.you');
  return seatName(info, t);
}

/** "Today 21:40", "Yesterday 09:15", "12.10 18:02". */
export function whenText(at: number, t: TFunction, language: string): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (at >= startOfToday) return t('hands.today', { time });
  if (at >= startOfToday - 86_400_000) return t('hands.yesterday', { time });
  const date = d.toLocaleDateString(language, { day: '2-digit', month: '2-digit' });
  return `${date} ${time}`;
}

/** Hero's result in big blinds with a sign, e.g. "+12.5 BB". */
export function bbText(chips: number, bigBlind: number, t: TFunction): string {
  const bb = Math.round((chips / bigBlind) * 10) / 10;
  return t('hands.bb', { bb: `${bb > 0 ? '+' : ''}${bb.toLocaleString()}` });
}
