import type { OpponentModel } from './reads';
import { trackedBot } from './tracked';
import { DEFAULT_PROFILE, type Bot, type BotProfile } from './types';

const profile = (overrides: Partial<BotProfile>): BotProfile => ({ ...DEFAULT_PROFILE, ...overrides });

/**
 * Bends a solid style towards what the opponents do: against players who fold too much it bluffs more,
 * against players who never fold it stops bluffing and bets thinner for value.
 */
export function exploit(base: BotProfile, model: OpponentModel, strength = 1): BotProfile {
  const folds = model.foldToBet();
  if (folds === null) return base;
  if (folds > 0.55) {
    const k = 1 + strength * Math.min(1.5, ((folds - 0.55) / 0.45) * 2);
    return { ...base, bluff: Math.min(0.6, base.bluff * k), semiBluff: Math.min(0.8, base.semiBluff * k), cbet: Math.min(0.95, base.cbet + 0.15 * strength) };
  }
  if (folds < 0.35) {
    return {
      ...base,
      bluff: base.bluff * (1 - 0.7 * strength),
      scareBluff: base.scareBluff * (1 - 0.7 * strength),
      cbet: base.cbet * (1 - 0.4 * strength),
      valueThreshold: base.valueThreshold - 0.08 * strength,
      aggression: Math.min(0.95, base.aggression + 0.1 * strength),
    };
  }
  return base;
}

/** A strong regular's base the professionals build on. */
const SOLID = profile({
  vpip: 0.25,
  pfr: 0.21,
  threeBet: 0.15,
  foldToRaise: 0.3,
  defend3Bet: 0.8,
  aggression: 0.66,
  bluff: 0.12,
  cbet: 0.6,
  semiBluff: 0.35,
  accuracy: 0.95,
  rangeAware: 0.8,
  samples: 400,
});

/**
 * League "Pros" (1900–2400): every bot is a strong all-round player with one weapon that takes real skill
 * to handle.
 */
export const PRO_PROFILES = {
  /** Borya "Overbet": bets more than the pot with a polarized range, the nuts or a bluff. */
  borya: profile({ ...SOLID, polarized: true, bluff: 0.3, aggression: 0.8, sizes: { open: 2.5, bet: 1.5, raise: 1 } }),

  /** Marina "Heads-up": a one-on-one specialist, aggressive with wide ranges and constant pressure. */
  marina: profile({
    ...SOLID,
    vpip: 0.32,
    pfr: 0.28,
    threeBet: 0.2,
    foldToRaise: 0.25,
    defend3Bet: 1,
    aggression: 0.75,
    bluff: 0.18,
    cbet: 0.75,
    semiBluff: 0.45,
    checkRaise: 0.15,
    samples: 450,
  }),

  /** Gleb "ICM": a tournament specialist; with a short stack he plays near-perfect push or fold. */
  gleb: profile({
    ...SOLID,
    vpip: 0.23,
    pfr: 0.2,
    pushFold: { share: 0.5, callShare: 0.32, maxDepth: 15 },
    accuracy: 0.97,
    rangeAware: 0.85,
    samples: 450,
  }),

  /** Fedor "Sizing": several bet sizes for every part of his range, so his sizes never give anything away. */
  fedor: profile({ ...SOLID, mixedSizes: true, aggression: 0.7, bluff: 0.15, checkRaise: 0.15, samples: 500 }),
} satisfies Record<string, BotProfile>;

/** Alisa "Chameleon" switches between these styles every 20–30 hands. */
const ALISA_STYLES: BotProfile[] = [
  profile({ ...SOLID, vpip: 0.2, pfr: 0.17, aggression: 0.7, bluff: 0.08, samples: 450 }),
  profile({ ...SOLID, vpip: 0.38, pfr: 0.32, threeBet: 0.22, aggression: 0.8, bluff: 0.25, cbet: 0.8, samples: 450 }),
  profile({ ...SOLID, vpip: 0.2, pfr: 0.08, threeBet: 0.06, aggression: 0.35, bluff: 0.04, cbet: 0.3, stickiness: 0.05, samples: 450 }),
  profile({ ...SOLID, vpip: 0.36, pfr: 0.12, aggression: 0.45, bluff: 0.1, cbet: 0.4, stickiness: 0.15, samples: 450 }),
];

export type ProId = keyof typeof PRO_PROFILES | 'sonya' | 'alisa';

export const PRO_BOTS: Record<ProId, () => Bot> = {
  ...(Object.fromEntries(
    Object.entries(PRO_PROFILES).map(([id, p]) => [id, () => trackedBot(id, { profile: () => p })]),
  ) as Record<keyof typeof PRO_PROFILES, () => Bot>),

  /** Sonya "Exploiter": watches your stats during the match and leans into your mistakes. */
  sonya: () => trackedBot('sonya', { profile: (memory) => exploit({ ...SOLID, samples: 450 }, memory.model) }),

  /** Alisa "Chameleon": changes style every 20–30 hands. Teaches noticing the change. */
  alisa: () => {
    let style = 0;
    let nextSwitch = 25;
    return trackedBot('alisa', {
      profile: () => ALISA_STYLES[style]!,
      afterHand: (memory) => {
        if (memory.hands < nextSwitch) return;
        style = (style + 1 + (memory.hands % 3)) % ALISA_STYLES.length;
        nextSwitch = memory.hands + 20 + (memory.hands % 11);
      },
    });
  },
};
