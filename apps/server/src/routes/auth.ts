import {
  DEFAULT_PRIVACY,
  EmailLoginSchema,
  EmailRegisterSchema,
  GoogleLoginSchema,
  GuestCreateSchema,
  LinkEmailSchema,
  LinkGoogleSchema,
  RefreshSchema,
  type Locale,
  type Me,
  type Tokens,
} from '@pokerall/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { loadMe } from '../accounts/me';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../auth/passwords';
import { sha256 } from '../auth/tokens';
import type { AppContext } from '../context';
import type { Db } from '../db/client';
import { identities, privacySettings, users } from '../db/schema';
import { ApiError } from '../http/errors';
import { isUniqueViolation, parse } from '../http/validate';

type IdentityInsert = typeof identities.$inferInsert;

/** Sign-in answers: a fresh session and the account. */
export type AuthResponse = { tokens: Tokens; me: Me };

/** Per-address limits for sign-in routes, against password guessing. */
const STRICT = { rateLimit: { max: 10, timeWindow: '1 minute' } };
const NORMAL = { rateLimit: { max: 60, timeWindow: '1 minute' } };

async function createAccount(db: Db, locale: Locale, identity: Omit<IdentityInsert, 'userId'>, now: Date): Promise<string> {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ ageConfirmedAt: now, locale }).returning({ id: users.id });
    const userId = user!.id;
    await tx.insert(identities).values({ ...identity, userId });
    await tx.insert(privacySettings).values({ userId, ...DEFAULT_PRIVACY });
    return userId;
  });
}

