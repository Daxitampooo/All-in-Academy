import type { LeagueId } from '@/bots/catalog';
import type { Palette } from '@/theme/tokens';

/**
 * Table cosmetics. Everything here is visual only and only the player sees it on their own screen; it
 * never changes the game. Some items are free, some open with progress (beating bots, achievements),
 * some come with Pro.
 */

export type LookCategory = 'felt' | 'room' | 'back' | 'deck' | 'chips' | 'neon';

export const LOOK_CATEGORIES: LookCategory[] = ['felt', 'room', 'back', 'deck', 'chips', 'neon'];

export type Unlock =
  | { kind: 'free' }
  /** Beat `count` different bots of a league. */
  | { kind: 'league'; league: LeagueId; count: number }
  /** Beat one particular bot. */
  | { kind: 'bot'; botId: string }
  /** Earn an achievement. */
  | { kind: 'achievement'; id: string }
  | { kind: 'pro' };

export type FeltPattern = 'none' | 'grain' | 'hex' | 'grid' | 'aurora';
export type RoomDecor = 'none' | 'grid' | 'city' | 'stars' | 'waves';
export type BackPattern = 'neon' | 'lattice' | 'stripes' | 'club' | 'holo';
export type ChipPattern = 'dashed' | 'solid' | 'stripes';

export type FeltStyle = { fill: string; inner: string; pattern: FeltPattern };
export type RoomStyle = { top: string; bottom: string; line: string; decor: RoomDecor };
export type BackStyle = { base: string; line: string; accent: string; pattern: BackPattern };
export type DeckStyle = {
  face: string;
  border: string;
  /** Inks for clubs, diamonds, hearts, spades: the usual two colors. */
  ink: string;
  red: string;
  /** Four-color inks, in the same suit order. */
  four: [string, string, string, string];
  /** Big rank and suit, for reading at a glance. */
  large: boolean;
  /** A glowing outline in the suit's color. */
  outline: boolean;
};
export type ChipStyle = { main: string; edge: string; pattern: ChipPattern };
export type NeonStyle = { main: string; accent: string; glow: number };

type StyleOf = {
  felt: FeltStyle;
  room: RoomStyle;
  back: BackStyle;
  deck: DeckStyle;
  chips: ChipStyle;
  neon: NeonStyle;
};

export type LookItem<C extends LookCategory = LookCategory> = {
  id: string;
  category: C;
  unlock: Unlock;
  /** Colors may follow the app theme (the defaults do), so they're built from the palette. */
  style: (palette: Palette) => StyleOf[C];
  /** Dark by design: the table switches to the dark palette so that text stays readable. */
  dark?: boolean;
};

const FREE: Unlock = { kind: 'free' };
const PRO: Unlock = { kind: 'pro' };

/** Four-color inks on a light card face. */
const FOUR_LIGHT: [string, string, string, string] = ['#178A3E', '#1B63D6', '#D0183E', '#14141F'];
/** Four-color inks on a dark card face. */
const FOUR_DARK: [string, string, string, string] = ['#7DFF6A', '#4FB3FF', '#FF4D7A', '#F2F2FA'];

function items<C extends LookCategory>(category: C, list: Omit<LookItem<C>, 'category'>[]): LookItem<C>[] {
  return list.map((item) => ({ ...item, category }));
}

