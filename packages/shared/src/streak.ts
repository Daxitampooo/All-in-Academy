/**
 * The day streak: days in a row on which the player did enough tasks. A day counts for the work done in it
 * (trainer answers, lesson tests), not for opening the app.
 */

/** Tasks a day needs to count towards the streak. */
export const STREAK_GOAL = 10;

/** What one task is worth. A lesson test is a whole quiz, so it counts as several trainer answers. */
export const STREAK_POINTS = { answer: 1, lessonTest: 5 } as const;

/** Days kept in storage: enough for any streak to be counted again after a sync. */
export const STREAK_KEEP_DAYS = 400;

/** Tasks done per local calendar day, by "YYYY-MM-DD". */
export type StreakDays = Record<string, number>;

/** Local calendar day of a moment, as "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function previousDay(date: Date): Date {
  // Built from the calendar fields, so a daylight saving change never skips or repeats a day.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

/** Whether the day reached the goal. */
export function dayDone(days: StreakDays, key: string, goal = STREAK_GOAL): boolean {
  return (days[key] ?? 0) >= goal;
}

/**
 * Current streak on `today`. A finished today counts; an unfinished today doesn't break the streak yet,
 * since the player still has time, so counting then starts from yesterday.
 */
export function currentStreak(days: StreakDays, today: Date, goal = STREAK_GOAL): number {
  let day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!dayDone(days, dayKey(day), goal)) day = previousDay(day);
  let streak = 0;
  while (dayDone(days, dayKey(day), goal)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}

/** Longest run of finished days anywhere in the record. */
export function longestStreak(days: StreakDays, goal = STREAK_GOAL): number {
  const done = Object.keys(days)
    .filter((k) => dayDone(days, k, goal))
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of done) {
    const [y, m, d] = key.split('-').map(Number) as [number, number, number];
    run = prev !== null && dayKey(previousDay(new Date(y, m - 1, d))) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

/** Adds tasks to a day and drops days older than the kept window. */
export function addStreakTasks(days: StreakDays, now: Date, points: number): StreakDays {
  const key = dayKey(now);
  const next: StreakDays = { ...days, [key]: (days[key] ?? 0) + points };
  const oldest = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - STREAK_KEEP_DAYS));
  for (const k of Object.keys(next)) if (k < oldest) delete next[k];
  return next;
}

/**
 * Days from two phones of one account: the larger count of each day wins. Tasks done on both phones on the
 * same day don't add up, which can only make a day count later, never wrongly.
 */
export function mergeStreakDays(a: StreakDays, b: StreakDays): StreakDays {
  const out: StreakDays = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}
