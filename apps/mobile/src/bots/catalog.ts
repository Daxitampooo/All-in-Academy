import { isPlayable } from '@pokerall/bots';

import type { FaceSpec } from '@/components/FacePortrait';
import type { HueName } from '@/theme/tokens';

export type LeagueId = 'novices' | 'amateurs' | 'regulars' | 'pros' | 'masters' | 'secret';

/** Look of a bot portrait; bots without their own drawing yet use "unknown". */
export type PortraitKind = 'cat' | 'rookie' | 'station' | 'limper' | 'granny' | 'fish' | 'unknown';

export type BotEntry = {
  id: string;
  league: LeagueId;
  /** Strength on the rating scale; null for the bot whose rating is hidden. */
  rating: number | null;
  hue: HueName;
  /** A drawing of its own, or a face put together from parts. */
  portrait: PortraitKind | FaceSpec;
  /** Plays with information other players don't have (training only). */
  cheater?: boolean;
};

export type League = {
  id: LeagueId;
  /** Rating range shown under the league name. */
  range: [number, number] | null;
};

export const LEAGUES: League[] = [
  { id: 'novices', range: [100, 600] },
  { id: 'amateurs', range: [700, 1200] },
  { id: 'regulars', range: [1200, 1800] },
  { id: 'pros', range: [1900, 2400] },
  { id: 'masters', range: [2500, 2900] },
  { id: 'secret', range: null },
];

/** Different bots of a league you need to beat to open the next one. */
export const WINS_TO_UNLOCK = 3;

/**
 * Heads-up match wins that beat a bot: the first to this many wins takes the series. Longer series against
 * strong bots, so a lucky match isn't enough to beat them.
 */
export const SERIES_TARGET: Record<LeagueId, number> = {
  novices: 1,
  amateurs: 1,
  regulars: 2,
  pros: 3,
  masters: 3,
  secret: 3,
};

/** Beating this bot opens the secret league. */
export const SECRET_KEY_BOT = 'neon';

