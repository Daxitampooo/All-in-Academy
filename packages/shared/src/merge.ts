/**
 * Merge rules for synced progress, without zod so the app can use them too (see ./client).
 *
 * Every section merges so that the order of syncs doesn't matter and nothing earned on one phone is lost on
 * another:
 * - counters (hands played, wins against each bot) are kept per device and added up across devices; a device
 *   only ever raises its own numbers, so syncing twice never counts anything twice;
 * - maxima (best streak) keep the highest value;
 * - achievements keep the earliest unlock time;
 * - lessons keep "passed" once passed and the best score;
 * - the table look keeps the latest choice.
 */

/** How many devices keep their own counters; older ones are folded into one archive entry. */
export const SYNC_MAX_DEVICES = 16;
/** Keys per section, against a client filling the database with junk. */
export const SYNC_MAX_KEYS = 1000;
export const ARCHIVE_DEVICE = '_archive';

export type LessonProgress = { passed: boolean; best: number; at: number };
export type Looks = { selected: Record<string, string>; fourColor: boolean; updatedAt: number };

/** What a device sends: its own counters and its view of the other sections. */
export type SyncPush = {
  deviceId: string;
  counters?: Record<string, number>;
  maxima?: Record<string, number>;
  achievements?: Record<string, number>;
  academy?: Record<string, LessonProgress>;
  looks?: Looks;
};

export type DeviceCounters = { seen: number; values: Record<string, number> };

/** Everything the server keeps for one account. */
export type SyncDoc = {
  counters: Record<string, DeviceCounters>;
  maxima: Record<string, number>;
  achievements: Record<string, number>;
  academy: Record<string, LessonProgress>;
  looks: Looks | null;
};

/** What a device gets back: the merged progress, with counters split into its own part and everyone else's. */
export type SyncState = {
  counters: { own: Record<string, number>; others: Record<string, number> };
  maxima: Record<string, number>;
  achievements: Record<string, number>;
  academy: Record<string, LessonProgress>;
  looks: Looks | null;
};

export function emptySyncDoc(): SyncDoc {
  return { counters: {}, maxima: {}, achievements: {}, academy: {}, looks: null };
}

export function mergeMax(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

/** Earliest time wins: an achievement is dated by the first device that opened it. */
export function mergeEarliest(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? Math.min(out[k]!, v) : v;
  return out;
}

export function mergeLessons(
  a: Record<string, LessonProgress>,
  b: Record<string, LessonProgress>,
): Record<string, LessonProgress> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    out[k] = prev ? { passed: prev.passed || v.passed, best: Math.max(prev.best, v.best), at: Math.max(prev.at, v.at) } : v;
  }
  return out;
}

/** The later choice wins; on a tie the stored one stays. */
export function mergeLooks(stored: Looks | null, incoming: Looks | undefined): Looks | null {
  if (!incoming) return stored;
  if (!stored || incoming.updatedAt > stored.updatedAt) return incoming;
  return stored;
}

function sumInto(target: Record<string, number>, values: Record<string, number>): void {
  for (const [k, v] of Object.entries(values)) target[k] = (target[k] ?? 0) + v;
}

/**
 * Raises this device's counters and, when there are too many devices, folds the ones not seen for the longest
 * time into the archive entry (their numbers keep counting in the totals).
 */
export function mergeCounters(
  stored: Record<string, DeviceCounters>,
  deviceId: string,
  values: Record<string, number>,
  now: number,
): Record<string, DeviceCounters> {
  const out: Record<string, DeviceCounters> = { ...stored };
  const prev = out[deviceId];
  out[deviceId] = { seen: now, values: mergeMax(prev?.values ?? {}, values) };
  const devices = Object.keys(out).filter((id) => id !== ARCHIVE_DEVICE);
  if (devices.length > SYNC_MAX_DEVICES) {
    const oldest = devices
      .filter((id) => id !== deviceId)
      .sort((x, y) => out[x]!.seen - out[y]!.seen)
      .slice(0, devices.length - SYNC_MAX_DEVICES);
    const archive = { ...(out[ARCHIVE_DEVICE]?.values ?? {}) };
    for (const id of oldest) {
      sumInto(archive, out[id]!.values);
      delete out[id];
    }
    out[ARCHIVE_DEVICE] = { seen: 0, values: archive };
  }
  return out;
}

export class SyncLimitError extends Error {
  constructor(readonly section: string) {
    super(`Too many keys in ${section}`);
  }
}

function countKeys(doc: SyncDoc): Record<string, number> {
  const counterKeys = new Set<string>();
  for (const d of Object.values(doc.counters)) for (const k of Object.keys(d.values)) counterKeys.add(k);
  return {
    counters: counterKeys.size,
    maxima: Object.keys(doc.maxima).length,
    achievements: Object.keys(doc.achievements).length,
    academy: Object.keys(doc.academy).length,
  };
}

/** Merges what a device sent into the stored progress. Throws SyncLimitError when a section grows too big. */
export function applySync(doc: SyncDoc, push: SyncPush, now: number): SyncDoc {
  const next: SyncDoc = {
    counters: push.counters ? mergeCounters(doc.counters, push.deviceId, push.counters, now) : doc.counters,
    maxima: push.maxima ? mergeMax(doc.maxima, push.maxima) : doc.maxima,
    achievements: push.achievements ? mergeEarliest(doc.achievements, push.achievements) : doc.achievements,
    academy: push.academy ? mergeLessons(doc.academy, push.academy) : doc.academy,
    looks: mergeLooks(doc.looks, push.looks),
  };
  for (const [section, count] of Object.entries(countKeys(next))) {
    if (count > SYNC_MAX_KEYS) throw new SyncLimitError(section);
  }
  return next;
}

/** The merged progress as one device should see it. */
export function syncView(doc: SyncDoc, deviceId: string): SyncState {
  const others: Record<string, number> = {};
  for (const [id, d] of Object.entries(doc.counters)) if (id !== deviceId) sumInto(others, d.values);
  return {
    counters: { own: { ...(doc.counters[deviceId]?.values ?? {}) }, others },
    maxima: doc.maxima,
    achievements: doc.achievements,
    academy: doc.academy,
    looks: doc.looks,
  };
}

/** Totals across devices, for code that only needs the numbers. */
export function counterTotals(state: SyncState['counters']): Record<string, number> {
  const out = { ...state.others };
  sumInto(out, state.own);
  return out;
}
