/**
 * Limits of "My hands" and hand analysis. Change them here; nothing else hardcodes these numbers.
 */
export const ANALYSIS_CONFIG = {
  /** Free hand analyses per day; Pro has no limit. */
  freePerDay: 20,
  /** When the daily count starts over: at midnight on the player's phone. */
  reset: 'local-midnight' as const,
  /** Hands kept on the phone; the oldest go first, hands flagged for review are kept longest. */
  historyLimit: 1000,
  /** Monte Carlo samples per decision when analyzing. */
  samples: 1500,
};
