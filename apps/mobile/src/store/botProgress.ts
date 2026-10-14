import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

export type Score = { wins: number; losses: number };

export type BotRecord = Score & {
  /** Series won against this bot; it counts as beaten from the first one. */
  beaten: number;
  /** The series being played now. */
  series: Score;
};

/** What a finished match did to the series. */
export type SeriesUpdate = {
  /** Score of the series after this match (before it restarts, when it's over). */
  series: Score;
  target: number;
  /** Set when this match decided the series. */
  over: 'won' | 'lost' | null;
};

type BotProgressState = {
  /** Heads-up results against each bot, by bot id. */
  records: Record<string, BotRecord>;
  /** Records a match; `target` is the wins that take a series against this bot. */
  recordMatch: (botId: string, won: boolean, target: number) => SeriesUpdate;
  /** Sets wins, losses and beaten series to totals across the account's phones (the current series stays). */
  applyTotals: (totals: Record<string, Score & { beaten: number }>) => void;
  reset: () => void;
};

const EMPTY: BotRecord = { wins: 0, losses: 0, beaten: 0, series: { wins: 0, losses: 0 } };

export const useBotProgress = create<BotProgressState>()(
  persist(
    (set, get) => ({
      records: {},
      recordMatch: (botId, won, target) => {
        const prev = get().records[botId] ?? EMPTY;
        const series = won
          ? { ...prev.series, wins: prev.series.wins + 1 }
          : { ...prev.series, losses: prev.series.losses + 1 };
        const over = series.wins >= target ? 'won' : series.losses >= target ? 'lost' : null;
        const next: BotRecord = {
          wins: prev.wins + (won ? 1 : 0),
          losses: prev.losses + (won ? 0 : 1),
          beaten: prev.beaten + (over === 'won' ? 1 : 0),
          series: over ? { wins: 0, losses: 0 } : series,
        };
        set((s) => ({ records: { ...s.records, [botId]: next } }));
        return { series, target, over };
      },
      applyTotals: (totals) =>
        set((s) => {
          const records = { ...s.records };
          for (const [id, t] of Object.entries(totals)) {
            const prev = records[id] ?? EMPTY;
            records[id] = {
              ...prev,
              wins: Math.max(prev.wins, t.wins),
              losses: Math.max(prev.losses, t.losses),
              beaten: Math.max(prev.beaten, t.beaten),
            };
          }
          return { records };
        }),
      reset: () => set({ records: {} }),
    }),
    {
      name: 'bot-progress',
      version: 2,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ records }) => ({ records }),
      // Version 1 kept only match wins and losses, and a single win beat a bot.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { records?: Record<string, Partial<BotRecord>> };
        if (version < 2) {
          const records: Record<string, BotRecord> = {};
          for (const [id, r] of Object.entries(state.records ?? {})) {
            const wins = r.wins ?? 0;
            records[id] = { wins, losses: r.losses ?? 0, beaten: wins, series: { wins: 0, losses: 0 } };
          }
          return { records };
        }
        return state as { records: Record<string, BotRecord> };
      },
    },
  ),
);

/** Series won per bot id, the shape the catalog's unlock rules use. */
export function beatenById(records: Record<string, BotRecord>): Record<string, number> {
  return Object.fromEntries(Object.entries(records).map(([id, r]) => [id, r.beaten]));
}
