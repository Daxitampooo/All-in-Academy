import { describe, expect, it } from 'vitest';

import { createSeededRng, parseCards, seedFromHex, type Card } from '@pokerall/poker-engine';

import {
  DEFAULT_PROFILE,
  NOVICE_BOTS,
  estimateEquity,
  handFeatures,
  playHeadsUpMatch,
  preflopStrength,
  profileBot,
  simulateTable,
  type Bot,
} from '../src';

const rng = (byte: string) => createSeededRng(seedFromHex(byte.repeat(32)));
const two = (t: string) => parseCards(t) as unknown as [Card, Card];

/** A solid tight-aggressive regular, used as the yardstick novices must lose to. */
const regular = profileBot('regular', {
  ...DEFAULT_PROFILE,
  vpip: 0.22,
  pfr: 0.18,
  threeBet: 0.06,
  foldToRaise: 0.45,
  aggression: 0.6,
  bluff: 0.12,
  accuracy: 0.9,
  valueThreshold: 0.6,
});

describe('hand strength helpers', () => {
  it('ranks starting hands', () => {
    expect(preflopStrength(two('As Ah')).percentile).toBeLessThan(0.01);
    expect(preflopStrength(two('7c 2d')).percentile).toBeGreaterThan(0.9);
    expect(preflopStrength(two('Ah Kh')).equity).toBeGreaterThan(preflopStrength(two('Ah Kd')).equity);
  });

  it('finds draws and pairs that use a hole card', () => {
    const fd = handFeatures(two('Ah 5h'), parseCards('Kh 9h 2c'));
    expect(fd).toMatchObject({ flushDraw: true, pairWithHole: false });
    const oesd = handFeatures(two('9c 8d'), parseCards('7h 6s Kc'));
    expect(oesd.straightDrawRanks).toBe(2);
    const gut = handFeatures(two('9c 8d'), parseCards('7h 5s Kc'));
    expect(gut.straightDrawRanks).toBe(1);
    expect(handFeatures(two('Kd 3c'), parseCards('Kh 9h 2c')).pairWithHole).toBe(true);
    expect(handFeatures(two('Ad Kc'), parseCards('Jh 9h 2c')).overcards).toBe(true);
    // A straight draw that lives entirely on the board doesn't count.
    expect(handFeatures(two('2d 2c'), parseCards('9h 8s 7c 6d')).straightDrawRanks).toBe(0);
  });

  it('estimates equity close to the exact value', () => {
    // Top set against one random hand on a dry flop is ~95%+.
    const e = estimateEquity(two('Ks Kd'), parseCards('Kh 7c 2d'), 1, 3000, rng('01'));
    expect(e).toBeGreaterThan(0.93);
    const air = estimateEquity(two('3c 2d'), parseCards('Ah Kh Qh'), 1, 3000, rng('02'));
    expect(air).toBeLessThan(0.2);
  });
});

describe('novice bots', () => {
  const ids = ['barsik', 'timokha', 'kolyan', 'gosha', 'zina', 'liza'] as const;
  const table: Bot[] = ids.map((id) => NOVICE_BOTS[id]());

  it('only ever take legal actions and never see other players cards', () => {
    const seen: string[] = [];
    const spy: Bot[] = table.map((bot) => ({
      id: bot.id,
      decide(view, r) {
        for (const p of view.players) if (p.seat !== view.seat && view.phase !== 'complete') seen.push(String(p.holeCards));
        return bot.decide(view, r);
      },
    }));
    simulateTable({ bots: spy, hands: 300, rng: rng('03') });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((s) => s === 'null')).toBe(true);
  });

  it('play their styles', () => {
    const stats = simulateTable({ bots: table, hands: 2500, rng: rng('04') });
    const by = Object.fromEntries(
      ids.map((id, i) => [id, { vpip: stats[i]!.vpip / stats[i]!.hands, pfr: stats[i]!.pfr / stats[i]!.hands }]),
    );
    expect(by.kolyan!.vpip).toBeGreaterThan(0.45);
    expect(by.kolyan!.pfr).toBeLessThan(0.03);
    expect(by.gosha!.pfr).toBeLessThan(0.03);
    expect(by.gosha!.vpip).toBeGreaterThan(0.3);
    expect(by.zina!.vpip).toBeLessThan(0.12);
    expect(by.zina!.pfr / by.zina!.vpip).toBeGreaterThan(0.5);
    expect(by.liza!.vpip).toBeGreaterThan(0.4);
    expect(by.barsik!.vpip).toBeGreaterThan(0.4);
    for (const id of ids) if (id !== 'zina') expect(by[id]!.vpip).toBeGreaterThan(by.zina!.vpip);
  });

  it('lose chips to a solid regular heads-up', () => {
    for (const id of ids) {
      const stats = simulateTable({ bots: [regular, NOVICE_BOTS[id]()], hands: 1500, rng: rng('05') });
      expect(stats[0]!.net, `regular vs ${id}`).toBeGreaterThan(0);
    }
  }, 120_000);

  it('can finish a heads-up match to the bust', () => {
    const result = playHeadsUpMatch({ bots: [regular, NOVICE_BOTS.kolyan()], rng: rng('06'), maxHands: 2000 });
    expect(result.winner).not.toBeNull();
  });

  it('decide quickly', () => {
    const start = Date.now();
    simulateTable({ bots: table, hands: 200, rng: rng('07') });
    expect(Date.now() - start).toBeLessThan(10_000);
  });
});
