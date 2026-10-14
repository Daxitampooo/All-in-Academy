import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

export type LanguagePreference = 'system' | 'en' | 'ru';
export type ThemePreference = 'neon' | 'daylight' | 'system';

/** What the player answered on the first launch: it picks the start screen and how much the app explains. */
export type PlayerLevel = 'beginner' | 'casual' | 'regular' | 'pro';
export const PLAYER_LEVELS: PlayerLevel[] = ['beginner', 'casual', 'regular', 'pro'];

/** Hints at the table, the coach and term links in lessons are on for newer players and off for experienced ones. */
export function levelDefaults(level: PlayerLevel): { tableHints: boolean; coach: boolean; lessonTerms: boolean } {
  const newer = level === 'beginner' || level === 'casual';
  return { tableHints: newer, coach: newer, lessonTerms: newer };
}

type SettingsState = {
  language: LanguagePreference;
  theme: ThemePreference;
  /** Vibration on your turn and when you win a pot. */
  haptics: boolean;
  /** The bet sizing tab above the action buttons is expanded. */
  sizingOpen: boolean;
  /** When the player confirmed being 18 or older on the first launch, ms since 1970. */
  ageConfirmedAt: number | null;
  /** Null until the player answers on the first launch. */
  level: PlayerLevel | null;
  /** Your made hand, draws, outs and the price of a call, shown at the table. */
  tableHints: boolean;
  /** After each of your decisions at a bot table: was it right and why. */
  coach: boolean;
  /** Glossary terms in lesson text can be tapped for a definition. */
  lessonTerms: boolean;
  confirmAge: () => void;
  /** Sets the level; `applyDefaults` also sets hints and the coach to suit it. */
  setLevel: (level: PlayerLevel, applyDefaults: boolean) => void;
  setTableHints: (on: boolean) => void;
  setCoach: (on: boolean) => void;
  setLessonTerms: (on: boolean) => void;
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
      ageConfirmedAt: null,
      level: null,
      tableHints: true,
      coach: true,
      lessonTerms: true,
      confirmAge: () => set({ ageConfirmedAt: Date.now() }),
      setLevel: (level, applyDefaults) => set(applyDefaults ? { level, ...levelDefaults(level) } : { level }),
      setTableHints: (tableHints) => set({ tableHints }),
      setCoach: (coach) => set({ coach }),
      setLessonTerms: (lessonTerms) => set({ lessonTerms }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setHaptics: (haptics) => set({ haptics }),
      setSizingOpen: (sizingOpen) => set({ sizingOpen }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ language, theme, haptics, sizingOpen, ageConfirmedAt, level, tableHints, coach, lessonTerms }) => ({
        language,
        theme,
        haptics,
        sizingOpen,
        ageConfirmedAt,
        level,
        tableHints,
        coach,
        lessonTerms,
      }),
    },
  ),
);
