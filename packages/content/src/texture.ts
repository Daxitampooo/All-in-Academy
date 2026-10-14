import { RANKS, rankOf, shuffledDeck, suitOf, type Card, type Rng } from '@pokerall/poker-engine';

/**
 * Flop texture for the c-bet spot every 6-max player meets most: the button opened, the big blind called.
 * The answers follow the base rules taught in the Academy (lessons «Текстура борда», «Контбет»,
 * «Баттон против большого блайнда»), not a solver.
 */

export type Suits = 'rainbow' | 'twoTone' | 'monotone';
export type Advantage = 'raiser' | 'caller' | 'even';
export type Cbet = 'small' | 'big' | 'check';

export type Texture = {
  suits: Suits;
  /** Three different ranks close enough for straights (span of 4 or less). */
  connected: boolean;
  paired: boolean;
  /** Highest rank, 0 = deuce … 12 = ace. */
  top: number;
  /** Flush or straight draws are likely. */
  wet: boolean;
};

export function flopTexture(board: readonly Card[]): Texture {
  const ranks = board.map(rankOf).sort((a, b) => b - a);
  const suitCounts = new Map<number, number>();
  for (const c of board) suitCounts.set(suitOf(c), (suitCounts.get(suitOf(c)) ?? 0) + 1);
  const most = Math.max(...suitCounts.values());
  const suits: Suits = most === 3 ? 'monotone' : most === 2 ? 'twoTone' : 'rainbow';
  const distinct = [...new Set(ranks)];
  const paired = distinct.length < 3;
  // The ace also plays low: A-2-3 is connected.
  const spans = [distinct[0]! - distinct[distinct.length - 1]!];
  if (distinct[0] === 12) {
    const low = distinct.slice(1).concat(-1).sort((a, b) => b - a);
    spans.push(low[0]! - low[low.length - 1]!);
  }
  const connected = !paired && Math.min(...spans) <= 4;
  return { suits, connected, paired, top: ranks[0]!, wet: suits !== 'rainbow' || connected };
}

const QUEEN = RANKS.indexOf('Q');
const NINE = RANKS.indexOf('9');

/**
 * Who the flop suits. The button opens many big cards, so ace-, king- and queen-high flops are its; the big
 * blind keeps more low connected hands, so low connected flops are its; the rest are close.
 */
export function rangeAdvantage(t: Texture): Advantage {
  if (t.top >= QUEEN) return 'raiser';
  if (t.top <= NINE && t.connected) return 'caller';
  return 'even';
}

/** The usual c-bet: small with most hands on dry flops, bigger and less often on wet ones, checks on the caller's flops. */
export function cbetPlan(t: Texture): Cbet {
  if (rangeAdvantage(t) === 'caller') return 'check';
  return t.wet ? 'big' : 'small';
}

export type TextureQuestion = {
  board: Card[];
  texture: Texture;
  ask: 'advantage' | 'cbet';
  /** Options in a fixed order: raiser, caller, even / small, big, check. */
  answer: number;
};

const ADVANTAGES: Advantage[] = ['raiser', 'caller', 'even'];
const CBETS: Cbet[] = ['small', 'big', 'check'];

export function textureQuestion(rng: Rng, ask?: 'advantage' | 'cbet'): TextureQuestion {
  const board = shuffledDeck(rng).slice(0, 3);
  const texture = flopTexture(board);
  const kind = ask ?? (rng.nextInt(2) === 0 ? 'advantage' : 'cbet');
  const answer = kind === 'advantage' ? ADVANTAGES.indexOf(rangeAdvantage(texture)) : CBETS.indexOf(cbetPlan(texture));
  return { board, texture, ask: kind, answer };
}