export const BOTS: BotEntry[] = [
  { id: 'barsik', league: 'novices', rating: 100, hue: 'amber', portrait: 'cat' },
  { id: 'timokha', league: 'novices', rating: 200, hue: 'lime', portrait: 'rookie' },
  { id: 'kolyan', league: 'novices', rating: 300, hue: 'cyan', portrait: 'station' },
  { id: 'gosha', league: 'novices', rating: 400, hue: 'orange', portrait: 'limper' },
  { id: 'zina', league: 'novices', rating: 500, hue: 'violet', portrait: 'granny' },
  { id: 'liza', league: 'novices', rating: 600, hue: 'aqua', portrait: 'fish' },

  { id: 'max', league: 'amateurs', rating: 700, hue: 'magenta', portrait: { hair: 'spiky', eyes: 'wide', brows: 'angry', mouth: 'grin' } },
  { id: 'gena', league: 'amateurs', rating: 750, hue: 'lime', portrait: { hair: 'short', eyes: 'dots', brows: 'raised', mouth: 'open', extra: 'phone' } },
  { id: 'dasha', league: 'amateurs', rating: 800, hue: 'rose', portrait: { hair: 'long', eyes: 'wide', brows: 'worried', mouth: 'small' } },
  { id: 'stas', league: 'amateurs', rating: 900, hue: 'ice', portrait: { hair: 'side', eyes: 'narrow', brows: 'flat', mouth: 'smirk', extra: 'collar' } },
  { id: 'roma', league: 'amateurs', rating: 950, hue: 'lime', portrait: { hair: 'short', hat: 'capBack', eyes: 'dots', mouth: 'grin', beard: 'stubble' } },
  { id: 'katya', league: 'amateurs', rating: 1000, hue: 'gold', portrait: { hair: 'bun', eyes: 'glasses', brows: 'flat', mouth: 'flat', extra: 'earrings' } },
  { id: 'vadim', league: 'amateurs', rating: 1100, hue: 'orange', portrait: { hair: 'messy', eyes: 'dots', brows: 'angry', mouth: 'frown', extra: 'looseTie' } },

  { id: 'oleg', league: 'regulars', rating: 1200, hue: 'ice', portrait: { hair: 'buzz', eyes: 'dots', brows: 'flat', mouth: 'flat', extra: 'collar' } },
  { id: 'armen', league: 'regulars', rating: 1250, hue: 'gold', portrait: { hair: 'short', eyes: 'sleepy', brows: 'worried', mouth: 'hidden', beard: 'mustache', extra: 'watch' } },
  { id: 'igor', league: 'regulars', rating: 1300, hue: 'amber', portrait: { hair: 'buzz', hat: 'beanie', eyes: 'narrow', brows: 'angry', mouth: 'flat', beard: 'beard' } },
  { id: 'vera', league: 'regulars', rating: 1400, hue: 'magenta', portrait: { hair: 'long', eyes: 'dots', brows: 'raised', mouth: 'smirk', extra: 'earrings' } },
  { id: 'nina', league: 'regulars', rating: 1500, hue: 'violet', portrait: { hair: 'ponytail', eyes: 'dots', brows: 'angry', mouth: 'smile' } },
  { id: 'denis', league: 'regulars', rating: 1600, hue: 'cyan', portrait: { hair: 'short', hat: 'hood', eyes: 'narrow', mouth: 'smirk' } },
  { id: 'yulia', league: 'regulars', rating: 1700, hue: 'rose', portrait: { hair: 'bob', eyes: 'wide', brows: 'raised', mouth: 'small', hat: 'headphones' } },
  { id: 'artem', league: 'regulars', rating: 1800, hue: 'aqua', portrait: { hair: 'side', eyes: 'squareGlasses', brows: 'flat', mouth: 'flat', extra: 'pencil' } },

  { id: 'borya', league: 'pros', rating: 1900, hue: 'orange', portrait: 'unknown' },
  { id: 'sonya', league: 'pros', rating: 2000, hue: 'violet', portrait: 'unknown' },
  { id: 'marina', league: 'pros', rating: 2100, hue: 'magenta', portrait: 'unknown' },
  { id: 'gleb', league: 'pros', rating: 2200, hue: 'gold', portrait: 'unknown' },
  { id: 'alisa', league: 'pros', rating: 2300, hue: 'aqua', portrait: 'unknown' },
  { id: 'fedor', league: 'pros', rating: 2400, hue: 'ice', portrait: 'unknown' },

  { id: 'arkady', league: 'masters', rating: 2500, hue: 'gold', portrait: 'unknown' },
  { id: 'nika', league: 'masters', rating: 2700, hue: 'cyan', portrait: 'unknown' },
  { id: 'neon', league: 'masters', rating: 2900, hue: 'magenta', portrait: 'unknown' },

  { id: 'lekha', league: 'secret', rating: null, hue: 'lime', portrait: 'unknown' },
  { id: 'danil', league: 'secret', rating: 3500, hue: 'rose', portrait: 'unknown', cheater: true },
];

export function botById(id: string): BotEntry | undefined {
  return BOTS.find((b) => b.id === id);
}

export function botsInLeague(league: LeagueId): BotEntry[] {
  return BOTS.filter((b) => b.league === league);
}

/** The bot's strategy exists in this version of the app. */
export function botIsReady(id: string): boolean {
  return isPlayable(id);
}

/** Series won against each bot, by id; a bot counts as beaten from the first one. */
export type BeatenById = Record<string, number>;

export function leagueUnlocked(league: LeagueId, beaten: BeatenById): boolean {
  if (league === 'novices') return true;
  if (league === 'secret') return (beaten[SECRET_KEY_BOT] ?? 0) > 0;
  const index = LEAGUES.findIndex((l) => l.id === league);
  const previous = LEAGUES[index - 1]!.id;
  return beatenCount(previous, beaten) >= WINS_TO_UNLOCK;
}

/** Different bots of a league beaten at least once. */
export function beatenCount(league: LeagueId, beaten: BeatenById): number {
  return botsInLeague(league).filter((b) => (beaten[b.id] ?? 0) > 0).length;
}

/** The league whose bots the player should beat next, for progress hints. */
export function leagueAfter(league: LeagueId): LeagueId | null {
  const index = LEAGUES.findIndex((l) => l.id === league);
  const next = LEAGUES[index + 1];
  return next && next.id !== 'secret' ? next.id : null;
}
