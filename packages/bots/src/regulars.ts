import { trackedBot } from './tracked';
import { DEFAULT_PROFILE, type Bot, type BotProfile } from './types';

const profile = (overrides: Partial<BotProfile>): BotProfile => ({ ...DEFAULT_PROFILE, ...overrides });

/** Blends two profiles: `t` 0 is `a`, 1 is `b`. Booleans and sizes switch at the halfway point. */
function blend(a: BotProfile, b: BotProfile, t: number): BotProfile {
  const mix = (x: number, y: number) => x + (y - x) * t;
  const pick = <T>(x: T, y: T) => (t < 0.5 ? x : y);
  const out = { ...pick(a, b) };
  for (const key of Object.keys(a) as (keyof BotProfile)[]) {
    const x = a[key];
    const y = b[key];
    if (typeof x === 'number' && typeof y === 'number') (out as Record<string, unknown>)[key] = mix(x, y);
  }
  out.sizes = { open: mix(a.sizes.open, b.sizes.open), bet: mix(a.sizes.bet, b.sizes.bet), raise: mix(a.sizes.raise, b.sizes.raise) };
  return out;
}

/**
 * League "Regulars" (1200–1800): solid players who read ranges, each with a signature move to learn
 * from. Stronger bots watch the opponent's habits over the match and adjust.
 */
export const REGULAR_PROFILES = {
  /** Oleg "Rock": tight-aggressive by the book, but predictable (always the same c-bet). */
  oleg: profile({
    vpip: 0.21,
    pfr: 0.18,
    threeBet: 0.04,
    foldToRaise: 0.55,
    aggression: 0.55,
    bluff: 0.06,
    cbet: 0.85,
    accuracy: 0.8,
    rangeAware: 0.15,
    sizes: { open: 2.5, bet: 0.55, raise: 0.8 },
    samples: 220,
  }),

  /** Igor "Shortstack": push or fold before the flop. Teaches calling all-ins by the math. */
  igor: profile({
    vpip: 0.2,
    pfr: 0.16,
    threeBet: 0.03,
    foldToRaise: 0.55,
    jamThreeBets: true,
    // Short-stack ranges once stacks are 25 big blinds or less.
    pushFold: { share: 0.45, callShare: 0.3, maxDepth: 25 },
    aggression: 0.55,
    bluff: 0.08,
    cbet: 0.8,
    accuracy: 0.72,
    rangeAware: 0.15,
    samples: 220,
  }),

  /** Vera "Bluffer": loves bluffing scary boards. Teaches catching bluffs. */
  vera: profile({
    vpip: 0.28,
    pfr: 0.22,
    threeBet: 0.07,
    foldToRaise: 0.45,
    aggression: 0.65,
    bluff: 0.2,
    scareBluff: 0.5,
    cbet: 0.65,
    accuracy: 0.88,
    rangeAware: 0.5,
    samples: 240,
  }),

  /** Nina "Check-raise": check-raises the flop and turn a lot, punishing automatic bets. */
  nina: profile({
    vpip: 0.25,
    pfr: 0.2,
    threeBet: 0.06,
    foldToRaise: 0.45,
    aggression: 0.6,
    checkRaise: 0.45,
    semiBluff: 0.3,
    cbet: 0.4,
    bluff: 0.1,
    accuracy: 0.95,
    rangeAware: 0.85,
    samples: 260,
  }),

  /** Denis "Stealer": steals the blinds from late position and 3-bets light. Teaches defending the blinds. */
  denis: profile({
    vpip: 0.27,
    pfr: 0.23,
    threeBet: 0.07,
    foldToRaise: 0.42,
    steal: 0.2,
    aggression: 0.6,
    bluff: 0.1,
    cbet: 0.7,
    accuracy: 0.86,
    rangeAware: 0.3,
    samples: 260,
  }),
} satisfies Record<string, BotProfile>;

/** Yulia "Reader": a strong regular who learns what your bet sizes mean and uses it. */
const YULIA = profile({
  vpip: 0.25,
  pfr: 0.21,
  threeBet: 0.08,
  foldToRaise: 0.45,
  aggression: 0.66,
  bluff: 0.12,
  cbet: 0.6,
  semiBluff: 0.25,
  accuracy: 0.95,
  rangeAware: 0.75,
  samples: 300,
});

/** Artem "Calculator": precise odds, outs and equity against ranges; every decision by the math. */
const ARTEM = profile({
  vpip: 0.24,
  pfr: 0.2,
  threeBet: 0.09,
  foldToRaise: 0.45,
  aggression: 0.66,
  bluff: 0.12,
  cbet: 0.6,
  semiBluff: 0.4,
  checkRaise: 0.15,
  accuracy: 1,
  rangeAware: 0.9,
  samples: 600,
});

/** Armen early in the evening: a patient, solid regular. */
const ARMEN_FRESH = profile({
  vpip: 0.2,
  pfr: 0.17,
  threeBet: 0.05,
  foldToRaise: 0.55,
  aggression: 0.6,
  bluff: 0.06,
  cbet: 0.6,
  accuracy: 0.9,
  rangeAware: 0.55,
  samples: 240,
});

/** Armen who should have gone home long ago: anything to end the game sooner. */
const ARMEN_LATE = profile({
  positionAware: false,
  vpip: 0.6,
  pfr: 0.45,
  threeBet: 0.2,
  foldToRaise: 0.2,
  aggression: 0.85,
  bluff: 0.3,
  stickiness: 0.3,
  accuracy: 0.6,
  rangeAware: 0.1,
  sizes: { open: 4, bet: 1, raise: 1.3 },
  samples: 160,
});

/** Armen gets impatient after this many hands and fully reckless this many hands later. */
const ARMEN_PATIENCE = 30;
const ARMEN_SPAN = 60;

export type RegularId = keyof typeof REGULAR_PROFILES | 'yulia' | 'artem' | 'armen';

export const REGULAR_BOTS: Record<RegularId, () => Bot> = {
  ...(Object.fromEntries(
    Object.entries(REGULAR_PROFILES).map(([id, p]) => [id, () => trackedBot(id, { profile: () => p })]),
  ) as Record<keyof typeof REGULAR_PROFILES, () => Bot>),
  yulia: () => trackedBot('yulia', { profile: () => YULIA, readsSizing: true }),
  artem: () => trackedBot('artem', { profile: () => ARTEM }),
  /** Armen: it's late and he keeps saying it's his last hand; the longer the game, the wilder he plays. */
  armen: () =>
    trackedBot('armen', {
      profile: (memory) => blend(ARMEN_FRESH, ARMEN_LATE, Math.min(1, Math.max(0, (memory.hands - ARMEN_PATIENCE) / ARMEN_SPAN))),
    }),
};
