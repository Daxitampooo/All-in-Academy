import { describe, expect, it } from 'vitest';

import {
  arrangeDeck,
  createSeededRng,
  seedFromHex,
  startHand,
  viewFor,
  type HandEvent,
  type PlayerView,
} from '@pokerall/poker-engine';

import {
  BOT_FACTORIES,
  DEFAULT_PROFILE,
  MASTER_BOTS,
  PRO_BOTS,
  createBot,
  exploit,
  isPlayable,
  profileBot,
  simulateTable,
  type Bot,
  type OpponentModel,
} from '../src';

const rng = (byte: string) => createSeededRng(seedFromHex(byte.repeat(32)));

const yardstick = () =>
  profileBot('yardstick', {
    ...DEFAULT_PROFILE,
    vpip: 0.22,
    pfr: 0.18,
    threeBet: 0.06,
    foldToRaise: 0.45,
    aggression: 0.6,
    bluff: 0.12,
    accuracy: 0.9,
  });

type Action = Extract<HandEvent, { type: 'action' }>;

/** Wraps a bot to keep every finished hand it saw. */
function watched(bot: Bot, finished: PlayerView[]): Bot {
  return {
    id: bot.id,
    decide: (view, r) => bot.decide(view, r),
    handFinished(view) {
      finished.push(view);
      bot.handFinished?.(view);
    },
  };
}

/** Its own bets after the flop, as a share of the pot before the bet. */
function betRatios(finished: PlayerView[]): number[] {
  const out: number[] = [];
  for (const v of finished) {
    let pot = 0;
    let street = 'preflop';
    for (const e of v.events) {
      if (e.type === 'ante' || e.type === 'blind') pot += e.amount;
      if (e.type === 'uncalled') pot -= e.amount;
      if (e.type !== 'action') continue;
      if (e.street !== street) street = e.street;
      if (e.seat === v.seat && e.action === 'bet' && e.street !== 'preflop' && !e.allIn) out.push(e.added / pot);
      pot += e.added;
    }
  }
  return out;
}

const fakeModel = (foldToBet: number | null) => ({ foldToBet: () => foldToBet }) as unknown as OpponentModel;

describe('pros and masters', () => {
  const ids = [...Object.keys(PRO_BOTS), ...Object.keys(MASTER_BOTS)];

  it('are all playable, nine of them, with a fresh bot every time', () => {
    expect(ids).toHaveLength(9);
    for (const id of ids) {
      expect(isPlayable(id)).toBe(true);
      expect(id in BOT_FACTORIES).toBe(true);
      expect(createBot(id)).not.toBe(createBot(id));
    }
  });

  it('never get the cheating training bots', () => {
    expect(isPlayable('lekha')).toBe(false);
    expect(isPlayable('danil')).toBe(false);
  });

  it('only take legal actions and never see other players cards', () => {
    for (const table of [ids.slice(0, 5), ids.slice(4)]) {
      const seen: string[] = [];
      const spies: Bot[] = table.map((id) => {
        const bot = createBot(id);
        return {
          id,
          decide(view, r) {
            for (const p of view.players) if (p.seat !== view.seat) seen.push(String(p.holeCards));
            return bot.decide(view, r);
          },
          handFinished: (view) => bot.handFinished?.(view),
        };
      });
      simulateTable({ bots: spies, hands: 120, rng: rng('21') });
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every((s) => s === 'null')).toBe(true);
    }
  });

  it('Borya bets big, Fedor mixes his sizes', () => {
    const ratiosOf = (id: string) => {
      const finished: PlayerView[] = [];
      simulateTable({ bots: [yardstick(), watched(createBot(id), finished)], hands: 800, rng: rng('22') });
      return betRatios(finished);
    };
    const borya = ratiosOf('borya');
    expect(borya.length).toBeGreaterThan(15);
    expect(borya.filter((r) => r >= 0.95).length / borya.length).toBeGreaterThan(0.7);

    const fedor = ratiosOf('fedor');
    const buckets = new Set(fedor.map((r) => (r < 0.45 ? 'small' : r < 0.8 ? 'medium' : r < 1.2 ? 'pot' : 'over')));
    expect(buckets.size).toBeGreaterThanOrEqual(3);
  });

  it('Gleb plays push or fold with a short stack', () => {
    const gleb = createBot('gleb');
    const r = rng('23');
    for (let i = 0; i < 40; i++) {
      const s = startHand(
        { players: [{ id: 'a', stack: 1200 }, { id: 'b', stack: 1200 }], button: 1, smallBlind: 50, bigBlind: 100 },
        arrangeDeck({ playerCount: 2, button: 1, rng: r }),
      );
      const action = gleb.decide(viewFor(s, 1), r);
      expect(['fold', 'raise']).toContain(action.type);
      if (action.type === 'raise') expect(action.amount).toBe(1200);
    }
  });

  it('Alisa changes her style during a match', () => {
    const finished: PlayerView[] = [];
    simulateTable({ bots: [yardstick(), watched(createBot('alisa'), finished)], hands: 240, rng: rng('24') });
    const vpipOf = (hands: PlayerView[]) =>
      hands.filter((v) =>
        v.events.some((e): e is Action => e.type === 'action' && e.seat === v.seat && e.street === 'preflop' && (e.action === 'call' || e.action === 'raise')),
      ).length / hands.length;
    const windows = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => vpipOf(finished.slice(i * 30, i * 30 + 30)));
    expect(Math.max(...windows) - Math.min(...windows)).toBeGreaterThan(0.2);
  });

  it('exploits: bluffs more against folders and less against callers', () => {
    const base = { ...DEFAULT_PROFILE, bluff: 0.12, cbet: 0.6, valueThreshold: 0.6 };
    expect(exploit(base, fakeModel(null))).toBe(base);
    expect(exploit(base, fakeModel(0.45))).toBe(base);
    expect(exploit(base, fakeModel(0.8)).bluff).toBeGreaterThan(base.bluff);
    const vsCaller = exploit(base, fakeModel(0.2));
    expect(vsCaller.bluff).toBeLessThan(base.bluff);
    expect(vsCaller.valueThreshold).toBeLessThan(base.valueThreshold);
  });
});
