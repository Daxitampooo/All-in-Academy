import { describe, expect, it } from 'vitest';

import forms from '../glossary/forms.json';
import enGlossary from '../glossary/en.json';
import ruGlossary from '../glossary/ru.json';
import { allLessons } from '../src/academy';
import { findTerms, linkTerms, termSegments } from '../src/terms';

const ids = (text: string, locale: 'en' | 'ru') => findTerms(text, locale).map((m) => m.id);

describe('findTerms', () => {
  it('finds Russian terms in any case form', () => {
    expect(ids('Ставь контбетом на сухом борде', 'ru')).toEqual(['c-bet', 'board']);
    expect(ids('Против 3-бета без позиции', 'ru')).toEqual(['3-bet', 'position']);
    expect(ids('Пот-оддсов не хватает для колла', 'ru')).toEqual(['pot-odds', 'call']);
  });

  it('matches whole words only', () => {
    expect(ids('потом стекло банкет лики', 'ru')).toEqual([]);
    expect(ids('a potion and a stackable boardroom', 'en')).toEqual([]);
  });

  it('prefers the longest term and keeps hyphenated words whole', () => {
    expect(ids('чек-рейз на тёрне', 'ru')).toEqual(['check-raise', 'turn']);
    expect(ids('a check-raise, then a check', 'en')).toEqual(['check-raise', 'check']);
    expect(ids('текстура борда важна', 'ru')).toEqual(['texture']);
  });

  it('matches abbreviations only in capitals', () => {
    expect(ids('EV and SPR', 'en')).toEqual(['ev', 'spr']);
    expect(ids('every spr', 'en')).toEqual([]);
  });

  it('skips everyday phrases', () => {
    expect(ids("When it's your turn, think about the turn", 'en')).toEqual(['turn']);
  });

  it('returns exact positions', () => {
    const text = 'Флопы и тёрны';
    expect(findTerms(text, 'ru').map((m) => text.slice(m.start, m.end))).toEqual(['Флопы', 'тёрны']);
  });
});

describe('linkTerms', () => {
  it('links only the first use of each term across texts', () => {
    expect(linkTerms(['Колл или фолд.', 'Снова колл, потом рейз.'], 'ru')).toEqual([
      '[[call|Колл]] или [[fold|фолд]].',
      'Снова колл, потом [[raise|рейз]].',
    ]);
  });

  it('leaves skipped terms and markdown alone', () => {
    expect(linkTerms(['**Fold** or call'], 'en', ['call'])).toEqual(['**[[fold|Fold]]** or call']);
  });
});

describe('termSegments', () => {
  it('splits marked text', () => {
    expect(termSegments('a [[fold|Fold]] b')).toEqual([{ text: 'a ' }, { text: 'Fold', term: 'fold' }, { text: ' b' }]);
    expect(termSegments('plain')).toEqual([{ text: 'plain' }]);
  });
});

describe('glossary forms', () => {
  it('cover every glossary term in both languages', () => {
    expect(Object.keys(forms.en).sort()).toEqual(Object.keys(enGlossary).sort());
    expect(Object.keys(forms.ru).sort()).toEqual(Object.keys(ruGlossary).sort());
  });

  it('link terms in every lesson without breaking the text', () => {
    for (const lesson of allLessons()) {
      for (const locale of ['en', 'ru'] as const) {
        const texts = lesson.blocks.filter((b) => b.type === 'text').map((b) => lesson.text[locale].blocks[b.id]?.text ?? '');
        const linked = linkTerms(texts, locale);
        const plain = linked.map((t) => termSegments(t).map((s) => s.text).join(''));
        expect(plain).toEqual(texts);
      }
    }
  });
});
