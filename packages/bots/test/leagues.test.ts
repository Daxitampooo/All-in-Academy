import { describe, expect, it } from 'vitest';

import {
  applyAction,
  arrangeDeck,
  createSeededRng,
  parseCards,
  seedFromHex,
  startHand,
  viewFor,
  type Card,
  type HandEvent,
  type HandState,
  type PlayerAction,
} from '@pokerall/poker-engine';

import {
  AMATEUR_BOTS,
  BOT_FACTORIES,
  DEFAULT_PROFILE,
  OpponentModel,
  REGULAR_BOTS,
  SizingTells,
  createBot,
  estimateEquity,
  estimateEquityVsReads,
  isPlayable,
  profileBot,
  readsFromView,
  simulateTable,
  type Bot,
} from '../src';

const rng = (byte: string) => createSeededRng(seedFromHex(byte.repeat(32)));
const two = (t: string) => parseCards(t) as unknown as [Card, Card];

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

/** Wraps a bot to keep every view it was shown and every hand it saw finish. */
function watched(bot: Bot, log: { views: ReturnType<typeof viewFor>[]; finished: ReturnType<typeof viewFor>[] }): Bot {
  return {
    id: bot.id,
    decide(view, r) {
      log.views.push(view);
      return bot.decide(view, r);
    },
    handFinished(view) {
      log.finished.push(view);
      bot.handFinished?.(view);
    },
  };
}

const actionsOf = (views: ReturnType<typeof viewFor>[], seat: (v: ReturnType<typeof viewFor>) => number) =>
  views.flatMap((v) => v.events.filter((e): e is Extract<HandEvent, { type: 'action' }> => e.type === 'action' && e.seat === seat(v)));

