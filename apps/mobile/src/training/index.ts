/**
 * Training bots that cheat on purpose, to teach a lesson: Lekha "Lucky" gets a rigged deck (variance can
 * beat correct play over a session), Danil sees every card (what a cheater looks like at the table).
 *
 * This module is offline and on the device only. It is used by the practice table hook alone, never by
 * multiplayer code: `scripts/check-training-isolation.mjs` fails the build if anything else imports it, and
 * neither `@pokerall/bots` nor the server know these bots exist.
 */
import type { Card, HandState, PlayerAction, Rng } from '@pokerall/poker-engine';

import { createDanil } from './danil';
import { createLekha } from './lekha';

export { evNetOf, isBadBeat, type TrainingReport } from './report';

export type TrainingBot = {
  id: string;
  /** Deals the hand: `deal` turns a deck into a hand. Rigged for Lekha. */
  dealHand: (deal: (deck: Card[]) => HandState, seat: number, rng: Rng) => HandState;
  /** Decides with the whole hand state, other players' cards and the coming board included. */
  decide: (state: HandState, seat: number, rng: Rng) => PlayerAction;
  handFinished: (state: HandState, seat: number) => void;
  /** Hands dealt from a deck picked in the bot's favour so far. */
  riggedHands: () => number;
};

export const TRAINING_BOT_IDS = ['lekha', 'danil'] as const;
export type TrainingBotId = (typeof TRAINING_BOT_IDS)[number];

export function isTrainingBot(id: string): id is TrainingBotId {
  return (TRAINING_BOT_IDS as readonly string[]).includes(id);
}

/** A fresh training bot for one heads-up match. */
export function createTrainingBot(id: TrainingBotId): TrainingBot {
  return id === 'lekha' ? createLekha() : createDanil();
}
