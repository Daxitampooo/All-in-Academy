import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';
import { DEFAULT_LOOK, type LookCategory } from '@/looks/catalog';

type LookState = {
  /** Chosen item per category; locked choices fall back to the default when the table is drawn. */
  selected: Record<LookCategory, string>;
  /** Four suit colors (clubs green, diamonds blue): easier to read, kept in ranked play too. */
  fourColor: boolean;
  choose: (category: LookCategory, id: string) => void;
  setFourColor: (on: boolean) => void;
};

/** The player's own table look. Only this device shows it; other players never see it. */
export const useLook = create<LookState>()(
  persist(
    (set) => ({
      selected: { ...DEFAULT_LOOK },
      fourColor: false,
      choose: (category, id) => set((s) => ({ selected: { ...s.selected, [category]: id } })),
      setFourColor: (fourColor) => set({ fourColor }),
    }),
    {
      name: 'table-look',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ selected, fourColor }) => ({ selected, fourColor }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LookState>;
        return { ...current, ...p, selected: { ...DEFAULT_LOOK, ...p.selected } };
      },
    },
  ),
);
