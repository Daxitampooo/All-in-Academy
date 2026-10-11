/**
 * Cards are integers 0..51: `rank * 4 + suit`.
 * Rank 0 is a deuce and 12 is an ace; suits are clubs, diamonds, hearts, spades.
 */
export type Card = number;

export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';

export type Suit = 'c' | 'd' | 'h' | 's';

export const RANK_ACE = 12;

export function makeCard(rank: number, suit: number): Card {
  if (!Number.isInteger(rank) || rank < 0 || rank > 12) throw new Error(`Bad rank ${rank}`);
  if (!Number.isInteger(suit) || suit < 0 || suit > 3) throw new Error(`Bad suit ${suit}`);
  return rank * 4 + suit;
}

export function rankOf(card: Card): number {
  return card >> 2;
}

export function suitOf(card: Card): number {
  return card & 3;
}

export function isCard(value: unknown): value is Card {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < 52;
}

/** Parses "As", "Td", "2c". Accepts "10" for ten and either case. */
export function parseCard(text: string): Card {
  const t = text.trim();
  const rankText = t.length === 3 && t.startsWith('10') ? 'T' : t[0]?.toUpperCase();
  const suitText = t[t.length - 1]?.toLowerCase();
  const rank = rankText ? RANKS.indexOf(rankText) : -1;
  const suit = suitText ? SUITS.indexOf(suitText) : -1;
  if ((t.length !== 2 && t.length !== 3) || rank < 0 || suit < 0) {
    throw new Error(`Can't read card "${text}"`);
  }
  return makeCard(rank, suit);
}

/** Parses "AsKd" or "As Kd" or "As,Kd". */
export function parseCards(text: string): Card[] {
  const compact = text.replace(/[\s,]+/g, '').replace(/10/g, 'T');
  if (compact.length % 2 !== 0) throw new Error(`Can't read cards "${text}"`);
  const cards: Card[] = [];
  for (let i = 0; i < compact.length; i += 2) cards.push(parseCard(compact.slice(i, i + 2)));
  assertDistinct(cards);
  return cards;
}

export function cardToString(card: Card): string {
  if (!isCard(card)) throw new Error(`Not a card: ${card}`);
  return RANKS[rankOf(card)]! + SUITS[suitOf(card)]!;
}

export function cardsToString(cards: readonly Card[], separator = ' '): string {
  return cards.map(cardToString).join(separator);
}

/** A fresh deck in a fixed order: 2c 2d 2h 2s 3c ... As. */
export function fullDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

export function assertDistinct(cards: readonly Card[]): void {
  const seen = new Uint8Array(52);
  for (const c of cards) {
    if (!isCard(c)) throw new Error(`Not a card: ${c}`);
    if (seen[c]) throw new Error(`Card ${cardToString(c)} appears twice`);
    seen[c] = 1;
  }
}
