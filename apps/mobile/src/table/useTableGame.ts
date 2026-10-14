import { createBot, type Bot } from '@pokerall/bots';
import {
  allInSplit,
  applyAction,
  boardAtLastDecision,
  createSeededRng,
  historyOf,
  shuffle,
  shuffledDeck,
  startHand,
  viewFor,
  type AllInSplit,
  type HandState,
  type Card,
  type PlayerAction,
  type Rng,
} from '@pokerall/poker-engine';
import { getRandomBytes } from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

import { botIsReady, botsInLeague, type LeagueId } from '@/bots/catalog';
import { useHands } from '@/store/hands';
import { useLifetime } from '@/store/lifetime';
// The only place outside the training module allowed to use it (checked in CI): offline practice matches.
import {
  createTrainingBot,
  evNetOf,
  isBadBeat,
  isTrainingBot,
  type TrainingBot,
  type TrainingReport,
} from '@/training';

export const SMALL_BLIND = 50;
export const BIG_BLIND = 100;
export const STARTING_STACK = 100 * BIG_BLIND;

/** Pauses of an all-in runout: a look at both hands, then each street, then the result. */
const RUNOUT_FIRST = 1000;
const RUNOUT_STEP = 1200;
const RUNOUT_RESULT = 800;
/** Extra thinking time on a new street, so the dealt cards land before anyone acts. */
const NEW_STREET_PAUSE = 700;

export type TableMode = { kind: 'hu'; botId: string } | { kind: 'six'; league: LeagueId };

export type SeatInfo = { kind: 'hero' } | { kind: 'bot'; botId: string };

export type PhraseCategory = 'greet' | 'win' | 'lose' | 'allin' | 'bust' | 'victory' | 'idle';

/** A line said by a bot; `key` changes for every new line so the UI can animate it. */
export type Speech = { category: PhraseCategory; pick: number; key: number };

/** `runout`: the hand is decided by an all-in and the rest of the board is being opened. */
export type TableStatus = 'acting' | 'runout' | 'hand-over' | 'match-over' | 'hero-busted';

export type MatchResult = {
  heroWon: boolean;
  hands: number;
  /** Against a training bot: what the match showed, revealed at the end. */
  training: TrainingReport | null;
};

/** A finished hand as the table settled it. */
export type HandRecord = {
  /** Id of the hand in "My hands". */
  id: string;
  hand: HandState;
  /** Set when an all-in before the river was settled by equity (heads-up matches). */
  split: AllInSplit | null;
  /** Chips each seat won from the pots, by equity when `split` is set. */
  won: number[];
  /** Change of each seat's stack over the hand. */
  net: number[];
  /** Stacks after the hand; the next hand starts with them. */
  stacks: number[];
  /** Against a training bot: the hero's result counting all-ins by equity; all-ins there aren't split. */
  heroEvNet: number | null;
};

export type TableGame = {
  seats: SeatInfo[];
  hand: HandState;
  handNumber: number;
  status: TableStatus;
  speech: (Speech | null)[];
  /** Board cards on show: fewer than dealt while an all-in runout is being opened street by street. */
  boardShown: number;
  /** How the current hand was settled, once it's over and fully shown. */
  settled: HandRecord | null;
  /** Every finished hand of this match, oldest first. */
  history: HandRecord[];
  /** Set a moment after a heads-up match ends, when the result screen should appear. */
  result: MatchResult | null;
  /** True when the hero has a decision to make. */
  heroTurn: boolean;
  act: (action: PlayerAction) => void;
  /** Deals the next hand now instead of waiting. */
  nextHand: () => void;
  /** After going broke at a practice table. */
  rebuy: () => void;
};

const HERO = 0;
const TRAINER_SEAT = 1;

type Setup = {
  /** Id of the match, shared by its hands in "My hands". */
  matchId: string;
  rng: Rng;
  seats: SeatInfo[];
  bots: (Bot | null)[];
  /** A training bot in seat 1 (heads-up only): it gets the whole hand state, not a player's view. */
  trainer: TrainingBot | null;
  firstHand: HandState;
};

