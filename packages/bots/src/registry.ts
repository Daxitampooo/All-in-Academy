import { AMATEUR_BOTS } from './amateurs';
import { NOVICE_BOTS } from './novices';
import { REGULAR_BOTS } from './regulars';
import type { Bot } from './types';

/**
 * Bots that can be played, as factories: every match gets a fresh bot, because some bots remember the
 * match (tilt, impatience, what they learned about you). Ids match the bot catalog in the app; bots that
 * aren't here yet are shown as "coming soon".
 *
 * Special training bots that cheat on purpose (a rigged deck, seeing all cards) are NOT part of this
 * package: they live in the mobile app's offline training module and never reach multiplayer code.
 */
export const BOT_FACTORIES: Record<string, () => Bot> = {
  ...NOVICE_BOTS,
  ...AMATEUR_BOTS,
  ...REGULAR_BOTS,
};

/** A fresh bot for one match. */
export function createBot(id: string): Bot {
  const make = BOT_FACTORIES[id];
  if (!make) throw new Error(`Unknown bot "${id}"`);
  return make();
}

export function isPlayable(id: string): boolean {
  return id in BOT_FACTORIES;
}
