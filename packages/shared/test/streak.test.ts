import { describe, expect, it } from 'vitest';

import {
  addStreakTasks,
  currentStreak,
  dayKey,
  longestStreak,
  mergeStreakDays,
  STREAK_GOAL,
  STREAK_KEEP_DAYS,
  type StreakDays,
} from '../src/streak';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const full = (...keys: string[]): StreakDays => Object.fromEntries(keys.map((k) => [k, STREAK_GOAL]));

describe('dayKey', () => {
  it('uses the local calendar day with padding', () => {
    expect(dayKey(at(2026, 3, 7, 0))).toBe('2026-03-07');
    expect(dayKey(at(2026, 12, 31, 23))).toBe('2026-12-31');
  });
});

describe('currentStreak', () => {
  it('is 0 with no days', () => {
    expect(currentStreak({}, at(2026, 10, 15))).toBe(0);
  });

  it('counts today when today is done', () => {
    expect(currentStreak(full('2026-10-13', '2026-10-14', '2026-10-15'), at(2026, 10, 15))).toBe(3);
  });

  it('keeps the streak while today is still open', () => {
    const days = { ...full('2026-10-13', '2026-10-14'), '2026-10-15': STREAK_GOAL - 1 };
    expect(currentStreak(days, at(2026, 10, 15))).toBe(2);
  });

  it('breaks after a missed day', () => {
    expect(currentStreak(full('2026-10-12', '2026-10-13'), at(2026, 10, 15))).toBe(0);
  });

  it('does not count a day short of the goal', () => {
    const days = { ...full('2026-10-13', '2026-10-15'), '2026-10-14': STREAK_GOAL - 1 };
    expect(currentStreak(days, at(2026, 10, 15))).toBe(1);
  });

  it('crosses month and year ends', () => {
    expect(currentStreak(full('2025-12-30', '2025-12-31', '2026-01-01'), at(2026, 1, 1))).toBe(3);
    expect(currentStreak(full('2026-02-28', '2026-03-01'), at(2026, 3, 1))).toBe(2);
  });

  it('takes a custom goal', () => {
    expect(currentStreak({ '2026-10-15': 3 }, at(2026, 10, 15), 3)).toBe(1);
  });
});

describe('longestStreak', () => {
  it('finds the longest run anywhere', () => {
    const days = full('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11');
    expect(longestStreak(days)).toBe(3);
  });

  it('ignores unfinished days', () => {
    expect(longestStreak({ '2026-09-01': STREAK_GOAL, '2026-09-02': 1, '2026-09-03': STREAK_GOAL })).toBe(1);
    expect(longestStreak({})).toBe(0);
  });
});

describe('addStreakTasks', () => {
  it('adds to the day of the moment', () => {
    let days: StreakDays = {};
    days = addStreakTasks(days, at(2026, 10, 15, 9), 1);
    days = addStreakTasks(days, at(2026, 10, 15, 22), 5);
    days = addStreakTasks(days, at(2026, 10, 16, 0), 1);
    expect(days).toEqual({ '2026-10-15': 6, '2026-10-16': 1 });
  });

  it('drops days past the kept window', () => {
    const now = at(2026, 10, 15);
    const old = dayKey(new Date(2026, 9, 15 - STREAK_KEEP_DAYS - 1));
    const kept = dayKey(new Date(2026, 9, 15 - STREAK_KEEP_DAYS));
    const days = addStreakTasks({ [old]: 10, [kept]: 10 }, now, 1);
    expect(days[old]).toBeUndefined();
    expect(days[kept]).toBe(10);
  });
});

describe('mergeStreakDays', () => {
  it('keeps the larger count of each day', () => {
    expect(mergeStreakDays({ a: 3, b: 10 }, { b: 4, c: 7 })).toEqual({ a: 3, b: 10, c: 7 });
  });
});