/** Bots at a practice table: up to five different playable bots of the league, filling with repeats. */
function pickTableBots(league: LeagueId, rng: Rng): string[] {
  const pool = botsInLeague(league)
    .filter((b) => botIsReady(b.id) && !isTrainingBot(b.id))
    .map((b) => b.id);
  const fallback = botsInLeague('novices').map((b) => b.id);
  const shuffled = shuffle(pool.length ? pool : fallback, rng);
  return Array.from({ length: 5 }, (_, i) => shuffled[i % shuffled.length]!);
}

function dealHand(stacks: number[], button: number, rng: Rng, trainer: TrainingBot | null): HandState {
  const deal = (deck: Card[]) =>
    startHand(
      {
        players: stacks.map((stack, i) => ({ id: String(i), stack })),
        button,
        smallBlind: SMALL_BLIND,
        bigBlind: BIG_BLIND,
      },
      deck,
    );
  return trainer ? trainer.dealHand(deal, TRAINER_SEAT, rng) : deal(shuffledDeck(rng));
}

function createSetup(mode: TableMode): Setup {
  const rng = createSeededRng(getRandomBytes(32));
  const seats: SeatInfo[] =
    mode.kind === 'hu'
      ? [{ kind: 'hero' }, { kind: 'bot', botId: mode.botId }]
      : [{ kind: 'hero' }, ...pickTableBots(mode.league, rng).map((botId) => ({ kind: 'bot' as const, botId }))];
  const trainer = mode.kind === 'hu' && isTrainingBot(mode.botId) ? createTrainingBot(mode.botId) : null;
  // A fresh bot per seat and match: some bots remember the match (tilt, impatience, your habits).
  const bots = seats.map((s) => (s.kind === 'bot' && !trainer ? createBot(s.botId) : null));
  const firstHand = dealHand(
    seats.map(() => STARTING_STACK),
    rng.nextInt(seats.length),
    rng,
    trainer,
  );
  const matchId = `${Date.now().toString(36)}${rng.nextInt(1 << 30).toString(36)}`;
  return { matchId, rng, seats, bots, trainer, firstHand };
}

/**
 * Settles a finished hand. In heads-up matches an all-in before the river is settled by equity, so the
 * cards that come after it don't decide the match; practice tables keep the usual rules.
 */
function settle(id: string, hand: HandState, byEquity: boolean, rng: Rng, trainer: TrainingBot | null): HandRecord {
  const result = hand.result!;
  const split = byEquity && !trainer ? allInSplit(hand, { rng }) : null;
  const won = split ? split.won : result.won;
  const net = split ? split.net : result.net;
  // The engine already paid the pots by the runout; swap that for the split.
  const stacks = hand.players.map((p) => p.stack - result.won[p.seat]! + won[p.seat]!);
  return { id, hand, split, won, net, stacks, heroEvNet: trainer ? evNetOf(hand, HERO, rng) : null };
}

/** Keeps a finished hand in "My hands". */
function saveHand(record: HandRecord, matchId: string, mode: TableMode, seats: SeatInfo[]) {
  const hand = record.hand;
  const hero = hand.players[HERO]!;
  const showdown = hand.events.some((e) => e.type === 'showdown');
  useLifetime.getState().addHand(showdown && !hero.folded && record.won[HERO]! > 0);
  useHands.getState().add({
    id: record.id,
    matchId,
    at: Date.now(),
    mode: mode.kind,
    botId: mode.kind === 'hu' ? mode.botId : null,
    league: mode.kind === 'six' ? mode.league : null,
    seats,
    hero: HERO,
    position: hand.players[HERO]!.position,
    history: historyOf(hand),
    net: record.net[HERO]!,
    equity: record.split ? record.split.equity : null,
    flagged: false,
  });
}

