import { checkAbout, checkNickname, nicknameKey } from '@pokerall/moderation';
import { PrivacySchema, ProfileSchema, type StoredProfile } from '@pokerall/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { loadMe, profileFromRow } from '../accounts/me';
import type { AppContext } from '../context';
import { privacySettings, profiles, users } from '../db/schema';
import { ApiError } from '../http/errors';
import { isUniqueViolation, parse } from '../http/validate';

const ProfileUpdateSchema = z.object({
  profile: ProfileSchema,
  /** When the player saved this on the phone, ms since 1970. */
  updatedAt: z.number().int().min(0),
});

const NicknameQuerySchema = z.object({ nickname: z.string().max(64) });

export function meRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { db } = ctx;
  const auth = { preHandler: ctx.requireUser };

  app.get('/v1/me', auth, async (req) => {
    const me = await loadMe(db, req.userId);
    if (!me) throw new ApiError(404, 'not_found');
    return { me };
  });

  /** Is a nickname allowed and free? For the profile editor, before saving. */
  app.get('/v1/nicknames/check', auth, async (req) => {
    const { nickname } = parse(NicknameQuerySchema, req.query);
    const problem = checkNickname(nickname);
    if (problem) return { available: false, problem };
    const [owner] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.nicknameKey, nicknameKey(nickname)));
    const taken = !!owner && owner.userId !== req.userId;
    return { available: !taken, problem: taken ? 'taken' : null };
  });

  /**
   * Saves the profile. The same text checks as on the phone run again here, and the nickname must be free.
   * An edit older than the saved one (made on another phone before the last sync) is not applied; the answer
   * then carries the newer profile.
   */
  app.put('/v1/me/profile', auth, async (req) => {
    const { profile, updatedAt } = parse(ProfileUpdateSchema, req.body);
    const nickname = profile.nickname?.trim() || null;
    if (nickname) {
      const problem = checkNickname(nickname);
      if (problem) throw new ApiError(400, 'nickname_invalid', { field: 'nickname', reason: problem });
    }
    const aboutProblem = checkAbout(profile.about);
    if (aboutProblem) throw new ApiError(400, 'about_invalid', { field: 'about', reason: aboutProblem });

    const [current] = await db.select().from(profiles).where(eq(profiles.userId, req.userId));
    if (current && current.updatedAt > updatedAt) return { profile: profileFromRow(current), applied: false };

    const row = {
      ...profile,
      nickname,
      nicknameKey: nickname ? nicknameKey(nickname) : null,
      about: profile.about.trim(),
      updatedAt,
    };
    try {
      const [saved] = await db
        .insert(profiles)
        .values({ userId: req.userId, ...row })
        .onConflictDoUpdate({ target: profiles.userId, set: row })
        .returning();
      const result: StoredProfile = profileFromRow(saved!);
      return { profile: result, applied: true };
    } catch (error) {
      if (isUniqueViolation(error, 'profiles_nickname_key')) {
        throw new ApiError(409, 'nickname_taken', { field: 'nickname' });
      }
      throw error;
    }
  });

  app.put('/v1/me/privacy', auth, async (req) => {
    const privacy = parse(PrivacySchema, req.body);
    await db
      .insert(privacySettings)
      .values({ userId: req.userId, ...privacy })
      .onConflictDoUpdate({ target: privacySettings.userId, set: privacy });
    return { privacy };
  });

  /**
   * Deletes the account and everything stored with it: sign-in methods, sessions, profile, privacy settings
   * and progress (the tables cascade from users).
   */
  app.delete('/v1/me', auth, async (req, reply) => {
    await db.delete(users).where(eq(users.id, req.userId));
    req.log.info({ event: 'account_deleted', source: 'app' }, 'account deleted');
    return reply.status(204).send();
  });
}
