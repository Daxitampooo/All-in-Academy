import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { guestSecret, profile, setup } from './helpers';

let t: Awaited<ReturnType<typeof setup>>;

beforeAll(async () => {
  t = await setup();
});
afterAll(async () => {
  await t?.close();
});

async function newPlayer() {
  const res = await t.call('POST', '/v1/auth/guest', { guestSecret: guestSecret(), ageConfirmed: true, locale: 'ru' });
  return res.body.tokens.accessToken as string;
}

describe('profile', () => {
  it('saves a profile and shows it in the account', async () => {
    const token = await newPlayer();
    const saved = await t.call('PUT', '/v1/me/profile', { profile: profile(), updatedAt: 1000 }, token);
    expect(saved.status).toBe(200);
    expect(saved.body.applied).toBe(true);
    const me = await t.call('GET', '/v1/me', undefined, token);
    expect(me.body.me.profile).toMatchObject({ nickname: 'NeonFox', country: 'RU', favoriteHand: 'AKs', updatedAt: 1000 });
  });

  it('runs the same text checks as the phone', async () => {
    const token = await newPlayer();
    const swear = await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'Xyйлo' }), updatedAt: 1 }, token);
    expect(swear.status).toBe(400);
    expect(swear.body.error).toEqual({ code: 'nickname_invalid', field: 'nickname', reason: 'profanity' });
    const admin = await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'Admin' }), updatedAt: 1 }, token);
    expect(admin.body.error.reason).toBe('reserved');
    const link = await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'Linker', about: 'пиши в t.me/abc' }), updatedAt: 1 }, token);
    expect(link.body.error).toEqual({ code: 'about_invalid', field: 'about', reason: 'link' });
  });

  it('keeps nicknames unique, lookalike letters included', async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    expect((await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'Neon_Owl' }), updatedAt: 1 }, a)).status).toBe(200);
    // Cyrillic "О" and a dot instead of the underscore.
    const clash = await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'NeОn.owl' }), updatedAt: 1 }, b);
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('nickname_taken');
    const check = await t.call('GET', '/v1/nicknames/check?nickname=neonowl', undefined, b);
    expect(check.body).toEqual({ available: false, problem: 'taken' });
    const own = await t.call('GET', '/v1/nicknames/check?nickname=NEON_OWL', undefined, a);
    expect(own.body).toEqual({ available: true, problem: null });
    expect((await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'Neon_Owl', about: 'new' }), updatedAt: 2 }, a)).status).toBe(200);
  });

  it('does not let an older edit from another phone overwrite a newer one', async () => {
    const token = await newPlayer();
    await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'Newer', about: 'second' }), updatedAt: 2000 }, token);
    const late = await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'Older', about: 'first' }), updatedAt: 1000 }, token);
    expect(late.body.applied).toBe(false);
    expect(late.body.profile).toMatchObject({ nickname: 'Newer', about: 'second' });
  });

  it('rejects a malformed avatar', async () => {
    const token = await newPlayer();
    const res = await t.call('PUT', '/v1/me/profile', { profile: profile({ avatar: { face: {} } }), updatedAt: 1 }, token);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });
});

describe('privacy', () => {
  it('saves privacy settings', async () => {
    const token = await newPlayer();
    const next = { profileVisibility: 'friends', messages: 'nobody', friendRequests: 'nobody', showOnline: false };
    expect((await t.call('PUT', '/v1/me/privacy', next, token)).status).toBe(200);
    expect((await t.call('GET', '/v1/me', undefined, token)).body.me.privacy).toEqual(next);
    const bad = await t.call('PUT', '/v1/me/privacy', { ...next, messages: 'aliens' }, token);
    expect(bad.status).toBe(400);
  });
});
