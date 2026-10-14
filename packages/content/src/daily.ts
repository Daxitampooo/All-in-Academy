import { createSeededRng, type Rng } from '@pokerall/poker-engine';

import {
  outsQuestion,
  potOddsQuestion,
  preflopQuestion,
  showdownQuestion,
  type OutsQuestion,
  type PotOddsQuestion,
  type PreflopQuestion,
  type ShowdownQuestion,
} from './drills';
import { textureQuestion, type TextureQuestion } from './texture';

/** The day's challenge: the same ten spots for every player on that date, so results can be compared. */
export type DailyQuestion =
  | { kind: 'preflop'; q: PreflopQuestion }
  | { kind: 'potOdds'; q: PotOddsQuestion }
  | { kind: 'outs'; q: OutsQuestion }
  | { kind: 'showdown'; q: ShowdownQuestion }
  | { kind: 'texture'; q: TextureQuestion };

export const DAILY_SIZE = 10;

const PLAN: DailyQuestion['kind'][] = ['preflop', 'potOdds', 'outs', 'preflop', 'texture', 'showdown', 'potOdds', 'preflop', 'outs', 'showdown'];

/** A 32-byte seed from a date like "2026-10-14" (FNV-1a over the text, spread over the bytes). */
export function daySeed(day: string): Uint8Array {
  const out = new Uint8Array(32);
  let h = 0x811c9dc5;
  for (let i = 0; i < 32; i++) {
    h ^= day.charCodeAt(i % day.length) + i * 31;
    h = Math.imul(h, 0x01000193) >>> 0;
    out[i] = h >>> 24;
  }
  return out;
}

export function dailyQuestions(day: string): DailyQuestion[] {
  const rng: Rng = createSeededRng(daySeed(day));
  return PLAN.map((kind): DailyQuestion => {
    switch (kind) {
      case 'preflop':
        return { kind, q: preflopQuestion(rng) };
      case 'potOdds':
        return { kind, q: potOddsQuestion(rng) };
      case 'outs':
        return { kind, q: outsQuestion(rng) };
      case 'showdown':
        return { kind, q: showdownQuestion(rng) };
      case 'texture':
        return { kind, q: textureQuestion(rng) };
    }
  });
}
