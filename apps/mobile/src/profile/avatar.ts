import type { FaceSpec } from '@/components/FacePortrait';
import type { Unlock } from '@/looks/catalog';
import type { HueName } from '@/theme/tokens';

/**
 * The avatar builder: a neon face put together from parts (the same parts as the bots' portraits), on a
 * background, inside a frame, in an outline color, with an optional badge. Uploading a photo comes with
 * accounts and moderation (stage 7).
 */
export type AvatarSpec = {
  face: FaceSpec;
  background: string;
  frame: string;
  outline: HueName;
  badge: string | null;
};

export const DEFAULT_AVATAR: AvatarSpec = {
  face: { hair: 'short', eyes: 'dots', brows: 'flat', mouth: 'smile' },
  background: 'plain',
  frame: 'ring',
  outline: 'cyan',
  badge: null,
};

/** Every option of each face part; null means none. */
export const FACE_PARTS = {
  hair: ['short', 'buzz', 'bald', 'spiky', 'side', 'messy', 'curly', 'long', 'bob', 'bun', 'ponytail'],
  hat: [null, 'cap', 'capBack', 'beanie', 'hood', 'headphones'],
  eyes: ['dots', 'wide', 'narrow', 'sleepy', 'glasses', 'squareGlasses', 'shades'],
  brows: [null, 'flat', 'angry', 'worried', 'raised'],
  mouth: ['smile', 'grin', 'flat', 'smirk', 'frown', 'open', 'small'],
  beard: [null, 'stubble', 'mustache', 'beard'],
  extra: [null, 'earrings', 'tie', 'collar', 'watch', 'pencil', 'phone'],
} as const satisfies { [K in keyof FaceSpec]-?: readonly (FaceSpec[K] | null)[] };

export type FacePart = keyof typeof FACE_PARTS;
export const FACE_PART_ORDER: FacePart[] = ['hair', 'hat', 'eyes', 'brows', 'mouth', 'beard', 'extra'];

export const OUTLINES: HueName[] = ['cyan', 'magenta', 'lime', 'amber', 'violet', 'orange', 'aqua', 'rose', 'gold', 'ice'];

export type AvatarOption = { id: string; unlock: Unlock };

const FREE: Unlock = { kind: 'free' };
const PRO: Unlock = { kind: 'pro' };

export const BACKGROUNDS: AvatarOption[] = [
  { id: 'plain', unlock: FREE },
  { id: 'dusk', unlock: FREE },
  { id: 'ocean', unlock: FREE },
  { id: 'grid', unlock: { kind: 'league', league: 'novices', count: 3 } },
  { id: 'stars', unlock: { kind: 'league', league: 'amateurs', count: 2 } },
  { id: 'sunburst', unlock: PRO },
  { id: 'gold', unlock: PRO },
];

export const FRAMES: AvatarOption[] = [
  { id: 'ring', unlock: FREE },
  { id: 'double', unlock: FREE },
  { id: 'dashed', unlock: FREE },
  { id: 'studs', unlock: { kind: 'league', league: 'amateurs', count: 1 } },
  { id: 'notched', unlock: { kind: 'league', league: 'regulars', count: 1 } },
  { id: 'crown', unlock: { kind: 'bot', botId: 'neon' } },
  { id: 'prism', unlock: PRO },
];

export const BADGES: AvatarOption[] = [
  { id: 'none', unlock: FREE },
  { id: 'star', unlock: FREE },
  { id: 'spade', unlock: FREE },
  { id: 'heart', unlock: FREE },
  { id: 'flame', unlock: { kind: 'achievement', id: 'iron-nerves' } },
  { id: 'bolt', unlock: { kind: 'league', league: 'regulars', count: 3 } },
  { id: 'crown', unlock: { kind: 'bot', botId: 'neon' } },
  { id: 'diamond', unlock: PRO },
];

/** Playing styles a player can put in their profile, in poker players' words. */
export const PLAY_STYLES = ['tag', 'lag', 'nit', 'station', 'maniac', 'balanced'] as const;
export type PlayStyle = (typeof PLAY_STYLES)[number];
