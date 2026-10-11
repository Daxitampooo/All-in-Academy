import { NOVICE_BOTS } from './novices';
import type { Bot } from './types';

/**
 * Bots that can be played. Ids match the bot catalog in the app; bots that
 * aren't here yet are shown as "coming soon".
 *
 * Special training bots that cheat on purpose (a rigged deck, seeing all
 * cards) are NOT part of this package: they live in the mobile app's offline
 * training module and never reach multiplayer code.
 */
export const PLAYABLE_BOTS: Record<string, Bot> = {
  ...NOVICE_BOTS,
};

export function getBot(id: string): Bot {
  const bot = PLAYABLE_BOTS[id];
  if (!bot) throw new Error(`Unknown bot "${id}"`);
  return bot;
}

export function isPlayable(id: string): boolean {
  return id in PLAYABLE_BOTS;
}