describe('amateurs and regulars', () => {
  const amateurs = Object.keys(AMATEUR_BOTS);
  const regulars = Object.keys(REGULAR_BOTS);

  it('are all playable and get a fresh bot every time', () => {
    for (const id of [...amateurs, ...regulars]) {
      expect(isPlayable(id)).toBe(true);
      expect(createBot(id)).not.toBe(createBot(id));
    }
    expect(Object.keys(BOT_FACTORIES)).toHaveLength(6 + amateurs.length + regulars.length);
    expect(() => createBot('nobody')).toThrow();
  });

  it('only take legal actions and never see other players cards', () => {
    for (const ids of [amateurs.slice(0, 6), regulars.slice(0, 6)]) {
      const seen: string[] = [];
      const spies: Bot[] = ids.map((id) => {
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
      simulateTable({ bots: spies, hands: 250, rng: rng('11') });
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every((s) => s === 'null')).toBe(true);
    }
  });

  it('play their styles', () => {
    const table = ['max', 'dasha', 'stas', 'roma', 'katya', 'gena'];
    const stats = simulateTable({ bots: table.map(createBot), hands: 1500, rng: rng('12') });
    const vpip = Object.fromEntries(table.map((id, i) => [id, stats[i]!.vpip / stats[i]!.hands]));
    const pfr = Object.fromEntries(table.map((id, i) => [id, stats[i]!.pfr / stats[i]!.hands]));
    expect(vpip.max).toBeGreaterThan(0.5);
    expect(pfr.max).toBeGreaterThan(pfr.katya!);
    expect(pfr.gena).toBeLessThan(0.12);
  });

  it('Igor jams his 3-bets and plays push or fold when stacks are short', () => {
    const log = { views: [] as ReturnType<typeof viewFor>[], finished: [] as ReturnType<typeof viewFor>[] };
    const igor = watched(createBot('igor'), log);
    simulateTable({ bots: [yardstick(), igor], hands: 1500, rng: rng('13') });
    // A re-raise over someone else's raise is always all-in.
    let reRaises = 0;
    for (const v of log.finished) {
      let raisesBefore = 0;
      for (const e of v.events) {
        if (e.type !== 'action' || e.street !== 'preflop') continue;
        if (e.seat === v.seat && e.action === 'raise' && raisesBefore >= 1) {
          reRaises += 1;
          expect(e.allIn).toBe(true);
        }
        if (e.action === 'raise') raisesBefore += 1;
      }
    }
    expect(reRaises).toBeGreaterThan(5);
    // With 20 big blinds he only ever moves all-in or folds.
    const short = createBot('igor');
    const r = rng('18');
    for (let i = 0; i < 40; i++) {
      const s = startHand(
        { players: [{ id: 'a', stack: 2000 }, { id: 'b', stack: 2000 }], button: 1, smallBlind: 50, bigBlind: 100 },
        arrangeDeck({ playerCount: 2, button: 1, rng: r }),
      );
      const action = short.decide(viewFor(s, 1), r);
      expect(['fold', 'raise']).toContain(action.type);
      if (action.type === 'raise') expect(action.amount).toBe(2000);
    }
  });

  it('Armen plays looser the longer the evening goes', () => {
    const log = { views: [] as ReturnType<typeof viewFor>[], finished: [] as ReturnType<typeof viewFor>[] };
    simulateTable({ bots: [yardstick(), watched(createBot('armen'), log)], hands: 400, rng: rng('14') });
    const played = (from: number, to: number) => {
      const hands = log.finished.slice(from, to);
      const voluntary = hands.filter((v) =>
        v.events.some((e) => e.type === 'action' && e.seat === v.seat && e.street === 'preflop' && (e.action === 'call' || e.action === 'raise')),
      );
      return voluntary.length / hands.length;
    };
    expect(played(300, 400)).toBeGreaterThan(played(0, 30) + 0.1);
  });

  it('Dasha gives up against big bets far more often than Roma', () => {
    const foldsToBigBets = (id: string) => {
      const log = { views: [] as ReturnType<typeof viewFor>[], finished: [] as ReturnType<typeof viewFor>[] };
      const bettor = profileBot('bettor', { ...DEFAULT_PROFILE, aggression: 0.9, bluff: 0.5, sizes: { open: 2.5, bet: 1, raise: 1 } });
      simulateTable({ bots: [bettor, watched(createBot(id), log)], hands: 1200, rng: rng('15') });
      let faced = 0;
      let folded = 0;
      for (const v of log.views) {
        if (v.phase === 'preflop' || !v.legal || v.legal.callAmount === 0) continue;
        if (v.legal.callAmount < 0.7 * (v.pot - v.legal.callAmount)) continue;
        faced += 1;
        const next = log.finished.find((f) => f.events.length > v.events.length && f.events[v.events.length - 1] === v.events[v.events.length - 1]);
        const mine = next?.events.slice(v.events.length).find((e) => e.type === 'action' && e.seat === v.seat);
        if (mine?.type === 'action' && mine.action === 'fold') folded += 1;
      }
      return folded / Math.max(1, faced);
    };
    expect(foldsToBigBets('dasha')).toBeGreaterThan(foldsToBigBets('roma') + 0.15);
  });
});

describe('reading opponents', () => {
  /** A heads-up hand where the button raises, the big blind calls, then the button bets every street. */
  function aggressiveHand(holes: [string, string], board: string): HandState {
    let s = startHand(
      { players: [{ id: 'a', stack: 10000 }, { id: 'b', stack: 10000 }], button: 0, smallBlind: 50, bigBlind: 100 },
      arrangeDeck({ playerCount: 2, button: 0, holeCards: holes.map(two), board: parseCards(board) }),
    );
    const act = (a: PlayerAction) => {
      s = applyAction(s, a);
    };
    act({ type: 'raise', amount: 300 });
    act({ type: 'call' });
    return s;
  }

  it('reads a preflop raiser as stronger than any two cards', () => {
    const s = aggressiveHand(['As Ks', '7c 2d'], 'Kh 9d 4c 2s 8h');
    const view = viewFor(s, 1);
    const [read] = readsFromView(view, null);
    expect(read!.seat).toBe(0);
    expect(read!.share).toBeLessThan(0.3);
    expect(read!.pressure).toBe(0);
  });

  it('gives a hand less equity against a range that keeps betting', () => {
    const hole = two('Jh Td');
    const board = parseCards('Js 8c 3d');
    const r = rng('16');
    const vsAny = estimateEquity(hole, board, 1, 3000, r);
    const vsBettor = estimateEquityVsReads(hole, board, [{ seat: 0, share: 0.2, pressure: 2.2 }], 3000, r);
    expect(vsBettor).toBeLessThan(vsAny - 0.1);
  });

  it('remembers how often each opponent plays and raises', () => {
    const model = new OpponentModel();
    expect(model.pfr(0)).toBeNull();
    const sims = simulateTable({
      bots: [
        profileBot('loose', { ...DEFAULT_PROFILE, positionAware: false, vpip: 0.8, pfr: 0.7 }),
        {
          id: 'watcher',
          decide: (v, r) => yardstick().decide(v, r),
          handFinished: (v) => model.observe(v),
        },
      ],
      hands: 200,
      rng: rng('17'),
    });
    expect(sims[0]!.hands).toBe(200);
    expect(model.pfr(0)!).toBeGreaterThan(0.3);
    expect(model.vpip(0)!).toBeGreaterThan(model.pfr(0)! - 0.01);
  });

  it('learns that big bets mean a strong hand', () => {
    const tells = new SizingTells();
    // Opponent (seat 0) bets the pot with a set and a third of the pot with nothing, and shows both down.
    for (const [hole, size] of [
      ['8h 8s', 1],
      ['Ah Ad', 1.2],
      ['5c 4c', 0.3],
      ['Qc 2h', 0.35],
    ] as const) {
      let s = aggressiveHand([hole, 'Kd Qd'], '8d 3c 2s Jh 9c');
      const pot = s.players.reduce((a, p) => a + p.totalBet, 0);
      s = applyAction(s, { type: 'check' });
      s = applyAction(s, { type: 'bet', amount: Math.round(pot * size) });
      s = applyAction(s, { type: 'call' });
      for (let i = 0; i < 4; i++) s = applyAction(s, { type: 'check' });
      expect(s.phase).toBe('complete');
      tells.observe(viewFor(s, 1));
    }
    expect(tells.tell(0)).toBeGreaterThan(0.2);
    expect(tells.tell(5)).toBe(0);
  });
});
