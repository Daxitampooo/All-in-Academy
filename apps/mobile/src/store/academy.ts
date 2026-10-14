import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

export type LessonProgress = {
  /** Passed the test at the end at least once. */
  passed: boolean;
  /** Best share of the test answered right, 0..1. */
  best: number;
  /** Last attempt, ms since 1970. */
  at: number;
};

type AcademyState = {
  lessons: Record<string, LessonProgress>;
  /** Saves a test result; the best score and "passed" never go down. */
  recordTest: (lessonId: string, score: number, passed: boolean) => void;
};

/** Academy progress on this phone; with accounts it syncs to the server (stage 7). */
export const useAcademy = create<AcademyState>()(
  persist(
    (set) => ({
      lessons: {},
      recordTest: (lessonId, score, passed) =>
        set((s) => {
          const prev = s.lessons[lessonId];
          return {
            lessons: {
              ...s.lessons,
              [lessonId]: { passed: passed || !!prev?.passed, best: Math.max(score, prev?.best ?? 0), at: Date.now() },
            },
          };
        }),
    }),
    {
      name: 'academy-progress',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ lessons }) => ({ lessons }),
    },
  ),
);
