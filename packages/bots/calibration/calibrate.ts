/**
 * Bot strength calibration. A fixed yardstick regular plays heads-up matches to the bust against fresh
 * copies of each bot, the way players meet bots in the app (100 big blinds each, all-ins settled by
 * equity). Reported: the yardstick's share of matches won (higher means an easier bot), average match
 * length, and the bot's VPIP and PFR.
 *
 *   CALIBRATE=1 BOTS=max,dasha MATCHES=400 pnpm --filter @pokerall/bots exec vitest run --reporter=verbose
 */
import { appendFileSync } from 'node:fs';

import { it } from 'vitest';

import { createSeededRng, seedFromHex } from '@pokerall/poker-engine';

import { DEFAULT_PROFILE, createBot, playHeadsUpMatch, profileBot, type Bot } from '../src';

/** The same tight-aggressive yardstick the novice tests use. */
export const yardstick = () =>
  profileBot('yardstick', {
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

/** Wraps a bot to count its preflop habits. */
function counting(bot: Bot, tally: { hands: number; vpip: number; pfr: number }): Bot {
  return {
    id: bot.id,
    decide: (view, rng) => bot.decide(view, rng),
    handFinished(view) {
      tally.hands += 1;
      const pre = view.events.filter((e) => e.type === 'action' && e.street === 'preflop' && e.seat === view.seat);
      if (pre.some((e) => e.type === 'action' && (e.action === 'call' || e.action === 'raise'))) tally.vpip += 1;
      if (pre.some((e) => e.type === 'action' && e.action === 'raise')) tally.pfr += 1;
      bot.handFinished?.(view);
    },
  };
}

/** YARD=artem measures against a played bot instead, for the stronger leagues. */
const opponent = (): Bot => (process.env.YARD ? createBot(process.env.YARD) : yardstick());

it('calibrates', () => {
  const ids = (process.env.BOTS ?? '').split(',').filter(Boolean);
  const matches = Number(process.env.MATCHES ?? 300);
  const rng = createSeededRng(seedFromHex('c4'.repeat(32)));
  for (const id of ids) {
    const start = Date.now();
    const tally = { hands: 0, vpip: 0, pfr: 0 };
    let yardstickWins = 0;
    let hands = 0;
    for (let m = 0; m < matches; m++) {
      const bot = counting(createBot(id), tally);
      // Alternate seats so the first button doesn't favour anyone.
      const flip = m % 2 === 1;
      const result = playHeadsUpMatch({ bots: flip ? [bot, opponent()] : [opponent(), bot], rng, maxHands: 600, byEquity: true });
      hands += result.hands;
      if (result.winner !== null && (result.winner === 0) !== flip) yardstickWins += 1;
    }
    const line = JSON.stringify({
        id,
        yardstickWins: Math.round((yardstickWins / matches) * 100),
        avgHands: Math.round(hands / matches),
        vpip: +(tally.vpip / tally.hands).toFixed(2),
        pfr: +(tally.pfr / tally.hands).toFixed(2),
        secs: Math.round((Date.now() - start) / 1000),
    });
    console.log(line);
    // Results also go to a file as they come, for long runs in the background.
    if (process.env.OUT) appendFileSync(process.env.OUT, line + '\n');
  }
}, 3_600_000);
