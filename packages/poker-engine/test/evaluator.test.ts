import { describe, expect, it } from 'vitest';

import {
  HandCategory,
  cardsToString,
  categoryIdOf,
  categoryOf,
  describeHand,
  evaluate,
  parseCards,
  type Card,
} from '../src';

const value = (text: string) => evaluate(parseCards(text));
const id = (text: string) => categoryIdOf(value(text));

describe('hand categories', () => {
  it('recognizes every category', () => {
    expect(id('AsKsQsJsTs')).toBe('royal-flush');
    expect(id('9h8h7h6h5h')).toBe('straight-flush');
    expect(id('5d4d3d2dAd')).toBe('straight-flush');
    expect(id('7c7d7h7s2c')).toBe('quads');
    expect(id('KcKdKh2s2c')).toBe('full-house');
    expect(id('Ah9h7h4h2h')).toBe('flush');
    expect(id('Tc9d8h7s6c')).toBe('straight');
    expect(id('5c4d3h2sAc')).toBe('straight');
    expect(id('QcQdQh9s2c')).toBe('trips');
    expect(id('JcJd4h4s2c')).toBe('two-pair');
    expect(id('9c9d7h4s2c')).toBe('pair');
    expect(id('Ac9d7h4s2c')).toBe('high-card');
  });

  it('counts all 2 598 960 five-card hands correctly', () => {
    const counts = new Array<number>(9).fill(0);
    const hand: Card[] = [0, 0, 0, 0, 0];
    for (let a = 0; a < 52; a++)
      for (let b = a + 1; b < 52; b++)
        for (let c = b + 1; c < 52; c++)
          for (let d = c + 1; d < 52; d++)
            for (let e = d + 1; e < 52; e++) {
              hand[0] = a;
              hand[1] = b;
              hand[2] = c;
              hand[3] = d;
              hand[4] = e;
              counts[categoryOf(evaluate(hand))]!++;
            }
    expect(counts).toEqual([1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
  });
});

describe('comparing hands', () => {
  it('orders categories', () => {
    const ladder = [
      'Ac9d7h4s2c',
      '9c9d7h4s2c',
      'JcJd4h4s2c',
      'QcQdQh9s2c',
      'Tc9d8h7s6c',
      'Ah9h7h4h2h',
      'KcKdKh2s2c',
      '7c7d7h7s2c',
      '9h8h7h6h5h',
      'AsKsQsJsTs',
    ].map(value);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]).toBeGreaterThan(ladder[i - 1]!);
  });

  it('uses kickers', () => {
    expect(value('AcAdKh7s2c')).toBeGreaterThan(value('AhAsQc7d2d'));
    expect(value('AcAdKh7s3c')).toBeGreaterThan(value('AhAsKc7d2d'));
    expect(value('KcKd5h5sAc')).toBeGreaterThan(value('KhKs5c5dQc'));
    expect(value('7c7d7hAs2c')).toBeGreaterThan(value('7s7c7dKs2d'));
    expect(value('Ah9h7h4h3h')).toBeGreaterThan(value('As9s7s4s2s'));
    expect(value('QcQdQhQsAc')).toBeGreaterThan(value('QcQdQhQsKc'));
  });

  it('treats the wheel as the lowest straight', () => {
    expect(value('6c5d4h3s2c')).toBeGreaterThan(value('5c4d3h2sAc'));
    expect(value('6h5h4h3h2h')).toBeGreaterThan(value('5s4s3s2sAs'));
    expect(value('5c4d3h2sAc')).toBeGreaterThan(value('AcAdKh7s2c'));
  });

  it('splits equal hands regardless of suits', () => {
    expect(value('AcKd9h7s3c')).toBe(value('AsKh9c7d3s'));
    expect(value('Tc9d8h7s6c')).toBe(value('Th9s8c7d6d'));
  });
});

describe('best hand from 6 and 7 cards', () => {
  it('picks the strongest five', () => {
    expect(id('AsKs2h2d2cQsJs')).toBe('trips');
    expect(id('AsKs2h2d2cKdJs')).toBe('full-house');
    expect(id('AsKsQsJsTs2h2d')).toBe('royal-flush');
    expect(id('2c3d4h5s6c7d8h')).toBe('straight');
    expect(value('2c3d4h5s6c7d8h')).toBe(value('4c5d6h7s8c'));
  });

  it('uses the third pair as a kicker for two pair', () => {
    // Two pair with three pairs available: best two pairs plus the best remaining card.
    expect(value('KcKd9h9s4c4dAh')).toBe(value('KcKd9h9sAh'));
    expect(value('KcKd9h9s4c4d2h')).toBe(value('KcKd9h9s4c'));
  });

  it('takes the higher trips as the full house', () => {
    expect(value('9c9d9h5s5c5dAh')).toBe(value('9c9d9h5s5c'));
  });

  it('prefers the flush over a straight when both exist', () => {
    expect(id('9h8h7h6s5h2hKc')).toBe('flush');
  });

  it('finds a straight flush hidden among more suited cards', () => {
    expect(id('AhKh9h8h7h6h5h')).toBe('straight-flush');
  });

  it('lets the board play for both players', () => {
    const board = 'AsKdQhJcTs';
    expect(value(board + '2c3d')).toBe(value(board + '4h5h'));
  });
});

describe('describeHand', () => {
  it('returns the five cards that make the hand, grouped and ordered', () => {
    const d = describeHand(parseCards('Kh7cKs7d2cAh3s'));
    expect(d.category).toBe(HandCategory.TwoPair);
    expect(cardsToString(d.bestFive)).toBe('Ks Kh 7d 7c Ah');
  });

  it('puts the ace last in a wheel', () => {
    const d = describeHand(parseCards('Ac2d3h4s5cKdKh'));
    expect(d.categoryId).toBe('straight');
    expect(cardsToString(d.bestFive)).toBe('5c 4s 3h 2d Ac');
  });
});