/** The end-of-match reveal against a training bot. */
function reportOf(trainer: TrainingBot, records: HandRecord[]): TrainingReport {
  let realNet = 0;
  let evNet = 0;
  let badBeats = 0;
  for (const r of records) {
    realNet += r.net[HERO]!;
    evNet += r.heroEvNet ?? r.net[HERO]!;
    if (isBadBeat(r.hand, HERO)) badBeats += 1;
  }
  return { botId: trainer.id as TrainingReport['botId'], realNet, evNet, badBeats, riggedHands: trainer.riggedHands() };
}

/**
 * Runs a match against bots on the device: deals hands, lets bots act after a short pause, opens all-in
 * runouts street by street and keeps the stacks between hands. Bots only ever see `viewFor(hand, seat)`,
 * never other players' cards; the one exception is a training bot that cheats on purpose, offline.
 */
export function useTableGame(mode: TableMode, onMatchOver?: (result: MatchResult) => void): TableGame {
  // The table is fixed for the whole match; the screen remounts for a new one.
  const [{ matchId, rng, seats, bots, trainer, firstHand }] = useState(() => createSetup(mode));
  const [hand, setHand] = useState<HandState>(firstHand);
  const [handNumber, setHandNumber] = useState(1);
  const [status, setStatus] = useState<TableStatus>('acting');
  const [speech, setSpeech] = useState<(Speech | null)[]>(() => seats.map(() => null));
  const [boardShown, setBoardShown] = useState(0);
  const [settled, setSettled] = useState<HandRecord | null>(null);
  const [history, setHistory] = useState<HandRecord[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);

  const speechKey = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMatchOverRef = useRef(onMatchOver);

  useEffect(() => {
    onMatchOverRef.current = onMatchOver;
  }, [onMatchOver]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
      if (dealTimer.current) clearTimeout(dealTimer.current);
    },
    [],
  );

  const say = useCallback(
    (seat: number, category: PhraseCategory, probability = 1) => {
      if (seats[seat]?.kind !== 'bot' || rng.nextInt(1000) >= probability * 1000) return;
      const line: Speech = { category, pick: rng.nextInt(1000), key: ++speechKey.current };
      setSpeech((prev) => prev.map((s, i) => (i === seat ? line : s)));
      later(3200, () => setSpeech((prev) => prev.map((s, i) => (i === seat && s?.key === line.key ? null : s))));
    },
    [later, rng, seats],
  );

  // Greetings when everyone sits down.
  useEffect(() => {
    seats.forEach((s, i) => {
      if (s.kind === 'bot') later(400 + i * 250, () => say(i, 'greet', mode.kind === 'hu' ? 1 : 0.35));
    });
  }, [later, mode.kind, say, seats]);

  /** Deals the hand after `prev` with the stacks it ended with; the button moves one seat. */
  const deal = useCallback(
    (prev: HandRecord, rebuyHero = false) => {
      if (dealTimer.current) clearTimeout(dealTimer.current);
      dealTimer.current = null;
      const stacks = prev.stacks.map((stack, i) => {
        if (stack > 0) return stack;
        // Practice tables: busted bots come back with a fresh stack, the hero when they choose to.
        return i === HERO ? (rebuyHero ? STARTING_STACK : 0) : STARTING_STACK;
      });
      if (stacks[HERO] === 0) return;
      setHand(dealHand(stacks, (prev.hand.button + 1) % seats.length, rng, trainer));
      setHandNumber((n) => n + 1);
      setBoardShown(0);
      setSettled(null);
      setStatus('acting');
    },
    [rng, seats.length, trainer],
  );

  const finishHand = useCallback(
    (record: HandRecord) => {
      const state = record.hand;
      const showdown = state.events.some((e) => e.type === 'showdown');
      // Bots see how the hand ended (shown cards included) and learn from it.
      bots.forEach((bot, seat) => bot?.handFinished?.(viewFor(state, seat)));
      trainer?.handFinished(state, TRAINER_SEAT);
      saveHand(record, matchId, mode, seats);
      setSettled(record);
      setHistory((h) => [...h, record]);

      // Chat reactions.
      state.players.forEach((p, seat) => {
        if (seats[seat]?.kind !== 'bot') return;
        const net = record.net[seat]!;
        if (net >= 15 * BIG_BLIND) say(seat, 'win', 0.6);
        else if (showdown && !p.folded && net < -10 * BIG_BLIND) say(seat, 'lose', 0.5);
        else say(seat, 'idle', 0.05);
      });

      const heroStack = record.stacks[HERO]!;
      const pause = showdown ? 3400 : 2000;
      if (mode.kind === 'hu') {
        const botStack = record.stacks[1]!;
        if (heroStack === 0 || botStack === 0) {
          const outcome: MatchResult = {
            heroWon: botStack === 0,
            hands: handNumber,
            training: trainer ? reportOf(trainer, [...history, record]) : null,
          };
          say(1, outcome.heroWon ? 'bust' : 'victory');
          setStatus('match-over');
          later(pause, () => {
            setResult(outcome);
            onMatchOverRef.current?.(outcome);
          });
          return;
        }
      } else if (heroStack === 0) {
        setStatus('hero-busted');
        return;
      }
      setStatus('hand-over');
      dealTimer.current = setTimeout(() => deal(record), pause);
    },
    [bots, deal, handNumber, history, later, matchId, mode, say, seats, trainer],
  );

  /** Applies an action and moves the hand forward. */
  const advance = useCallback(
    (state: HandState, action: PlayerAction) => {
      const seat = state.toAct!;
      const next = applyAction(state, action);
      const last = next.events.findLast((e) => e.type === 'action');
      if (last?.type === 'action' && last.allIn && seats[seat]?.kind === 'bot') say(seat, 'allin', 0.7);
      setHand(next);
      if (next.phase !== 'complete') {
        setBoardShown(next.board.length);
        return;
      }
      const record = settle(`${matchId}-${handNumber}`, next, mode.kind === 'hu', rng, trainer);
      const from = boardAtLastDecision(next).length;
      if (from >= next.board.length) {
        setBoardShown(next.board.length);
        finishHand(record);
        return;
      }
      // All-in: both hands are face up, then the rest of the board comes one street at a time.
      setStatus('runout');
      setBoardShown(from);
      const streets = [3, 4, 5].filter((count) => count > from);
      streets.forEach((count, i) => later(RUNOUT_FIRST + i * RUNOUT_STEP, () => setBoardShown(count)));
      later(RUNOUT_FIRST + (streets.length - 1) * RUNOUT_STEP + RUNOUT_RESULT, () => finishHand(record));
    },
    [finishHand, handNumber, later, matchId, mode.kind, rng, say, seats, trainer],
  );

  // Bots take their turns after a short, human-looking pause.
  useEffect(() => {
    if (status !== 'acting' || hand.toAct === null || hand.toAct === HERO) return;
    const seat = hand.toAct;
    const bot = bots[seat];
    const freshStreet = hand.events[hand.events.length - 1]?.type === 'street';
    const thinking =
      550 + rng.nextInt(750) + (hand.phase === 'preflop' ? 0 : 250) + (freshStreet ? NEW_STREET_PAUSE : 0);
    // A training bot gets the whole hand (Danil sees every card); every other bot only its own view.
    const decide = () =>
      trainer && seat === TRAINER_SEAT ? trainer.decide(hand, seat, rng) : bot!.decide(viewFor(hand, seat), rng);
    const timer = setTimeout(() => advance(hand, decide()), thinking);
    return () => clearTimeout(timer);
  }, [advance, bots, hand, rng, status, trainer]);

  const act = useCallback(
    (action: PlayerAction) => {
      if (hand.toAct !== HERO || status !== 'acting') return;
      advance(hand, action);
    },
    [advance, hand, status],
  );

  const nextHand = useCallback(() => {
    if (status === 'hand-over' && settled) deal(settled);
  }, [deal, settled, status]);

  const rebuy = useCallback(() => {
    if (status === 'hero-busted' && settled) deal(settled, true);
  }, [deal, settled, status]);

  return {
    seats,
    hand,
    handNumber,
    status,
    speech,
    boardShown,
    settled,
    history,
    result,
    heroTurn: status === 'acting' && hand.toAct === HERO,
    act,
    nextHand,
    rebuy,
  };
}
