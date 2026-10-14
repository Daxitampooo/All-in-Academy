/** Trainer limits. Change them here; nothing else hardcodes these numbers. */
export const DRILL_CONFIG = {
  /** Free preflop trainer hands per day (resets at local midnight); Pro has no limit. */
  preflopFreePerDay: 50,
  /** A missed hand comes back after this many other questions, until it's answered right. */
  repeatAfter: 3,
};
