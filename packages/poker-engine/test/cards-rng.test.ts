import { describe, expect, it } from 'vitest';

import {
  cardToString,
  cardsToString,
  chacha20Block,
  createSeededRng,
  fullDeck,
  parseCard,
  parseCards,
  rankOf,
  seedFromHex,
  seedToHex,
  shuffle,
  shuffledDeck,
  suitOf,
} from '../src';

describe('cards', () => {
  it('round-trips every card through text', () => {
    for (const c of fullDeck()) expect(parseCard(cardToString(c))).toBe(c);
  });

  it('reads common spellings', () => {
    expect(cardToString(parseCard('as'))).toBe('As');
    expect(cardToString(parseCard('10h'))).toBe('Th');
    expect(cardsToString(parseCards('AsKd 2c,Th'))).toBe('As Kd 2c Th');
    expect(rankOf(parseCard('Ac'))).toBe(12);
    expect(suitOf(parseCard('2s'))).toBe(3);
  });

  it('rejects bad input', () => {
    expect(() => parseCard('1x')).toThrow();
    expect(() => parseCard('Asd')).toThrow();
    expect(() => parseCards('AsAs')).toThrow(/twice/);
  });
});

describe('ChaCha20', () => {
  it('matches the RFC 8439 block test vector (section 2.3.2)', () => {
    const key = new Uint32Array(8);
    for (let i = 0; i < 8; i++) {
      key[i] = (i * 4) | ((i * 4 + 1) << 8) | ((i * 4 + 2) << 16) | ((i * 4 + 3) << 24);
    }
    const nonce = new Uint32Array([0x09000000, 0x4a000000, 0x00000000]);
    const out = Array.from(chacha20Block(key, 1, nonce));
    expect(out).toEqual([
      0xe4e7f110, 0x15593bd1, 0x1fdd0f50, 0xc47120a3, 0xc7f4d1c7, 0x0368c033, 0x9aaa2204, 0x4e6cd4c3,
      0x466482d2, 0x09aa9f07, 0x05d7c214, 0xa2028bd9, 0xd19c12b5, 0xb94e16de, 0xe883d0cb, 0x4e3c50a2,
    ]);
  });
});

describe('seeded RNG and shuffle', () => {
  const seed = seedFromHex('0123456789abcdef'.repeat(4));

  it('is deterministic for a seed', () => {
    expect(shuffledDeck(createSeededRng(seed))).toEqual(shuffledDeck(createSeededRng(seed)));
    const other = seedFromHex('f'.repeat(64));
    expect(shuffledDeck(createSeededRng(seed))).not.toEqual(shuffledDeck(createSeededRng(other)));
    expect(seedToHex(seed)).toBe('0123456789abcdef'.repeat(4));
  });

  it('produces a permutation of the deck', () => {
    const deck = shuffledDeck(createSeededRng(seed));
    expect(deck.slice().sort((a, b) => a - b)).toEqual(fullDeck());
  });

  it('keeps nextInt inside the range', () => {
    const rng = createSeededRng(seed);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.nextInt(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it('places every card in every position about equally often', () => {
    // 52 × 52 counts over 52 000 shuffles: each cell expects 1000.
    const rng = createSeededRng(seed);
    const counts = Array.from({ length: 52 }, () => new Array<number>(52).fill(0));
    const runs = 52_000;
    for (let r = 0; r < runs; r++) {
      shuffle(fullDeck(), rng).forEach((card, pos) => {
        counts[card]![pos]!++;
      });
    }
    const flat = counts.flat();
    expect(Math.min(...flat)).toBeGreaterThan(850);
    expect(Math.max(...flat)).toBeLessThan(1150);
  });
});
