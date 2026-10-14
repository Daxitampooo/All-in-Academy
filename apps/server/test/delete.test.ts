import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { guestSecret, profile, setup } from './helpers';

let t: Awaited<ReturnType<typeof setup>>;

beforeAll(async () => {
  t = await setup();
});
afterAll(async () => {
  await t.close();
});

async function rowsFor(userId: string): Promise<Record<string, number>> {
  const tables = ['users', 'identities', 'refresh_tokens', 'profiles', 'privacy_settings', 'sync_docs'];
  const out: Record<string, number> = {};
  for (const table of tables) {
    const column = table === 'users' ? 'id' : 'user_id';
    const res = await t.db.execute(sql.raw(`select count(*)::int as n from ${table} where ${column} = '${userId}'`));
    out[table] = (res.rows[0] as { n: number }).n;
  }
  return out;
}

describe('deleting an account in the app', () => {
  it('removes every row of the player and ends the sessions at once', async () => {
    const secret = guestSecret();
    const { body } = await t.call('POST', '/v1/auth/guest', { guestSecret: secret, ageConfirmed: true, locale: 'ru' });
    const token = body.tokens.accessToken;
    await t.call('POST', '/v1/me/identities/email', { email: 'bye@example.com', password: 'longpassword' }, token);
    await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'ByeBye' }), updatedAt: 1 }, token);
    await t.call('PUT', '/v1/sync', { deviceId: 'phone-aaaaaaaaaaaaaaaa', counters: { hands: 3 } }, token);
    expect(Object.values(await rowsFor(body.me.id)).every((n) => n > 0)).toBe(true);

    expect((await t.call('DELETE', '/v1/me', undefined, token)).status).toBe(204);
    expect(await rowsFor(body.me.id)).toEqual({
      users: 0,
      identities: 0,
      refresh_tokens: 0,
      profiles: 0,
      privacy_settings: 0,
      sync_docs: 0,
    });
    expect((await t.call('GET', '/v1/me', undefined, token)).status).toBe(401);
    expect((await t.call('POST', '/v1/auth/refresh', { refreshToken: body.tokens.refreshToken })).status).toBe(401);
    expect((await t.call('POST', '/v1/auth/login', { email: 'bye@example.com', password: 'longpassword' })).status).toBe(401);
    // The nickname is free again.
    const next = (await t.call('POST', '/v1/auth/guest', { guestSecret: secret, ageConfirmed: true, locale: 'ru' })).body;
    expect(next.me.id).not.toBe(body.me.id);
    expect((await t.call('PUT', '/v1/me/profile', { profile: profile({ nickname: 'ByeBye' }), updatedAt: 2 }, next.tokens.accessToken)).status).toBe(200);
  });
});

describe('deleting an account on the web page', () => {
  it('shows the page in the reader’s language', async () => {
    const ru = await t.app.inject({ method: 'GET', url: '/account/delete', headers: { 'accept-language': 'ru-RU,ru;q=0.9' } });
    expect(ru.statusCode).toBe(200);
    expect(ru.headers['content-type']).toContain('text/html');
    expect(ru.body).toContain('Удаление аккаунта PokerALL');
    const en = await t.app.inject({ method: 'GET', url: '/account/delete?lang=en', headers: { 'accept-language': 'ru' } });
    expect(en.body).toContain('Delete your PokerALL account');
    const js = await t.app.inject({ method: 'GET', url: '/account/delete.js' });
    expect(js.headers['content-type']).toContain('javascript');
  });

  it('deletes with email and password', async () => {
    await t.call('POST', '/v1/auth/register', { email: 'web@example.com', password: 'longpassword', ageConfirmed: true, locale: 'en' });
    expect((await t.call('POST', '/v1/account/delete', { email: 'web@example.com', password: 'wrong-one' })).status).toBe(401);
    expect((await t.call('POST', '/v1/account/delete', { email: 'WEB@example.com', password: 'longpassword' })).status).toBe(204);
    expect((await t.call('POST', '/v1/auth/login', { email: 'web@example.com', password: 'longpassword' })).status).toBe(401);
  });

  it('takes requests from people who can’t open the app', async () => {
    const res = await t.call('POST', '/v1/account/delete-request', { email: 'Lost@Phone.com', nickname: 'LostOne', locale: 'ru' });
    expect(res.status).toBe(202);
    const rows = await t.db.execute(sql`select email, nickname from deletion_requests`);
    expect(rows.rows).toContainEqual({ email: 'lost@phone.com', nickname: 'LostOne' });
  });
});

describe('health', () => {
  it('answers when the database is reachable', async () => {
    expect(await t.call('GET', '/health')).toEqual({ status: 200, body: { ok: true } });
    expect((await t.call('GET', '/nothing-here')).body.error.code).toBe('not_found');
  });
});
