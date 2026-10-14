import type { FastifyReply, FastifyRequest } from 'fastify';

import type { GoogleVerifier } from './auth/google';
import type { TokenService } from './auth/tokens';
import type { Db } from './db/client';

/** What the routes share: the database, sessions, Google checks and the clock (replaceable in tests). */
export type AppContext = {
  db: Db;
  tokens: TokenService;
  google: GoogleVerifier | null;
  now: () => number;
  /** preHandler for routes that need a signed-in player; sets request.userId. */
  requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
};

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by requireUser. */
    userId: string;
  }
}
