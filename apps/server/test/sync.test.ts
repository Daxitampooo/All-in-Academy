import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { guestSecret, setup } from './helpers';

let t: Awaited<ReturnType<typeof setup>>;

beforeAll(async () => {
  t = await setup();
});
afterAll(async () => {
  await t?.close();
});

const PHONE = 'phone-aaaaaaaaaaaaaaaa';
const TABLET = 'tablet-bbbbbbbbbbbbbbbb';

async function newPlayer() {
  const res = await t.call('POST', '/v1/auth/guest', { guestSecret: guestSecret(), ageConfirmed: true, locale: 'ru' });
  return res.body.tokens.accessToken as string;
}

describe('sync', () => {
  it('merges progress from two devices', async () => {
    const token = await newPlayer();
    const empty = await t.call('GET', `/v1/sync?deviceId=${PHONE}`, undefined, token);
    expect(empty.body.state).toEqual({ counters: { own: {}, others: {} }, maxima: {}, achievements: {}, academy: {}, looks: null });

    await t.call(
      'PUT',
      '/v1/sync',
      {
        deviceId: PHONE,
        counters: { hands: 120, 'bot.lena.beaten': 1 },
        maxima: { preflopBestStreak: 12 },
        achievements: { 'first-blood': 500 },
        academy: { 'basics-hands': { passed: true, best: 1, at: 600 } },
        looks: { selected: { felt: 'violet' }, fourColor: true, updatedAt: 700 },
      },
      token,
    );
    const tablet = await t.call(
      'PUT',
      '/v1/sync',
      { deviceId: TABLET, counters: { hands: 30 }, achievements: { 'first-blood': 900, 'warm-up': 950 } },
      token,
    );
    expect(tablet.status).toBe(200);
    expect(tablet.body.state.counters).toEqual({ own: { hands: 30 }, others: { hands: 120, 'bot.lena.beaten': 1 } });
    expect(tablet.body.state.achievements).toEqual({ 'first-blood': 500, 'warm-up': 950 });
    expect(tablet.body.state.academy['basics-hands'].passed).toBe(true);
    expect(tablet.body.state.looks.selected.felt).toBe('violet');

    const phone = await t.call('GET', `/v1/sync?deviceId=${PHONE}`, undefined, token);
    expect(phone.body.state.counters).toEqual({ own: { hands: 120, 'bot.lena.beaten': 1 }, others: { hands: 30 } });
  });

  it('keeps both devices when they sync for the first time at the same moment', async () => {
    const token = await newPlayer();
    await Promise.all([
      t.call('PUT', '/v1/sync', { deviceId: PHONE, counters: { hands: 7 } }, token),
      t.call('PUT', '/v1/sync', { deviceId: TABLET, counters: { hands: 5 } }, token),
    ]);
    const res = await t.call('GET', `/v1/sync?deviceId=${PHONE}`, undefined, token);
    expect(res.body.state.counters).toEqual({ own: { hands: 7 }, others: { hands: 5 } });
  });

  it('refuses junk and oversized progress', async () => {
    const token = await newPlayer();
    expect((await t.call('PUT', '/v1/sync', { deviceId: PHONE, counters: { hands: 'many' } }, token)).status).toBe(400);
    expect((await t.call('PUT', '/v1/sync', { deviceId: 'x', counters: {} }, token)).status).toBe(400);
    expect((await t.call('PUT', '/v1/sync', { deviceId: PHONE }, undefined)).status).toBe(401);
    for (let round = 0; round < 2; round++) {
      const batch = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`a${round}-${i}`, 1]));
      expect((await t.call('PUT', '/v1/sync', { deviceId: PHONE, achievements: batch }, token)).status).toBe(200);
    }
    const over = await t.call('PUT', '/v1/sync', { deviceId: PHONE, achievements: { extra: 1 } }, token);
    expect(over.status).toBe(413);
    expect(over.body.error).toEqual({ code: 'payload_too_large', field: 'achievements' });
  });
});
