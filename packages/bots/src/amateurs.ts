import { profileBot } from './brain';
import { trackedBot } from './tracked';
import { DEFAULT_PROFILE, type Bot, type BotProfile } from './types';

const profile = (overrides: Partial<BotProfile>): BotProfile => ({ ...DEFAULT_PROFILE, ...overrides });

/**
 * League "Amateurs" (700–1200). Each bot has one big, readable leak; beating it means spotting the leak
 * and punishing it. Styles are never shown in the app: guessing them is part of the training.
 */
export const AMATEUR_PROFILES = {
  /** Max "Maniac": raises and shoves almost any two cards. Teaches calling wider and not panicking. */
  max: profile({
    positionAware: false,
    vpip: 0.8,
    pfr: 0.62,
    threeBet: 0.3,
    foldToRaise: 0.08,
    aggression: 0.85,
    bluff: 0.5,
    semiBluff: 0.5,
    stickiness: 0.4,
    accuracy: 0.35,
    sizes: { open: 3.5, bet: 0.9, raise: 1.2 },
    samples: 140,
  }),

  /** Gena "On the line": always on the phone, plays half-distracted and misclicks now and then. */
  gena: profile({
    positionAware: false,
    randomness: 0.06,
    vpip: 0.4,
    pfr: 0.08,
    threeBet: 0.03,
    foldToRaise: 0.35,
    aggression: 0.35,
    bluff: 0.05,
    stickiness: 0.2,
    accuracy: 0.6,
    samples: 140,
  }),

  /** Dasha "Scaredy": folds to any serious bet. Teaches bluffing and fold equity. */
  dasha: profile({
    vpip: 0.32,
    pfr: 0.18,
    threeBet: 0.03,
    foldToRaise: 0.6,
    aggression: 0.55,
    bluff: 0.06,
    stickiness: -0.1,
    foldToBigBet: 0.6,
    accuracy: 0.72,
    samples: 160,
  }),

  /** Stas "Trap": slowplays strong hands, checking and calling, then raises the river. Teaches caution. */
  stas: profile({
    vpip: 0.26,
    pfr: 0.13,
    threeBet: 0.04,
    foldToRaise: 0.5,
    aggression: 0.45,
    slowplay: 0.8,
    bluff: 0.05,
    stickiness: 0.05,
    accuracy: 0.68,
    samples: 180,
  }),

  /** Roma "Draw hunter": overplays draws, semi-bluffing with any out. Teaches defending against draws. */
  roma: profile({
    vpip: 0.36,
    pfr: 0.2,
    threeBet: 0.05,
    foldToRaise: 0.4,
    aggression: 0.55,
    bluff: 0.1,
    drawLove: 0.7,
    semiBluff: 0.7,
    stickiness: 0.1,
    accuracy: 0.72,
    samples: 180,
  }),

  /** Katya "Value only": never bluffs and bets only strong hands. Teaches folding to such players. */
  katya: profile({
    vpip: 0.22,
    pfr: 0.17,
    threeBet: 0.05,
    foldToRaise: 0.5,
    aggression: 0.75,
    valueOnly: true,
    valueThreshold: 0.7,
    bluff: 0,
    accuracy: 0.76,
    samples: 220,
  }),
} satisfies Record<string, BotProfile>;

/** Vadim "Tilter" before a big loss: a decent, slightly loose regular. */
const VADIM_CALM = profile({
  vpip: 0.25,
  pfr: 0.19,
  threeBet: 0.06,
  foldToRaise: 0.45,
  aggression: 0.6,
  bluff: 0.1,
  cbet: 0.55,
  accuracy: 0.8,
  rangeAware: 0.2,
  samples: 220,
});

/** Vadim on tilt: plays anything, bets anything, calls anything. */
const VADIM_TILTED = profile({
  positionAware: false,
  vpip: 0.7,
  pfr: 0.45,
  threeBet: 0.2,
  foldToRaise: 0.15,
  aggression: 0.8,
  bluff: 0.35,
  stickiness: 0.45,
  accuracy: 0.4,
  sizes: { open: 3.5, bet: 0.9, raise: 1.1 },
  samples: 140,
});

/** Hands Vadim stays on tilt after losing a big pot. */
const TILT_HANDS = 20;

/** Vadim "Tilter": plays fine until he loses a big pot, then goes on tilt for a while. */
function vadim(): Bot {
  let tilt = 0;
  return trackedBot('vadim', {
    profile: () => (tilt > 0 ? VADIM_TILTED : VADIM_CALM),
    afterHand: (memory) => {
      if (tilt > 0) tilt -= 1;
      if (memory.lastNetBB <= -25) tilt = TILT_HANDS;
    },
  });
}

export type AmateurId = keyof typeof AMATEUR_PROFILES | 'vadim';

export const AMATEUR_BOTS: Record<AmateurId, () => Bot> = {
  ...(Object.fromEntries(
    Object.entries(AMATEUR_PROFILES).map(([id, p]) => [id, () => profileBot(id, p)]),
  ) as Record<keyof typeof AMATEUR_PROFILES, () => Bot>),
  vadim,
};
