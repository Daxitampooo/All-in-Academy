import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DRILL_CONFIG } from '@/config/drills';
import { kvStorage } from '@/lib/storage';
import { localDay } from '@/store/analysisQuota';

type DrillQuotaState = {
  day: string;
  used: number;
  /** Counts one preflop trainer hand; false when today's free ones are used up. */
  consume: (pro: boolean) => boolean;
};

/** Free preflop trainer hands per day, on this phone. */
export const useDrillQuota = create<DrillQuotaState>()(
  persist(
    (set, get) => ({
      day: localDay(),
      used: 0,
      consume: (pro) => {
        if (pro) return true;
        const today = localDay();
        const used = get().day === today ? get().used : 0;
        if (used >= DRILL_CONFIG.preflopFreePerDay) return false;
        set({ day: today, used: used + 1 });
        return true;
      },
    }),
    { name: 'drill-quota', version: 1, storage: createJSONStorage(() => kvStorage), partialize: ({ day, used }) => ({ day, used }) },
  ),
);

/** Free preflop hands left today, or null with Pro. */
export function usePreflopLeft(pro: boolean): number | null {
  const day = useDrillQuota((s) => s.day);
  const used = useDrillQuota((s) => s.used);
  if (pro) return null;
  return DRILL_CONFIG.preflopFreePerDay - (day === localDay() ? used : 0);
}
