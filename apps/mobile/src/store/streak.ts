import { addStreakTasks, dayKey, STREAK_GOAL, STREAK_POINTS, type StreakDays } from '@pokerall/shared/client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

type StreakState = {
  /** Tasks done per day ("2026-10-15" → 7). */
  days: StreakDays;
  /** Day that has just reached the goal, for the "streak extended" banner. Not saved. */
  justDone: string | null;
  /** A trainer answer, right or wrong: working through a question is the task. */
  addAnswer: () => void;
  /** A finished lesson test. */
  addLessonTest: () => void;
  dismissDone: () => void;
  reset: () => void;
};

function add(s: StreakState, points: number): Partial<StreakState> {
  const now = new Date();
  const key = dayKey(now);
  const before = s.days[key] ?? 0;
  const days = addStreakTasks(s.days, now, points);
  const crossed = before < STREAK_GOAL && days[key]! >= STREAK_GOAL;
  return crossed ? { days, justDone: key } : { days };
}

/** The day streak on this phone: a day counts once the player does STREAK_GOAL tasks in it. */
export const useStreak = create<StreakState>()(
  persist(
    (set) => ({
      days: {},
      justDone: null,
      addAnswer: () => set((s) => add(s, STREAK_POINTS.answer)),
      addLessonTest: () => set((s) => add(s, STREAK_POINTS.lessonTest)),
      dismissDone: () => set({ justDone: null }),
      reset: () => set({ days: {}, justDone: null }),
    }),
    {
      name: 'day-streak',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ days }) => ({ days }),
    },
  ),
);
