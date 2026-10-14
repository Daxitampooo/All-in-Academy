import { describe, expect, it } from 'vitest';

import { EmailLoginSchema, EmailRegisterSchema, GuestCreateSchema, HandClassSchema, ProfileSchema } from '../src';

const avatar = {
  face: { hair: 'short', eyes: 'dots', brows: 'flat', mouth: 'smile' },
  background: 'plain',
  frame: 'ring',
  outline: 'cyan',
  badge: null,
};

describe('auth schemas', () => {
  it('normalizes emails and needs the 18+ confirmation', () => {
    const ok = EmailRegisterSchema.parse({ email: '  Player@Mail.RU ', password: 'longenough', ageConfirmed: true, locale: 'ru' });
    expect(ok.email).toBe('player@mail.ru');
    const noAge = EmailRegisterSchema.safeParse({ email: 'a@b.co', password: 'longenough', ageConfirmed: false, locale: 'en' });
    expect(noAge.success).toBe(false);
    expect(noAge.error?.issues[0]?.message).toBe('age_required');
  });

  it('checks password length only for new passwords', () => {
    expect(EmailRegisterSchema.safeParse({ email: 'a@b.co', password: 'short', ageConfirmed: true, locale: 'en' }).success).toBe(false);
    expect(EmailLoginSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(true);
  });

  it('wants a long random guest secret', () => {
    expect(GuestCreateSchema.safeParse({ guestSecret: 'abc', ageConfirmed: true, locale: 'en' }).success).toBe(false);
    expect(GuestCreateSchema.safeParse({ guestSecret: 'a'.repeat(43), ageConfirmed: true, locale: 'en' }).success).toBe(true);
  });
});

describe('profile schema', () => {
  it('accepts a full profile', () => {
    const profile = {
      nickname: 'Neon_Fox',
      about: 'Люблю тугую игру',
      country: 'RU',
      favoriteHand: 'AKs',
      style: 'tag',
      avatar,
      title: 'river-master',
      showTitle: true,
    };
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
    expect(ProfileSchema.safeParse({ ...profile, country: 'rus' }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...profile, avatar: { ...avatar, face: { ...avatar.face, laser: 'x' } } }).success).toBe(false);
  });

  it('reads hands in range notation', () => {
    for (const ok of ['AKs', 'QJo', '77', 'T9s']) expect(HandClassSchema.safeParse(ok).success).toBe(true);
    for (const bad of ['AA s', 'AKx', '77s', 'A1o', 'AK']) expect(HandClassSchema.safeParse(bad).success).toBe(false);
  });
});
