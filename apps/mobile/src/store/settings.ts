import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

export type LanguagePreference = 'system' | 'en' | 'ru';
export type ThemePreference = 'neon' | 'daylight' | 'system';

type SettingsState = {
  language: LanguagePreference;
  theme: ThemePreference;
  /** Vibration on your turn and when you win a pot. */
  haptics: boolean;
  /** The bet sizing tab above the action buttons is expanded. */
  sizingOpen: boolean;
  setLanguage: (language: LanguagePreference) => void;
  setTheme: (theme: ThemePreference) => void;
  setHaptics: (on: boolean) => void;
  setSizingOpen: (open: boolean) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      // Neon is the signature look, so a fresh install starts dark.
      theme: 'neon',
      haptics: true,
      sizingOpen: true,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setHaptics: (haptics) => set({ haptics }),
      setSizingOpen: (sizingOpen) => set({ sizingOpen }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ language, theme, haptics, sizingOpen }) => ({ language, theme, haptics, sizingOpen }),
    },
  ),
);
