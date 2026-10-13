import { exploit } from './pros';
import { trackedBot } from './tracked';
import { DEFAULT_PROFILE, type Bot, type BotProfile } from './types';

const profile = (overrides: Partial<BotProfile>): BotProfile => ({ ...DEFAULT_PROFILE, ...overrides });

/**
 * League "Masters" (2500–2900). No solver fits on a phone: these are strong heuristics on top of reading
 * ranges, with heads-up preflop pressure (wide 3-bets, defending 3-bets with much of the opening range),
 * mixed bet sizes and adapting to the opponent. Honest about it in the app: they are the strongest bots,
 * not a solver.
 */

/** Professor Arkady: solid everywhere, precise equity against ranges, relentless 3-bets. */
const ARKADY = profile({
  vpip: 0.24,
  pfr: 0.2,
  threeBet: 0.21,
  foldToRaise: 0.3,
  defend3Bet: 1,
  aggression: 0.66,
  bluff: 0.12,
  cbet: 0.6,
  semiBluff: 0.4,
  checkRaise: 0.15,
  accuracy: 1,
  rangeAware: 0.9,
  samples: 600,
});

/** Nika "Solver": mixed strategies on every street, several sizes, balanced check-raises. */
const NIKA = profile({ ...ARKADY, threeBet: 0.22, mixedSizes: true, checkRaise: 0.2, samples: 800 });

/** Neon's base: Nika's balance with the sharpest preflop pressure. */
const NEON = profile({ ...NIKA, threeBet: 0.24, bluff: 0.16, sizes: { open: 2.2, bet: 0.6, raise: 0.8 }, samples: 900 });

export type MasterId = 'arkady' | 'nika' | 'neon';

export const MASTER_BOTS: Record<MasterId, () => Bot> = {
  arkady: () => trackedBot('arkady', { profile: () => ARKADY }),
  nika: () => trackedBot('nika', { profile: () => NIKA }),
  /** Neon: the strongest honest bot. A balanced base that also reads your sizes and leans into your leaks. */
  neon: () =>
    trackedBot('neon', {
      profile: (memory) => exploit(NEON, memory.model, 0.7),
      readsSizing: true,
    }),
};
