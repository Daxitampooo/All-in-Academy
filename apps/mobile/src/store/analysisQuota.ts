import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ANALYSIS_CONFIG } from '@/config/analysis';
import { kvStorage } from '@/lib/storage';

/** Today on the player's phone, e.g. "2026-10-14": the count starts over at local midnight. */
export function localDay(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

type QuotaState = {
  day: string;
  used: number;
  /** Counts one analysis; false when today's free ones are used up. */
  consume: (pro: boolean) => boolean;
};

/**
 * Free hand analyses per day. Kept on the phone for now; with accounts the server keeps the count.
 */
export const useAnalysisQuota = create<QuotaState>()(
  persist(
    (set, get) => ({
      day: localDay(),
      used: 0,
      consume: (pro) => {
        if (pro) return true;
        const today = localDay();
        const used = get().day === today ? get().used : 0;
        if (used >= ANALYSIS_CONFIG.freePerDay) return false;
        set({ day: today, used: used + 1 });
        return true;
      },
    }),
    {
      name: 'analysis-quota',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ day, used }) => ({ day, used }),
    },
  ),
);

/** Free analyses left today, or null with Pro (no limit). */
export function useAnalysesLeft(pro: boolean): number | null {
  const day = useAnalysisQuota((s) => s.day);
  const used = useAnalysisQuota((s) => s.used);
  if (pro) return null;
  return ANALYSIS_CONFIG.freePerDay - (day === localDay() ? used : 0);
}
