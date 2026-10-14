import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

/** Counters over the player's whole time in the app, for achievements. They only go up. */
type LifetimeState = {
  hands: number;
  /** Pots won at showdown. */
  showdownWins: number;
  analyses: number;
  /** Analyzed hands without a single inaccuracy or mistake. */
  cleanAnalyses: number;
  /** Right answers in all trainers. */
  drillRight: number;
  /** Longest run of right answers in the preflop trainer. */
  preflopBestStreak: number;
  addHand: (wonAtShowdown: boolean) => void;
  addAnalysis: (clean: boolean) => void;
  addDrillAnswer: (right: boolean) => void;
  notePreflopStreak: (streak: number) => void;
  /** Sets counters to totals across the account's phones (they only go up). */
  applyTotals: (totals: Partial<Record<LifetimeCounter, number>>) => void;
  reset: () => void;
};

/** Counters that add up across phones; preflopBestStreak is a best value instead. */
export const LIFETIME_COUNTERS = ['hands', 'showdownWins', 'analyses', 'cleanAnalyses', 'drillRight'] as const;
export type LifetimeCounter = (typeof LIFETIME_COUNTERS)[number];

const ZERO = { hands: 0, showdownWins: 0, analyses: 0, cleanAnalyses: 0, drillRight: 0, preflopBestStreak: 0 };

export const useLifetime = create<LifetimeState>()(
  persist(
    (set) => ({
      hands: 0,
      showdownWins: 0,
      analyses: 0,
      cleanAnalyses: 0,
      drillRight: 0,
      preflopBestStreak: 0,
      addHand: (won) => set((s) => ({ hands: s.hands + 1, showdownWins: s.showdownWins + (won ? 1 : 0) })),
      addAnalysis: (clean) => set((s) => ({ analyses: s.analyses + 1, cleanAnalyses: s.cleanAnalyses + (clean ? 1 : 0) })),
      addDrillAnswer: (right) => set((s) => (right ? { drillRight: s.drillRight + 1 } : s)),
      notePreflopStreak: (streak) => set((s) => (streak > s.preflopBestStreak ? { preflopBestStreak: streak } : s)),
      applyTotals: (totals) =>
        set((s) => {
          const next: Partial<Record<LifetimeCounter, number>> = {};
          for (const key of LIFETIME_COUNTERS) next[key] = Math.max(s[key], totals[key] ?? 0);
          return next;
        }),
      reset: () => set(ZERO),
    }),
    {
      name: 'lifetime',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ hands, showdownWins, analyses, cleanAnalyses, drillRight, preflopBestStreak }) => ({
        hands,
        showdownWins,
        analyses,
        cleanAnalyses,
        drillRight,
        preflopBestStreak,
      }),
    },
  ),
);
