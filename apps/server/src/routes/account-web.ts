import { DeleteRequestSchema, EmailLoginSchema } from '@pokerall/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { burnPasswordCheck, verifyPassword } from '../auth/passwords';
import type { AppContext } from '../context';
import { deletionRequests, identities, users } from '../db/schema';
import { ApiError } from '../http/errors';
import { parse } from '../http/validate';
import { DELETE_PAGE_SCRIPT, deletePage, pickLang } from '../web/delete-page';

/** Account deletion without the app: the page Google Play links to, and the two forms on it. */
export function accountWebRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db } = ctx;

  app.get('/account/delete', async (req, reply) => {
    const lang = pickLang(req.query, req.headers['accept-language']);
    return reply.type('text/html; charset=utf-8').header('cache-control', 'no-store').send(deletePage(lang));
  });

  app.get('/account/delete.js', async (_req, reply) => {
    return reply.type('text/javascript; charset=utf-8').header('cache-control', 'public, max-age=3600').send(DELETE_PAGE_SCRIPT);
  });

  app.post('/v1/account/delete', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = parse(EmailLoginSchema, req.body);
    const [identity] = await db
      .select()
      .from(identities)
      .where(and(eq(identities.kind, 'email'), eq(identities.subject, body.email)));
    if (!identity?.passwordHash) {
      await burnPasswordCheck(body.password);
      throw new ApiError(401, 'invalid_credentials');
    }
    if (!(await verifyPassword(identity.passwordHash, body.password))) throw new ApiError(401, 'invalid_credentials');
    await db.delete(users).where(eq(users.id, identity.userId));
    req.log.info({ event: 'account_deleted', source: 'web' }, 'account deleted');
    return reply.status(204).send();
  });

  app.post(
    '/v1/account/delete-request',
    { config: { rateLimit: { max: 3, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = parse(DeleteRequestSchema, req.body);
      await db.insert(deletionRequests).values({
        email: body.email,
        nickname: body.nickname || null,
        message: body.message || null,
        locale: body.locale,
      });
      return reply.status(202).send();
    },
  );
}