export const FELTS = items('felt', [
  { id: 'midnight', unlock: FREE, style: (p) => ({ fill: p.felt, inner: p.magenta, pattern: 'none' }) },
  { id: 'emerald', unlock: FREE, dark: true, style: () => ({ fill: '#0C3A28', inner: '#3DFFC5', pattern: 'grain' }) },
  { id: 'wine', unlock: FREE, dark: true, style: () => ({ fill: '#3A0D22', inner: '#FF6B9A', pattern: 'grain' }) },
  { id: 'ocean', unlock: { kind: 'league', league: 'amateurs', count: 1 }, dark: true, style: () => ({ fill: '#082B47', inner: '#9AD8FF', pattern: 'none' }) },
  { id: 'graphite', unlock: { kind: 'league', league: 'regulars', count: 1 }, dark: true, style: () => ({ fill: '#17191F', inner: '#8A8AA3', pattern: 'hex' }) },
  { id: 'amethyst', unlock: { kind: 'league', league: 'pros', count: 1 }, dark: true, style: () => ({ fill: '#22103D', inner: '#A97BFF', pattern: 'grid' }) },
  { id: 'neonGold', unlock: { kind: 'bot', botId: 'neon' }, dark: true, style: () => ({ fill: '#261C05', inner: '#FFE066', pattern: 'hex' }) },
  { id: 'carbon', unlock: PRO, dark: true, style: () => ({ fill: '#101114', inner: '#00F0FF', pattern: 'grid' }) },
  { id: 'aurora', unlock: PRO, dark: true, style: () => ({ fill: '#061A22', inner: '#3DFFC5', pattern: 'aurora' }) },
]);

export const ROOMS = items('room', [
  { id: 'void', unlock: FREE, style: (p) => ({ top: p.bg, bottom: p.bg, line: p.border, decor: 'none' }) },
  { id: 'synth', unlock: FREE, dark: true, style: () => ({ top: '#07070D', bottom: '#1A0830', line: '#FF2BD6', decor: 'grid' }) },
  { id: 'city', unlock: { kind: 'league', league: 'amateurs', count: 2 }, dark: true, style: () => ({ top: '#050814', bottom: '#101A33', line: '#00F0FF', decor: 'city' }) },
  { id: 'stars', unlock: { kind: 'achievement', id: 'river-master' }, dark: true, style: () => ({ top: '#03030A', bottom: '#0B0B22', line: '#EDEDF7', decor: 'stars' }) },
  { id: 'sunset', unlock: PRO, dark: true, style: () => ({ top: '#12051C', bottom: '#3A0A2E', line: '#FF8A3D', decor: 'grid' }) },
  { id: 'deep', unlock: PRO, dark: true, style: () => ({ top: '#020B12', bottom: '#04233A', line: '#3DFFC5', decor: 'waves' }) },
]);

export const BACKS = items('back', [
  { id: 'neon', unlock: FREE, style: (p) => ({ base: p.surfaceRaised, line: p.cyan, accent: p.magenta, pattern: 'neon' }) },
  { id: 'red', unlock: FREE, style: () => ({ base: '#B3122E', line: '#FFFFFF', accent: '#FFD0D8', pattern: 'lattice' }) },
  { id: 'blue', unlock: FREE, style: () => ({ base: '#1546A8', line: '#FFFFFF', accent: '#CFE0FF', pattern: 'lattice' }) },
  { id: 'stripes', unlock: { kind: 'achievement', id: 'warm-up' }, style: () => ({ base: '#11111C', line: '#B6FF3B', accent: '#00F0FF', pattern: 'stripes' }) },
  { id: 'club', unlock: { kind: 'league', league: 'amateurs', count: 3 }, style: () => ({ base: '#0B1420', line: '#00F0FF', accent: '#FF2BD6', pattern: 'club' }) },
  { id: 'gold', unlock: PRO, style: () => ({ base: '#1C1404', line: '#FFC23D', accent: '#FFE066', pattern: 'lattice' }) },
  { id: 'holo', unlock: PRO, style: () => ({ base: '#0E0E1A', line: '#00F0FF', accent: '#FF2BD6', pattern: 'holo' }) },
]);

