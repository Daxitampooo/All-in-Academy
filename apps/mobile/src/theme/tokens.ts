/**
 * Design tokens for the "Neon" visual style (docs/ARCHITECTURE.md, section 3).
 * Components never use raw colors; they read them from the active palette.
 */

export type Palette = {
  /** App background behind everything. */
  bg: string;
  /** Cards, sheets, the tab bar. */
  surface: string;
  /** Elements placed on a surface: inputs, chips, pressed rows. */
  surfaceRaised: string;
  /** Hairlines and outlines. */
  border: string;
  text: string;
  textMuted: string;
  /** Player actions, primary buttons, the active tab. */
  cyan: string;
  /** Aggression and ranked play. */
  magenta: string;
  /** Wins and correct answers. */
  lime: string;
  /** Pro features and rewards. */
  amber: string;
  danger: string;
  /** Text and icons placed on a filled accent color. */
  onAccent: string;
  /** Felt of the poker table. */
  felt: string;
  /** Playing card face and inks (black suits, red suits). */
  cardFace: string;
  cardInk: string;
  cardRed: string;
  /** How strong neon glows are in this palette (0 disables them). */
  glow: number;
};

export const palettes = {
  neon: {
    bg: '#07070D',
    surface: '#11111C',
    surfaceRaised: '#1A1A2A',
    border: '#2A2A40',
    text: '#EDEDF7',
    textMuted: '#8A8AA3',
    cyan: '#00F0FF',
    magenta: '#FF2BD6',
    lime: '#B6FF3B',
    amber: '#FFC23D',
    danger: '#FF4D6D',
    onAccent: '#04040A',
    felt: '#0B1420',
    cardFace: '#F6F6FB',
    cardInk: '#14141F',
    cardRed: '#E8204A',
    glow: 1,
  },
  daylight: {
    bg: '#F4F5FB',
    surface: '#FFFFFF',
    surfaceRaised: '#ECEEF7',
    border: '#D5D8E8',
    text: '#12121F',
    textMuted: '#5B5E78',
    cyan: '#007E9C',
    magenta: '#B3168F',
    lime: '#3A7D00',
    amber: '#9A6200',
    danger: '#C2203B',
    onAccent: '#FFFFFF',
    felt: '#E3F1F4',
    cardFace: '#FFFFFF',
    cardInk: '#14141F',
    cardRed: '#D0183E',
    glow: 0,
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;

/** Palette entries that hold a color (everything except numeric settings). */
export type ColorKey = Exclude<keyof Palette, 'glow'>;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

// Unbounded (display) and Inter (body) both cover Latin and Cyrillic.
export const fonts = {
  display: 'Unbounded_700Bold',
  displayMedium: 'Unbounded_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/** Type scale: [fontSize, lineHeight]. */
export const typeScale = {
  display: [28, 36],
  title: [21, 28],
  heading: [16, 22],
  body: [15, 22],
  label: [13, 18],
  caption: [12, 16],
} as const;

/** Widest content column, so the layout stays readable on tablets and desktop web. */
export const maxContentWidth = 560;

/** Adds transparency to a #RRGGBB color. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
