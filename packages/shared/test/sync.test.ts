import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_DEVICE,
  SYNC_MAX_DEVICES,
  SyncLimitError,
  SyncPushSchema,
  applySync,
  counterTotals,
  emptySyncDoc,
  syncView,
  type SyncDoc,
} from '../src';

const A = 'device-aaaaaaaaaaaa';
const B = 'device-bbbbbbbbbbbb';

describe('counters', () => {
  it('adds devices up and never counts a repeated sync twice', () => {
    let doc = emptySyncDoc();
    doc = applySync(doc, { deviceId: A, counters: { hands: 10 } }, 1);
    doc = applySync(doc, { deviceId: A, counters: { hands: 10 } }, 2);
    doc = applySync(doc, { deviceId: B, counters: { hands: 5, 'bot.lena.wins': 1 } }, 3);
    const view = syncView(doc, A);
    expect(view.counters.own).toEqual({ hands: 10 });
    expect(view.counters.others).toEqual({ hands: 5, 'bot.lena.wins': 1 });
    expect(counterTotals(view.counters)).toEqual({ hands: 15, 'bot.lena.wins': 1 });
  });

  it('keeps the higher number when an old sync arrives late', () => {
    let doc = emptySyncDoc();
    doc = applySync(doc, { deviceId: A, counters: { hands: 12 } }, 1);
    doc = applySync(doc, { deviceId: A, counters: { hands: 7 } }, 2);
    expect(syncView(doc, A).counters.own.hands).toBe(12);
  });

  it('a reinstalled app with empty counters gets its old numbers back', () => {
    let doc = applySync(emptySyncDoc(), { deviceId: A, counters: { hands: 40 } }, 1);
    doc = applySync(doc, { deviceId: A, counters: {} }, 2);
    expect(syncView(doc, A).counters.own.hands).toBe(40);
  });

  it('folds the devices not seen for the longest time into the archive, keeping totals', () => {
    let doc = emptySyncDoc();
    const ids = Array.from({ length: SYNC_MAX_DEVICES + 3 }, (_, i) => `device-${String(i).padStart(12, '0')}`);
    ids.forEach((id, i) => {
      doc = applySync(doc, { deviceId: id, counters: { hands: 1 } }, i + 1);
    });
    const devices = Object.keys(doc.counters).filter((id) => id !== ARCHIVE_DEVICE);
    expect(devices).toHaveLength(SYNC_MAX_DEVICES);
    expect(doc.counters[ids[0]!]).toBeUndefined();
    expect(doc.counters[ARCHIVE_DEVICE]!.values.hands).toBe(3);
    expect(counterTotals(syncView(doc, ids.at(-1)!).counters).hands).toBe(ids.length);
  });
});

describe('other sections', () => {
  it('keeps the earliest unlock, the best lesson result and the latest look', () => {
    let doc: SyncDoc = emptySyncDoc();
    doc = applySync(
      doc,
      {
        deviceId: A,
        maxima: { preflopBestStreak: 9 },
        achievements: { 'first-blood': 200, warmup: 300 },
        academy: { hands: { passed: true, best: 0.8, at: 100 } },
        looks: { selected: { felt: 'green' }, fourColor: false, updatedAt: 50 },
      },
      1,
    );
    doc = applySync(
      doc,
      {
        deviceId: B,
        maxima: { preflopBestStreak: 4 },
        achievements: { 'first-blood': 150, veteran: 900 },
        academy: { hands: { passed: false, best: 0.9, at: 120 }, odds: { passed: false, best: 0.4, at: 130 } },
        looks: { selected: { felt: 'violet' }, fourColor: true, updatedAt: 40 },
      },
      2,
    );
    expect(doc.maxima).toEqual({ preflopBestStreak: 9 });
    expect(doc.achievements).toEqual({ 'first-blood': 150, warmup: 300, veteran: 900 });
    expect(doc.academy.hands).toEqual({ passed: true, best: 0.9, at: 120 });
    expect(doc.academy.odds?.best).toBe(0.4);
    expect(doc.looks?.selected.felt).toBe('green');
    doc = applySync(doc, { deviceId: B, looks: { selected: { felt: 'violet' }, fourColor: true, updatedAt: 60 } }, 3);
    expect(doc.looks?.fourColor).toBe(true);
  });

  it('gives the same result whatever order the devices sync in', () => {
    const pushA = { deviceId: A, counters: { hands: 3 }, achievements: { x: 5 }, academy: { l: { passed: true, best: 0.5, at: 1 } } };
    const pushB = { deviceId: B, counters: { hands: 4 }, achievements: { x: 2 }, academy: { l: { passed: false, best: 1, at: 2 } } };
    const ab = applySync(applySync(emptySyncDoc(), pushA, 1), pushB, 1);
    const ba = applySync(applySync(emptySyncDoc(), pushB, 1), pushA, 1);
    expect(ab).toEqual(ba);
  });

  it('refuses to grow a section past the limit', () => {
    const many = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`k${i}`, 1]));
    let doc = applySync(emptySyncDoc(), { deviceId: A, achievements: many }, 1);
    doc = applySync(doc, { deviceId: A, achievements: Object.fromEntries(Object.keys(many).map((k) => [`${k}b`, 1])) }, 2);
    expect(() =>
      applySync(doc, { deviceId: A, achievements: Object.fromEntries(Object.keys(many).map((k) => [`${k}c`, 1])) }, 3),
    ).toThrow(SyncLimitError);
  });
});

describe('push schema', () => {
  it('accepts a normal push and rejects junk', () => {
    expect(SyncPushSchema.safeParse({ deviceId: A, counters: { hands: 1 } }).success).toBe(true);
    expect(SyncPushSchema.safeParse({ deviceId: 'short', counters: {} }).success).toBe(false);
    expect(SyncPushSchema.safeParse({ deviceId: A, counters: { hands: -1 } }).success).toBe(false);
    expect(SyncPushSchema.safeParse({ deviceId: A, counters: { 'bad key!': 1 } }).success).toBe(false);
    const tooMany = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`k${i}`, 1]));
    expect(SyncPushSchema.safeParse({ deviceId: A, counters: tooMany }).success).toBe(false);
  });
});