export const DECKS = items('deck', [
  {
    id: 'classic',
    unlock: FREE,
    style: (p) => ({ face: p.cardFace, border: p.glow > 0 ? p.cardFace : p.border, ink: p.cardInk, red: p.cardRed, four: FOUR_LIGHT, large: false, outline: false }),
  },
  {
    id: 'large',
    unlock: FREE,
    style: (p) => ({ face: p.cardFace, border: p.glow > 0 ? p.cardFace : p.border, ink: p.cardInk, red: p.cardRed, four: FOUR_LIGHT, large: true, outline: false }),
  },
  {
    id: 'paper',
    unlock: { kind: 'league', league: 'novices', count: 6 },
    style: () => ({ face: '#F3EAD3', border: '#D9CBA8', ink: '#2A2118', red: '#A3202C', four: ['#2F6B2A', '#24508F', '#A3202C', '#2A2118'], large: false, outline: false }),
  },
  {
    id: 'night',
    unlock: { kind: 'league', league: 'regulars', count: 1 },
    style: () => ({ face: '#161625', border: '#2A2A40', ink: '#F2F2FA', red: '#FF4D7A', four: FOUR_DARK, large: false, outline: false }),
  },
  {
    id: 'outline',
    unlock: PRO,
    style: () => ({ face: '#0D0D18', border: '#00F0FF', ink: '#00F0FF', red: '#FF2BD6', four: ['#B6FF3B', '#00F0FF', '#FF2BD6', '#F2F2FA'], large: false, outline: true }),
  },
]);

export const CHIPS = items('chips', [
  { id: 'amber', unlock: FREE, style: (p) => ({ main: p.amber, edge: p.cardFace, pattern: 'dashed' }) },
  { id: 'cyan', unlock: FREE, style: (p) => ({ main: p.cyan, edge: p.cardFace, pattern: 'dashed' }) },
  { id: 'classic', unlock: FREE, style: () => ({ main: '#C8102E', edge: '#FFFFFF', pattern: 'stripes' }) },
  { id: 'lime', unlock: { kind: 'league', league: 'amateurs', count: 1 }, style: (p) => ({ main: p.lime, edge: p.onAccent, pattern: 'solid' }) },
  { id: 'magenta', unlock: { kind: 'achievement', id: 'cool-head' }, style: (p) => ({ main: p.magenta, edge: p.cardFace, pattern: 'stripes' }) },
  { id: 'gold', unlock: PRO, style: () => ({ main: '#E8B32E', edge: '#3A2A05', pattern: 'stripes' }) },
  { id: 'onyx', unlock: PRO, style: () => ({ main: '#1B1B26', edge: '#00F0FF', pattern: 'dashed' }) },
]);

export const NEONS = items('neon', [
  { id: 'cyan', unlock: FREE, style: (p) => ({ main: p.cyan, accent: p.magenta, glow: 1 }) },
  { id: 'magenta', unlock: FREE, style: (p) => ({ main: p.magenta, accent: p.cyan, glow: 1 }) },
  { id: 'calm', unlock: FREE, style: (p) => ({ main: p.textMuted, accent: p.border, glow: 0 }) },
  { id: 'lime', unlock: { kind: 'league', league: 'novices', count: 6 }, style: (p) => ({ main: p.lime, accent: p.cyan, glow: 1 }) },
  { id: 'amber', unlock: { kind: 'league', league: 'regulars', count: 3 }, style: (p) => ({ main: p.amber, accent: p.magenta, glow: 1 }) },
  { id: 'ice', unlock: { kind: 'league', league: 'pros', count: 3 }, style: () => ({ main: '#9AD8FF', accent: '#A97BFF', glow: 1 }) },
  { id: 'synthwave', unlock: PRO, style: () => ({ main: '#FF8A3D', accent: '#A97BFF', glow: 1.3 }) },
]);

export const CATALOG: { [C in LookCategory]: LookItem<C>[] } = {
  felt: FELTS,
  room: ROOMS,
  back: BACKS,
  deck: DECKS,
  chips: CHIPS,
  neon: NEONS,
};

/** The first item of each category is the default and always free. */
export const DEFAULT_LOOK: Record<LookCategory, string> = {
  felt: 'midnight',
  room: 'void',
  back: 'neon',
  deck: 'classic',
  chips: 'amber',
  neon: 'cyan',
};

export function lookItem<C extends LookCategory>(category: C, id: string): LookItem<C> | undefined {
  return (CATALOG[category] as LookItem<C>[]).find((i) => i.id === id);
}
