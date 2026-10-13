import { beatenCount, type BeatenById } from '@/bots/catalog';
import { palettes, type Palette, type PaletteName } from '@/theme/tokens';

import {
  CATALOG,
  DEFAULT_LOOK,
  LOOK_CATEGORIES,
  lookItem,
  type BackStyle,
  type ChipStyle,
  type DeckStyle,
  type FeltStyle,
  type LookCategory,
  type LookItem,
  type NeonStyle,
  type RoomStyle,
  type Unlock,
} from './catalog';

/** Everything the table needs to draw itself, after picking items and settings. */
export type TableLook = {
  felt: FeltStyle;
  room: RoomStyle;
  back: BackStyle;
  deck: DeckStyle;
  /** Ink for each suit (clubs, diamonds, hearts, spades), with the four-color setting applied. */
  suits: [string, string, string, string];
  chips: ChipStyle;
  neon: NeonStyle;
  /** The palette the table is drawn with: dark items switch a light app to the dark palette. */
  paletteName: PaletteName;
  /** The strict official style of ranked play and tournaments. */
  official: boolean;
};

export type LookSelection = Record<LookCategory, string>;

export function isUnlocked(unlock: Unlock, beaten: BeatenById, pro: boolean): boolean {
  switch (unlock.kind) {
    case 'free':
      return true;
    case 'pro':
      return pro;
    case 'bot':
      return (beaten[unlock.botId] ?? 0) > 0;
    case 'league':
      return beatenCount(unlock.league, beaten) >= unlock.count;
  }
}

/** The items a player actually gets: a locked choice (e.g. Pro ran out) falls back to the default. */
export function effectiveSelection(selection: Partial<LookSelection>, beaten: BeatenById, pro: boolean): LookSelection {
  const out = { ...DEFAULT_LOOK };
  for (const category of LOOK_CATEGORIES) {
    const item = lookItem(category, selection[category] ?? '');
    if (item && isUnlocked(item.unlock, beaten, pro)) out[category] = item.id;
  }
  return out;
}

function itemOf<C extends LookCategory>(category: C, id: string): LookItem<C> {
  return lookItem(category, id) ?? (CATALOG[category][0] as LookItem<C>);
}

/** Builds the look from chosen items; `appPalette` is the palette of the app theme. */
export function resolveLook(selection: LookSelection, fourColor: boolean, appPaletteName: PaletteName): TableLook {
  const chosen = LOOK_CATEGORIES.map((c) => itemOf(c, selection[c]));
  const paletteName: PaletteName = chosen.some((i) => i.dark) ? 'neon' : appPaletteName;
  const p: Palette = palettes[paletteName];
  const deck = itemOf('deck', selection.deck).style(p);
  return {
    felt: itemOf('felt', selection.felt).style(p),
    room: itemOf('room', selection.room).style(p),
    back: itemOf('back', selection.back).style(p),
    deck,
    suits: fourColor ? deck.four : [deck.ink, deck.red, deck.red, deck.ink],
    chips: itemOf('chips', selection.chips).style(p),
    neon: itemOf('neon', selection.neon).style(p),
    paletteName,
    official: false,
  };
}

/**
 * The official style of ranked play and tournaments: personal cosmetics don't apply, everyone gets the
 * same restrained dark table with classic cards and chips, neon only as thin accents. The four-color
 * deck stays, because it is about reading the suits. `accent` is the league color.
 */
export function officialLook(fourColor: boolean, accent = palettes.neon.cyan): TableLook {
  const p = palettes.neon;
  const deck: DeckStyle = {
    face: p.cardFace,
    border: p.cardFace,
    ink: p.cardInk,
    red: p.cardRed,
    four: ['#178A3E', '#1B63D6', '#D0183E', '#14141F'],
    large: false,
    outline: false,
  };
  return {
    felt: { fill: '#10161D', inner: '#2E3A48', pattern: 'none' },
    room: { top: '#07090D', bottom: '#07090D', line: '#1E2530', decor: 'none' },
    back: { base: '#1B2433', line: '#8FA3BF', accent: '#3A4A60', pattern: 'lattice' },
    deck,
    suits: fourColor ? deck.four : [deck.ink, deck.red, deck.red, deck.ink],
    chips: { main: '#C9CED8', edge: '#1B2433', pattern: 'stripes' },
    neon: { main: accent, accent: '#2E3A48', glow: 0.3 },
    paletteName: 'neon',
    official: true,
  };
}
