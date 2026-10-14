import { mergeEarliest } from '@pokerall/shared/client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

type AchievementsState = {
  /** When each achievement was first seen as done, ms since 1970. */
  unlockedAt: Record<string, number>;
  /** Set after the first check, so achievements earned before this version don't all pop up at once. */
  initialized: boolean;
  /** Freshly opened achievements waiting to be announced (not saved). */
  pending: string[];
  /** Saves newly opened achievements; `announce` queues them for the banner. */
  record: (ids: string[], announce: boolean) => void;
  dismiss: () => void;
  /** Takes unlocks from the account; the earliest date of each stays. */
  applyRemote: (unlockedAt: Record<string, number>) => void;
  reset: () => void;
};

export const useAchievementLog = create<AchievementsState>()(
  persist(
    (set) => ({
      unlockedAt: {},
      initialized: false,
      pending: [],
      record: (ids, announce) =>
        set((s) => {
          const now = Date.now();
          const next = { ...s.unlockedAt };
          for (const id of ids) next[id] ??= now;
          return { unlockedAt: next, initialized: true, pending: announce ? [...s.pending, ...ids] : s.pending };
        }),
      dismiss: () => set((s) => ({ pending: s.pending.slice(1) })),
      applyRemote: (remote) => set((s) => ({ unlockedAt: mergeEarliest(s.unlockedAt, remote) })),
      // Stays initialized: there is nothing earned to announce after a reset.
      reset: () => set({ unlockedAt: {}, pending: [] }),
    }),
    {
      name: 'achievements',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ unlockedAt, initialized }) => ({ unlockedAt, initialized }),
    },
  ),
);