export function authRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db, tokens } = ctx;

  async function signedIn(userId: string): Promise<AuthResponse> {
    const me = await loadMe(db, userId);
    if (!me) throw new ApiError(500, 'internal');
    return { tokens: await tokens.issue(userId), me };
  }

  async function findIdentity(kind: 'guest' | 'email' | 'google', subject: string) {
    const [row] = await db
      .select()
      .from(identities)
      .where(and(eq(identities.kind, kind), eq(identities.subject, subject)));
    return row ?? null;
  }

  /**
   * Guest sign-in: makes an account for a new secret or signs in to the account that already has it (so a retry
   * after a lost answer doesn't make a second account).
   */
  app.post('/v1/auth/guest', { config: STRICT }, async (req, reply) => {
    const body = parse(GuestCreateSchema, req.body);
    const subject = sha256(body.guestSecret);
    const existing = await findIdentity('guest', subject);
    if (existing) return signedIn(existing.userId);
    try {
      const userId = await createAccount(db, body.locale, { kind: 'guest', subject }, new Date(ctx.now()));
      return reply.status(201).send(await signedIn(userId));
    } catch (error) {
      if (!isUniqueViolation(error, 'identities_kind_subject')) throw error;
      const raced = await findIdentity('guest', subject);
      if (!raced) throw error;
      return signedIn(raced.userId);
    }
  });

  app.post('/v1/auth/register', { config: STRICT }, async (req, reply) => {
    const body = parse(EmailRegisterSchema, req.body);
    if (await findIdentity('email', body.email)) throw new ApiError(409, 'email_taken', { field: 'email' });
    const passwordHash = await hashPassword(body.password);
    try {
      const userId = await createAccount(
        db,
        body.locale,
        { kind: 'email', subject: body.email, email: body.email, passwordHash },
        new Date(ctx.now()),
      );
      return reply.status(201).send(await signedIn(userId));
    } catch (error) {
      if (isUniqueViolation(error, 'identities_kind_subject')) throw new ApiError(409, 'email_taken', { field: 'email' });
      throw error;
    }
  });

  app.post('/v1/auth/login', { config: STRICT }, async (req) => {
    const body = parse(EmailLoginSchema, req.body);
    const identity = await findIdentity('email', body.email);
    if (!identity?.passwordHash) {
      await burnPasswordCheck(body.password);
      throw new ApiError(401, 'invalid_credentials');
    }
    if (!(await verifyPassword(identity.passwordHash, body.password))) throw new ApiError(401, 'invalid_credentials');
    return signedIn(identity.userId);
  });

  /**
   * Google sign-in. A Google account new to PokerALL gets a new account, even if the same email is used with a
   * password elsewhere: emails are not confirmed, so joining them automatically would let anyone who registered
   * someone else's address take over that person's account later. Accounts are joined only from inside a
   * signed-in account (link routes below).
   */
  app.post('/v1/auth/google', { config: STRICT }, async (req, reply) => {
    const body = parse(GoogleLoginSchema, req.body);
    if (!ctx.google) throw new ApiError(503, 'google_disabled');
    const account = await ctx.google(body.idToken);
    const existing = await findIdentity('google', account.sub);
    if (existing) return signedIn(existing.userId);
    if (!body.ageConfirmed) throw new ApiError(400, 'age_required', { field: 'ageConfirmed' });
    try {
      const userId = await createAccount(
        db,
        body.locale,
        { kind: 'google', subject: account.sub, email: account.email },
        new Date(ctx.now()),
      );
      return reply.status(201).send(await signedIn(userId));
    } catch (error) {
      if (!isUniqueViolation(error, 'identities_kind_subject')) throw error;
      const raced = await findIdentity('google', account.sub);
      if (!raced) throw error;
      return signedIn(raced.userId);
    }
  });

  app.post('/v1/auth/refresh', { config: NORMAL }, async (req) => {
    const body = parse(RefreshSchema, req.body);
    const { tokens: next } = await tokens.rotate(body.refreshToken);
    return { tokens: next };
  });

  app.post('/v1/auth/logout', { config: NORMAL }, async (req, reply) => {
    const body = parse(RefreshSchema, req.body);
    await tokens.revoke(body.refreshToken);
    return reply.status(204).send();
  });

  async function hasKind(userId: string, kind: 'email' | 'google'): Promise<boolean> {
    const [row] = await db
      .select({ id: identities.id })
      .from(identities)
      .where(and(eq(identities.userId, userId), eq(identities.kind, kind)));
    return !!row;
  }

  /** Adds email and password to the signed-in account; a guest keeps all progress. */
  app.post('/v1/me/identities/email', { config: STRICT, preHandler: ctx.requireUser }, async (req) => {
    const body = parse(LinkEmailSchema, req.body);
    if (await hasKind(req.userId, 'email')) throw new ApiError(409, 'already_linked');
    if (await findIdentity('email', body.email)) throw new ApiError(409, 'email_taken', { field: 'email' });
    const passwordHash = await hashPassword(body.password);
    try {
      await db
        .insert(identities)
        .values({ userId: req.userId, kind: 'email', subject: body.email, email: body.email, passwordHash });
    } catch (error) {
      if (isUniqueViolation(error, 'identities_kind_subject')) throw new ApiError(409, 'email_taken', { field: 'email' });
      if (isUniqueViolation(error, 'identities_user_kind')) throw new ApiError(409, 'already_linked');
      throw error;
    }
    return { me: await loadMe(db, req.userId) };
  });

  app.post('/v1/me/identities/google', { config: STRICT, preHandler: ctx.requireUser }, async (req) => {
    const body = parse(LinkGoogleSchema, req.body);
    if (!ctx.google) throw new ApiError(503, 'google_disabled');
    const account = await ctx.google(body.idToken);
    if (await hasKind(req.userId, 'google')) throw new ApiError(409, 'already_linked');
    if (await findIdentity('google', account.sub)) throw new ApiError(409, 'identity_in_use');
    try {
      await db
        .insert(identities)
        .values({ userId: req.userId, kind: 'google', subject: account.sub, email: account.email });
    } catch (error) {
      if (isUniqueViolation(error, 'identities_kind_subject')) throw new ApiError(409, 'identity_in_use');
      if (isUniqueViolation(error, 'identities_user_kind')) throw new ApiError(409, 'already_linked');
      throw error;
    }
    return { me: await loadMe(db, req.userId) };
  });
}
