import { randomBytes } from 'node:crypto';

import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import pg from 'pg';

import { buildApp } from '../src/app';
import { createGoogleVerifier } from '../src/auth/google';
import { connect, type Db } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';

export const GOOGLE_CLIENT = 'test-client.apps.googleusercontent.com';

/** Signs Google-like ID tokens with a key the test server trusts. */
export async function fakeGoogle() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' };
  const verifier = createGoogleVerifier([GOOGLE_CLIENT], createLocalJWKSet({ keys: [jwk] }));
  const sign = (claims: { sub: string; email?: string; email_verified?: boolean; aud?: string; iss?: string }) =>
    new SignJWT({ email: claims.email, email_verified: claims.email_verified ?? true })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(claims.sub)
      .setIssuer(claims.iss ?? 'https://accounts.google.com')
      .setAudience(claims.aud ?? GOOGLE_CLIENT)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
  return { verifier, sign };
}

export type Reply = { status: number; body: any };

/**
 * A fresh database (created from TEST_DATABASE_URL, dropped at the end) and a server on it. Every request comes
 * from a new address unless one is given, so the per-address sign-in limits don't get in the way.
 */
export async function setup(options: { google?: boolean } = {}) {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl) {
    throw new Error('Server tests need Postgres: set TEST_DATABASE_URL (see apps/server/README.md).');
  }
  const name = `pokerall_test_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const { db, pool } = connect(url.toString());
  await runMigrations(db);

  const clock = { t: Date.UTC(2026, 9, 14, 12) };
  const google = await fakeGoogle();
  const { app } = await buildApp({
    db,
    jwtSecret: 'test-secret-that-is-long-enough-for-hs256',
    accessTtlSeconds: 900,
    refreshTtlDays: 30,
    google: options.google === false ? null : google.verifier,
    logLevel: 'silent',
    now: () => clock.t,
  });

  async function call(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: unknown,
    token?: string,
    remoteAddress = `10.${rand()}.${rand()}.${rand()}`,
  ): Promise<Reply> {
    const res = await app.inject({
      method,
      url,
      remoteAddress,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      ...(body === undefined ? {} : { payload: body as object }),
    });
    return { status: res.statusCode, body: res.body ? safeJson(res.body) : null };
  }

  async function close() {
    await app.close();
    await pool.end();
    const drop = new pg.Client({ connectionString: adminUrl });
    await drop.connect();
    await drop.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await drop.end();
  }

  return { app, db: db as Db, clock, google, call, close };
}

function rand() {
  return Math.floor(Math.random() * 250) + 1;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function guestSecret(): string {
  return randomBytes(32).toString('base64url');
}

export const AVATAR = {
  face: { hair: 'short', eyes: 'dots', brows: 'flat', mouth: 'smile' },
  background: 'plain',
  frame: 'ring',
  outline: 'cyan',
  badge: null,
};

export function profile(overrides: Record<string, unknown> = {}) {
  return {
    nickname: 'NeonFox',
    about: 'Играю тайтово',
    country: 'RU',
    favoriteHand: 'AKs',
    style: 'tag',
    avatar: AVATAR,
    title: null,
    showTitle: true,
    ...overrides,
  };
}
