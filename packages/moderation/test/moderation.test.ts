import { describe, expect, it } from 'vitest';

import { checkAbout, checkNickname, findProfanity, hasProfanity } from '../src';

describe('profanity', () => {
  it('finds swearing in Russian and English', () => {
    for (const text of ['ну ты и сука', 'Блядь', 'пиздец', 'ебать', 'заебал уже', 'нахуй', 'мудак', 'what the fuck', 'shit happens', 'bitch', 'долбоёб', 'пидор']) {
      expect(hasProfanity(text), text).toBe(true);
    }
  });

  it('sees through disguises', () => {
    for (const text of ['xyй', 'хуууууй', 'х у й', 'f.u.c.k', 'sh1t', '6ля', 'fuuuuck', 'п.и.з.д.а', 'blyat', 'Ёбаный']) {
      expect(hasProfanity(text), text).toBe(true);
    }
  });

  it('leaves ordinary words alone', () => {
    const clean = [
      'Сукно стола зелёное',
      'Застрахуйте машину',
      'Сто рублей, два рубля',
      'Кусок хлеба',
      'небо',
      'себе',
      'требовать',
      'корабля',
      'хуже не будет',
      'cocktail party',
      'Niger and Nigeria',
      'class assessment',
      'Dickens',
      'скипидар',
      'жидкость',
      'Я играю в покер с 2015 года',
      'Люблю AKs и тузы',
    ];
    for (const text of clean) {
      expect(findProfanity(text), text).toBeNull();
    }
  });
});

describe('nickname', () => {
  it('accepts normal nicknames', () => {
    for (const nick of ['Neon_Fish', 'Даня', 'river.rat', 'AceHigh99', 'Лёха-2']) expect(checkNickname(nick), nick).toBeNull();
  });

  it('explains what is wrong', () => {
    expect(checkNickname('ab')).toBe('short');
    expect(checkNickname('a'.repeat(17))).toBe('long');
    expect(checkNickname('two words')).toBe('chars');
    expect(checkNickname('__x__')).toBe('chars');
    expect(checkNickname('emoji😀')).toBe('chars');
    expect(checkNickname('Fuck_you')).toBe('profanity');
    expect(checkNickname('сука')).toBe('profanity');
    expect(checkNickname('Admin')).toBe('reserved');
    expect(checkNickname('Модератор')).toBe('reserved');
  });
});

describe('about', () => {
  it('limits length, swearing and links', () => {
    expect(checkAbout('Играю тайтово, люблю турниры')).toBeNull();
    expect(checkAbout('x'.repeat(141))).toBe('long');
    expect(checkAbout('ну и хуйня')).toBe('profanity');
    expect(checkAbout('заходите на pokerroom.com')).toBe('link');
    expect(checkAbout('пишите в t.me/somechat')).toBe('link');
    expect(checkAbout('мой инст @pokerguy')).toBe('link');
  });
});
