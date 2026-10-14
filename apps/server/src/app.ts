import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { eq, sql } from 'drizzle-orm';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';

import type { GoogleVerifier } from './auth/google';
import { TokenService } from './auth/tokens';
import type { AppContext } from './context';
import type { Db } from './db/client';
import { users } from './db/schema';
import { ApiError, unauthorized } from './http/errors';
import { accountWebRoutes } from './routes/account-web';
import { authRoutes } from './routes/auth';
import { meRoutes } from './routes/me';
import { syncRoutes } from './routes/sync';

export type AppOptions = {
  db: Db;
  jwtSecret: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  google: GoogleVerifier | null;
  trustProxy?: boolean;
  logLevel?: string;
  /** Clock in ms; tests move it forward to expire tokens. */
  now?: () => number;
};

/** Requests bigger than this are refused; a full progress sync is a few kilobytes. */
const BODY_LIMIT = 256 * 1024;

export async function buildApp(options: AppOptions): Promise<{ app: FastifyInstance; ctx: AppContext }> {
  const now = options.now ?? Date.now;
  const app = Fastify({
    bodyLimit: BODY_LIMIT,
    trustProxy: options.trustProxy ?? false,
    logger: {
      level: options.logLevel ?? 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  });
  app.decorateRequest('userId', '');

  const tokens = new TokenService(options.db, {
    secret: options.jwtSecret,
    accessTtlSeconds: options.accessTtlSeconds,
    refreshTtlDays: options.refreshTtlDays,
    now,
  });

  const ctx: AppContext = {
    db: options.db,
    tokens,
    google: options.google,
    now,
    requireUser: async (req) => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw unauthorized();
      const userId = await tokens.verifyAccess(header.slice(7));
      // A deleted account's token stays valid for a few minutes; this check makes it useless at once.
      const [user] = await options.db.select({ id: users.id }).from(users).where(eq(users.id, userId));
      if (!user) throw unauthorized();
      req.userId = userId;
    },
  };

  await app.register(helmet);
  // The app sends tokens in a header, never cookies, so any origin may call the API.
  await app.register(cors, { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ statusCode: 429, code: 'rate_limited', message: 'rate limited' }),
  });

  app.setErrorHandler((error: FastifyError | ApiError, req, reply) => {
    if (error instanceof ApiError) return reply.status(error.status).send(error.body());
    const status = error.statusCode ?? 500;
    if (status === 429) return reply.status(429).send({ error: { code: 'rate_limited' } });
    if (status === 413) return reply.status(413).send({ error: { code: 'payload_too_large' } });
    if (status >= 400 && status < 500) return reply.status(status).send({ error: { code: 'bad_request' } });
    req.log.error(error);
    return reply.status(500).send({ error: { code: 'internal' } });
  });
  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: { code: 'not_found' } }));

  app.get('/health', { config: { rateLimit: false } }, async () => {
    await options.db.execute(sql`select 1`);
    return { ok: true };
  });

  authRoutes(app, ctx);
  meRoutes(app, ctx);
  syncRoutes(app, ctx);
  accountWebRoutes(app, ctx);

  return { app, ctx };
}
