import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GOOGLE_CLIENT, guestSecret, setup } from './helpers';

let t: Awaited<ReturnType<typeof setup>>;

beforeAll(async () => {
  t = await setup();
});
afterAll(async () => {
  await t?.close();
});

const register = (email: string, password = 'correct horse') =>
  t.call('POST', '/v1/auth/register', { email, password, ageConfirmed: true, locale: 'ru' });

describe('guest accounts', () => {
  it('creates an account for a new secret and signs in to it with the same secret', async () => {
    const secret = guestSecret();
    const first = await t.call('POST', '/v1/auth/guest', { guestSecret: secret, ageConfirmed: true, locale: 'en' });
    expect(first.status).toBe(201);
    expect(first.body.me.identities).toEqual([{ kind: 'guest' }]);
    expect(first.body.me.privacy.profileVisibility).toBe('everyone');
    const again = await t.call('POST', '/v1/auth/guest', { guestSecret: secret, ageConfirmed: true, locale: 'en' });
    expect(again.status).toBe(200);
    expect(again.body.me.id).toBe(first.body.me.id);
  });

  it('needs the 18+ confirmation', async () => {
    const res = await t.call('POST', '/v1/auth/guest', { guestSecret: guestSecret(), locale: 'en' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('age_required');
  });
});

describe('email and password', () => {
  it('registers, refuses the same email in another case and signs in', async () => {
    const reg = await register('Player@Example.com');
    expect(reg.status).toBe(201);
    expect(reg.body.me.identities).toEqual([{ kind: 'email', email: 'player@example.com' }]);
    const dup = await register('player@example.COM ');
    expect(dup.status).toBe(409);
    expect(dup.body.error).toEqual({ code: 'email_taken', field: 'email' });
    const login = await t.call('POST', '/v1/auth/login', { email: 'PLAYER@example.com', password: 'correct horse' });
    expect(login.status).toBe(200);
    expect(login.body.me.id).toBe(reg.body.me.id);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    await register('known@example.com');
    const wrong = await t.call('POST', '/v1/auth/login', { email: 'known@example.com', password: 'wrong password' });
    const unknown = await t.call('POST', '/v1/auth/login', { email: 'nobody@example.com', password: 'wrong password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe('invalid_credentials');
  });

  it('wants passwords of 8 characters or more', async () => {
    const res = await register('short@example.com', 'short');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'bad_request', field: 'password' });
  });

  it('limits sign-in attempts from one address', async () => {
    const address = '192.0.2.77';
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await t.call('POST', '/v1/auth/login', { email: 'x@example.com', password: 'whatever1' }, undefined, address);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('sessions', () => {
  it('expires access tokens and refreshes them', async () => {
    const { body } = await register('session@example.com');
    expect((await t.call('GET', '/v1/me')).status).toBe(401);
    expect((await t.call('GET', '/v1/me', undefined, body.tokens.accessToken)).status).toBe(200);
    t.clock.t += 16 * 60_000;
    const expired = await t.call('GET', '/v1/me', undefined, body.tokens.accessToken);
    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe('token_expired');
    const refreshed = await t.call('POST', '/v1/auth/refresh', { refreshToken: body.tokens.refreshToken });
    expect(refreshed.status).toBe(200);
    expect((await t.call('GET', '/v1/me', undefined, refreshed.body.tokens.accessToken)).status).toBe(200);
  });

  it('closes the session when a replaced refresh token comes back', async () => {
    const { body } = await register('leak@example.com');
    const r1 = body.tokens.refreshToken;
    const second = await t.call('POST', '/v1/auth/refresh', { refreshToken: r1 });
    const r2 = second.body.tokens.refreshToken;
    // A quick repeat (bad connection) is refused but doesn't close the session.
    expect((await t.call('POST', '/v1/auth/refresh', { refreshToken: r1 })).status).toBe(401);
    const third = await t.call('POST', '/v1/auth/refresh', { refreshToken: r2 });
    expect(third.status).toBe(200);
    const r3 = third.body.tokens.refreshToken;
    // Much later the old token shows up again: someone copied it, so the whole session ends.
    t.clock.t += 5 * 60_000;
    expect((await t.call('POST', '/v1/auth/refresh', { refreshToken: r1 })).status).toBe(401);
    expect((await t.call('POST', '/v1/auth/refresh', { refreshToken: r3 })).status).toBe(401);
  });

  it('ends refresh tokens after 30 days and on sign-out', async () => {
    const a = (await register('old@example.com')).body;
    t.clock.t += 31 * 86_400_000;
    expect((await t.call('POST', '/v1/auth/refresh', { refreshToken: a.tokens.refreshToken })).status).toBe(401);
    const b = (await t.call('POST', '/v1/auth/login', { email: 'old@example.com', password: 'correct horse' })).body;
    expect((await t.call('POST', '/v1/auth/logout', { refreshToken: b.tokens.refreshToken })).status).toBe(204);
    expect((await t.call('POST', '/v1/auth/refresh', { refreshToken: b.tokens.refreshToken })).status).toBe(401);
  });
});

describe('linking', () => {
  it('turns a guest into an email account without changing the account', async () => {
    const guest = (await t.call('POST', '/v1/auth/guest', { guestSecret: guestSecret(), ageConfirmed: true, locale: 'ru' })).body;
    const token = guest.tokens.accessToken;
    const linked = await t.call('POST', '/v1/me/identities/email', { email: 'Guest@Example.com', password: 'longpassword' }, token);
    expect(linked.status).toBe(200);
    expect(linked.body.me.id).toBe(guest.me.id);
    expect(linked.body.me.identities).toEqual([{ kind: 'email', email: 'guest@example.com' }, { kind: 'guest' }]);
    const login = await t.call('POST', '/v1/auth/login', { email: 'guest@example.com', password: 'longpassword' });
    expect(login.body.me.id).toBe(guest.me.id);
    const again = await t.call('POST', '/v1/me/identities/email', { email: 'other@example.com', password: 'longpassword' }, token);
    expect(again.body.error.code).toBe('already_linked');
  });

  it('refuses an email that belongs to another account', async () => {
    await register('taken@example.com');
    const guest = (await t.call('POST', '/v1/auth/guest', { guestSecret: guestSecret(), ageConfirmed: true, locale: 'en' })).body;
    const res = await t.call('POST', '/v1/me/identities/email', { email: 'taken@example.com', password: 'longpassword' }, guest.tokens.accessToken);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('email_taken');
  });
});

describe('Google', () => {
  it('makes an account on the first sign-in and finds it on the next', async () => {
    const idToken = await t.google.sign({ sub: 'google-1', email: 'g@gmail.com' });
    const noAge = await t.call('POST', '/v1/auth/google', { idToken, locale: 'en' });
    expect(noAge.body.error.code).toBe('age_required');
    const first = await t.call('POST', '/v1/auth/google', { idToken, ageConfirmed: true, locale: 'en' });
    expect(first.status).toBe(201);
    expect(first.body.me.identities).toEqual([{ kind: 'google', email: 'g@gmail.com' }]);
    const second = await t.call('POST', '/v1/auth/google', { idToken, locale: 'en' });
    expect(second.status).toBe(200);
    expect(second.body.me.id).toBe(first.body.me.id);
  });

  it('refuses tokens for another app and keeps unconfirmed emails out', async () => {
    const foreign = await t.google.sign({ sub: 'google-2', aud: 'someone-else' });
    expect((await t.call('POST', '/v1/auth/google', { idToken: foreign, ageConfirmed: true, locale: 'en' })).body.error.code).toBe(
      'google_invalid',
    );
    const unverified = await t.google.sign({ sub: 'google-3', email: 'u@gmail.com', email_verified: false });
    const res = await t.call('POST', '/v1/auth/google', { idToken: unverified, ageConfirmed: true, locale: 'en' });
    expect(res.body.me.identities).toEqual([{ kind: 'google' }]);
    expect(GOOGLE_CLIENT).toContain('apps.googleusercontent.com');
  });

  it('does not join a Google sign-in to a password account with the same email', async () => {
    const pwd = (await register('same@gmail.com')).body;
    const idToken = await t.google.sign({ sub: 'google-4', email: 'same@gmail.com' });
    const res = await t.call('POST', '/v1/auth/google', { idToken, ageConfirmed: true, locale: 'en' });
    expect(res.status).toBe(201);
    expect(res.body.me.id).not.toBe(pwd.me.id);
  });

  it('links Google to a signed-in account once', async () => {
    const pwd = (await register('linker@example.com')).body;
    const idToken = await t.google.sign({ sub: 'google-5', email: 'linker@gmail.com' });
    const linked = await t.call('POST', '/v1/me/identities/google', { idToken }, pwd.tokens.accessToken);
    expect(linked.body.me.identities.map((i: { kind: string }) => i.kind)).toEqual(['email', 'google']);
    const viaGoogle = await t.call('POST', '/v1/auth/google', { idToken, locale: 'en' });
    expect(viaGoogle.body.me.id).toBe(pwd.me.id);
    const other = (await register('other-linker@example.com')).body;
    const res = await t.call('POST', '/v1/me/identities/google', { idToken }, other.tokens.accessToken);
    expect(res.body.error.code).toBe('identity_in_use');
  });
});

describe('Google turned off', () => {
  it('answers google_disabled when no client id is set', async () => {
    const off = await setup({ google: false });
    try {
      const res = await off.call('POST', '/v1/auth/google', { idToken: 'x'.repeat(40), ageConfirmed: true, locale: 'en' });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('google_disabled');
    } finally {
      await off.close();
    }
  });
});
