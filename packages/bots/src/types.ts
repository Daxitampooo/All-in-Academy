import type { PlayerAction, PlayerView, Rng } from '@pokerall/poker-engine';

/**
 * A bot plays from a PlayerView: public information plus its own cards.
 * It never receives the full hand state, so it can't see other players'
 * cards or the deck.
 */
export interface Bot {
  readonly id: string;
  decide(view: PlayerView, rng: Rng): PlayerAction;
  /** Called once a hand is over, for bots that remember how the game went. */
  handFinished?(view: PlayerView): void;
}

/** Parameters that make bot styles differ. All shares are 0..1. */
export type BotProfile = {
  /** Chance to take a uniformly random legal action instead of thinking. */
  randomness: number;
  /** Preflop: share of starting hands it plays when nobody has raised. */
  vpip: number;
  /** Preflop: share of starting hands it raises first in. */
  pfr: number;
  /** Preflop: share of starting hands it re-raises with against a raise. */
  threeBet: number;
  /** Preflop: how readily it gives up against a raise (0 never, 1 unless premium). */
  foldToRaise: number;
  /** Calls the big blind instead of raising first in. */
  limps: boolean;
  /**
   * Widens ranges in late position and short-handed, as good players do.
   * The share-based ranges above are for an early seat at a 6-max table.
   */
  positionAware: boolean;
  /** Postflop: chance to bet or raise when it thinks it's ahead. */
  aggression: number;
  /** Postflop: chance to bet a weak hand when nobody has bet. */
  bluff: number;
  /** How much worse a price it accepts when calling (negative means it needs a better price). */
  stickiness: number;
  /** Treats any pair that uses a hole card as a monster. */
  pairLove: number;
  /** Calls with any draw whatever the price. */
  drawLove: number;
  /** Precision of its equity estimate: 0 very noisy, 1 precise. */
  accuracy: number;
  /** Chance to fold a strong hand facing a bet. */
  panicFold: number;
  /** Bets and raises postflop only with a strong made hand, never as a bluff. */
  valueOnly: boolean;
  /** Equity at which it considers its hand strong enough to bet for value. */
  valueThreshold: number;
  /** Bet sizes: preflop open in big blinds, postflop bet and raise as pot fractions. */
  sizes: { open: number; bet: number; raise: number };
  /** Runouts sampled for each equity estimate. */
  samples: number;
};

export const DEFAULT_PROFILE: BotProfile = {
  randomness: 0,
  vpip: 0.25,
  pfr: 0.18,
  threeBet: 0.05,
  foldToRaise: 0.5,
  limps: false,
  positionAware: true,
  aggression: 0.5,
  bluff: 0.1,
  stickiness: 0,
  pairLove: 0,
  drawLove: 0,
  accuracy: 0.8,
  panicFold: 0,
  valueOnly: false,
  valueThreshold: 0.6,
  sizes: { open: 2.5, bet: 0.6, raise: 0.8 },
  samples: 250,
};
