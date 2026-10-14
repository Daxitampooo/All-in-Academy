import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';
import { DEFAULT_LOOK, type LookCategory } from '@/looks/catalog';

type LookState = {
  /** Chosen item per category; locked choices fall back to the default when the table is drawn. */
  selected: Record<LookCategory, string>;
  /** Four suit colors (clubs green, diamonds blue): easier to read, kept in ranked play too. */
  fourColor: boolean;
  /** Time of the last change, ms since 1970; 0 when the player never changed anything. */
  updatedAt: number;
  choose: (category: LookCategory, id: string) => void;
  setFourColor: (on: boolean) => void;
  /** Takes a look chosen later on another phone. */
  applyRemote: (selected: Record<string, string>, fourColor: boolean, updatedAt: number) => void;
  reset: () => void;
};

/** The player's own table look. Only this device shows it; other players never see it. */
export const useLook = create<LookState>()(
  persist(
    (set) => ({
      selected: { ...DEFAULT_LOOK },
      fourColor: false,
      updatedAt: 0,
      choose: (category, id) => set((s) => ({ selected: { ...s.selected, [category]: id }, updatedAt: Date.now() })),
      setFourColor: (fourColor) => set({ fourColor, updatedAt: Date.now() }),
      applyRemote: (selected, fourColor, updatedAt) =>
        set({ selected: { ...DEFAULT_LOOK, ...(selected as Partial<Record<LookCategory, string>>) }, fourColor, updatedAt }),
      reset: () => set({ selected: { ...DEFAULT_LOOK }, fourColor: false, updatedAt: 0 }),
    }),
    {
      name: 'table-look',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ selected, fourColor, updatedAt }) => ({ selected, fourColor, updatedAt }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LookState>;
        return { ...current, ...p, selected: { ...DEFAULT_LOOK, ...p.selected } };
      },
    },
  ),
);
