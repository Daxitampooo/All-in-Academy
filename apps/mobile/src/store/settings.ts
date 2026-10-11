import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

export type LanguagePreference = 'system' | 'en' | 'ru';
export type ThemePreference = 'neon' | 'daylight' | 'system';

type SettingsState = {
  language: LanguagePreference;
  theme: ThemePreference;
  setLanguage: (language: LanguagePreference) => void;
  setTheme: (theme: ThemePreference) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      // Neon is the signature look, so a fresh install starts dark.
      theme: 'neon',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ language, theme }) => ({ language, theme }),
    },
  ),
);
