import type { SyncPush, SyncState } from '@pokerall/shared/client';

import { useAcademy } from '@/store/academy';
import { useAccount } from '@/store/account';
import { useAchievementLog } from '@/store/achievements';
import { useBotProgress } from '@/store/botProgress';
import { useHands } from '@/store/hands';
import { LIFETIME_COUNTERS, useLifetime } from '@/store/lifetime';
import { useLook } from '@/store/look';
import { useProfile } from '@/store/profile';

/**
 * Turns the phone's progress into a sync request and the server's answer back into the stores.
 * Counters that add up across phones: lifetime counters and, per bot, wins, losses and series won
 * (keys like "bot.lena.wins"). The series in progress stays on the phone.
 */

const BOT_FIELDS = ['wins', 'losses', 'beaten'] as const;

function localTotals(): Record<string, number> {
  const life = useLifetime.getState();
  const totals: Record<string, number> = {};
  for (const key of LIFETIME_COUNTERS) totals[key] = life[key];
  for (const [id, record] of Object.entries(useBotProgress.getState().records)) {
    for (const field of BOT_FIELDS) totals[`bot.${id}.${field}`] = record[field];
  }
  return totals;
}

export function collectPush(deviceId: string): SyncPush {
  const others = useAccount.getState().others;
  const counters: Record<string, number> = {};
  for (const [key, total] of Object.entries(localTotals())) {
    const own = total - (others[key] ?? 0);
    if (own > 0) counters[key] = own;
  }
  const look = useLook.getState();
  return {
    deviceId,
    counters,
    maxima: { preflopBestStreak: useLifetime.getState().preflopBestStreak },
    achievements: useAchievementLog.getState().unlockedAt,
    academy: useAcademy.getState().lessons,
    ...(look.updatedAt > 0 ? { looks: { selected: look.selected, fourColor: look.fourColor, updatedAt: look.updatedAt } } : {}),
  };
}

/**
 * Applies the merged progress. Everything merges with what the phone has now, so a hand finished while the
 * request was on its way is not lost.
 */
export function applySyncState(state: SyncState): void {
  const oldOthers = useAccount.getState().others;
  const local = localTotals();
  const keys = new Set([...Object.keys(local), ...Object.keys(state.counters.own), ...Object.keys(state.counters.others)]);
  const totals: Record<string, number> = {};
  for (const key of keys) {
    const localOwn = (local[key] ?? 0) - (oldOthers[key] ?? 0);
    totals[key] = Math.max(localOwn, state.counters.own[key] ?? 0) + (state.counters.others[key] ?? 0);
  }

  // Achievements first: when counters reach an achievement opened on another phone, it is already known and
  // no banner pops up.
  useAchievementLog.getState().applyRemote(state.achievements);
  useAcademy.getState().applyRemote(state.academy);

  const lifetime: Record<string, number> = {};
  const bots: Record<string, { wins: number; losses: number; beaten: number }> = {};
  for (const [key, value] of Object.entries(totals)) {
    const bot = /^bot\.(.+)\.(wins|losses|beaten)$/.exec(key);
    if (bot) {
      const entry = (bots[bot[1]!] ??= { wins: 0, losses: 0, beaten: 0 });
      entry[bot[2] as 'wins' | 'losses' | 'beaten'] = value;
    } else {
      lifetime[key] = value;
    }
  }
  useLifetime.getState().applyTotals(lifetime);
  useBotProgress.getState().applyTotals(bots);
  useLifetime.getState().notePreflopStreak(state.maxima.preflopBestStreak ?? 0);

  const look = useLook.getState();
  if (state.looks && state.looks.updatedAt > look.updatedAt) {
    look.applyRemote(state.looks.selected, state.looks.fourColor, state.looks.updatedAt);
  }
  useAccount.setState({ others: state.counters.others });
}

/**
 * Clears the progress that belongs to an account, with the other phones' counters (`others`), and, when the
 * account is deleted, the hand history.
 */
export function resetProgress({ hands, others }: { hands: boolean; others: boolean }): void {
  useLifetime.getState().reset();
  useBotProgress.getState().reset();
  useAchievementLog.getState().reset();
  useAcademy.getState().reset();
  useLook.getState().reset();
  useProfile.getState().reset();
  if (hands) useHands.getState().reset();
  if (others) useAccount.setState({ others: {} });
}
