import { z } from 'zod';

import type { LessonProgress, Looks, SyncPush } from './merge';

/** Request schemas for progress sync; the merge rules are in ./merge. */

const Key = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/);
const Count = z.number().int().min(0).max(1_000_000_000);
const Time = z.number().int().min(0).max(8_640_000_000_000_000);

function limitedRecord<T extends z.ZodType>(value: T, max: number) {
  return z.record(Key, value).refine((r) => Object.keys(r).length <= max, { error: 'too_many_keys' });
}

/** Random id the app makes once per install. */
export const DeviceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

export const LessonProgressSchema = z.object({
  passed: z.boolean(),
  best: z.number().min(0).max(1),
  at: Time,
});

export const LooksSchema = z.object({
  selected: limitedRecord(z.string().regex(/^[A-Za-z0-9-]{1,32}$/), 32),
  fourColor: z.boolean(),
  updatedAt: Time,
});

export const SyncPushSchema = z.object({
  deviceId: DeviceIdSchema,
  /** This device's own counters (not the totals across devices). */
  counters: limitedRecord(Count, 500).optional(),
  maxima: limitedRecord(Count, 100).optional(),
  /** Unlock time per achievement id. */
  achievements: limitedRecord(Time, 500).optional(),
  academy: limitedRecord(LessonProgressSchema, 500).optional(),
  looks: LooksSchema.optional(),
});

// The schemas must accept exactly what the merge code expects.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameTypes: [
  Same<z.infer<typeof LessonProgressSchema>, LessonProgress>,
  Same<z.infer<typeof LooksSchema>, Looks>,
  Same<z.infer<typeof SyncPushSchema>, SyncPush>,
] = [true, true, true];
void sameTypes;
