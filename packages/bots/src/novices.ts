import { profileBot } from './brain';
import { DEFAULT_PROFILE, type BotProfile } from './types';

// Novices don't adjust to position or table size: that's part of their character.
const profile = (overrides: Partial<BotProfile>): BotProfile => ({ ...DEFAULT_PROFILE, positionAware: false, ...overrides });

/**
 * League "Novices" (100–600). Each bot exaggerates one beginner habit so the
 * player learns to punish it.
 */
export const NOVICE_PROFILES = {
  /** Barsik the cat: acts completely at random. First bot, to learn the interface. */
  barsik: profile({ randomness: 1 }),

  /** Timokha: misjudges hands, overvalues any pair, sometimes folds strong hands. */
  timokha: profile({
    vpip: 0.55,
    pfr: 0.08,
    threeBet: 0.02,
    foldToRaise: 0.4,
    aggression: 0.6,
    bluff: 0.05,
    stickiness: 0.15,
    pairLove: 1,
    accuracy: 0.1,
    panicFold: 0.25,
    sizes: { open: 3, bet: 0.9, raise: 1 },
    samples: 120,
  }),

  /** Kolyan "Calling station": almost always calls, almost never raises or folds. */
  kolyan: profile({
    vpip: 0.55,
    pfr: 0.01,
    threeBet: 0.005,
    foldToRaise: 0.05,
    aggression: 0.08,
    valueThreshold: 0.75,
    bluff: 0,
    stickiness: 0.85,
    accuracy: 0.5,
    samples: 120,
  }),

  /** Gosha "Limper": limps almost every hand and gives up against raises. */
  gosha: profile({
    vpip: 0.75,
    pfr: 0,
    limps: true,
    threeBet: 0.03,
    foldToRaise: 0.95,
    aggression: 0.12,
    bluff: 0.02,
    stickiness: 0,
    accuracy: 0.5,
    samples: 120,
  }),

  /** Granny Zina: ultra tight and passive, plays premium hands and bets only made hands. */
  zina: profile({
    vpip: 0.07,
    pfr: 0.05,
    threeBet: 0.03,
    foldToRaise: 0.55,
    aggression: 0.55,
    bluff: 0,
    stickiness: -0.1,
    valueOnly: true,
    valueThreshold: 0.72,
    accuracy: 0.7,
    sizes: { open: 3, bet: 0.5, raise: 0.6 },
  }),

  /** Liza "Fish": plays far too many hands and chases every draw. */
  liza: profile({
    vpip: 0.5,
    pfr: 0.12,
    threeBet: 0.03,
    foldToRaise: 0.3,
    aggression: 0.4,
    bluff: 0.12,
    stickiness: 0.2,
    drawLove: 0.8,
    accuracy: 0.6,
    samples: 160,
  }),
} satisfies Record<string, BotProfile>;

export type NoviceId = keyof typeof NOVICE_PROFILES;

export const NOVICE_BOTS = Object.fromEntries(
  Object.entries(NOVICE_PROFILES).map(([id, p]) => [id, profileBot(id, p)]),
) as Record<NoviceId, ReturnType<typeof profileBot>>;
