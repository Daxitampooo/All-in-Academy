import { DeviceIdSchema, SyncLimitError, SyncPushSchema, applySync, emptySyncDoc, syncView } from '@pokerall/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { AppContext } from '../context';
import { syncDocs } from '../db/schema';
import { ApiError } from '../http/errors';
import { parse } from '../http/validate';

const SyncQuerySchema = z.object({ deviceId: DeviceIdSchema });

export function syncRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db } = ctx;
  const auth = { preHandler: ctx.requireUser };

  app.get('/v1/sync', auth, async (req) => {
    const { deviceId } = parse(SyncQuerySchema, req.query);
    const [row] = await db.select({ doc: syncDocs.doc }).from(syncDocs).where(eq(syncDocs.userId, req.userId));
    return { state: syncView(row?.doc ?? emptySyncDoc(), deviceId) };
  });

  /** Merges this phone's progress into the account and answers with the merged result. */
  app.put('/v1/sync', auth, async (req) => {
    const push = parse(SyncPushSchema, req.body);
    const doc = await db.transaction(async (tx) => {
      // Make sure the row exists, then lock it: two phones syncing at the same moment wait for each other
      // instead of overwriting each other's progress.
      await tx.insert(syncDocs).values({ userId: req.userId, doc: emptySyncDoc() }).onConflictDoNothing();
      const [row] = await tx
        .select({ doc: syncDocs.doc })
        .from(syncDocs)
        .where(eq(syncDocs.userId, req.userId))
        .for('update');
      let next;
      try {
        next = applySync(row?.doc ?? emptySyncDoc(), push, ctx.now());
      } catch (error) {
        if (error instanceof SyncLimitError) throw new ApiError(413, 'payload_too_large', { field: error.section });
        throw error;
      }
      await tx
        .update(syncDocs)
        .set({ doc: next, updatedAt: new Date(ctx.now()) })
        .where(eq(syncDocs.userId, req.userId));
      return next;
    });
    return { state: syncView(doc, push.deviceId) };
  });
}
