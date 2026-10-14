import { DAILY_SIZE } from '@pokerall/content';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

export type DailyResult = { right: number; total: number; at: number };

type DailyState = {
  /** Finished challenges by day ("2026-10-14"). */
  results: Record<string, DailyResult>;
  /** Answers of the challenge in progress: leaving and coming back continues it. */
  current: { day: string; answers: boolean[] } | null;
  answer: (day: string, right: boolean) => void;
};

/**
 * The daily challenge on this phone: the first run of each day counts. A leaderboard needs the server and
 * comes with online play.
 */
export const useDaily = create<DailyState>()(
  persist(
    (set) => ({
      results: {},
      current: null,
      answer: (day, right) =>
        set((s) => {
          if (s.results[day]) return s;
          const answers = [...(s.current?.day === day ? s.current.answers : []), right];
          if (answers.length < DAILY_SIZE) return { current: { day, answers } };
          const result = { right: answers.filter(Boolean).length, total: answers.length, at: Date.now() };
          return { current: null, results: { ...s.results, [day]: result } };
        }),
    }),
    {
      name: 'daily-challenge',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ results, current }) => ({ results, current }),
    },
  ),
);

/** Days in a row with a finished challenge, counting back from today (or yesterday, if today is still open). */
export function dailyStreak(results: Record<string, DailyResult>, today: Date): number {
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!results[key(day)]) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (results[key(day)]) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}
