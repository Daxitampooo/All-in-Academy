import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type { Tokens } from '@pokerall/shared';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';

import type { Db } from '../db/client';
import { refreshTokens } from '../db/schema';
import { ApiError, unauthorized } from '../http/errors';

const AUDIENCE = 'pokerall-app';
/**
 * A refresh token replaced less than this long ago is answered with "unauthorized" without closing its family:
 * the app may have sent the same refresh twice over a bad connection.
 */
const REUSE_GRACE_MS = 30_000;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export type TokenSettings = {
  secret: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  now: () => number;
};

/**
 * Sessions: a short access token (JWT, 15 minutes) sent with every request, and a long refresh token
 * (30 days) that gets a new pair. The refresh token changes on every use.
 */
export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    private readonly db: Db,
    private readonly settings: TokenSettings,
  ) {
    this.key = new TextEncoder().encode(settings.secret);
  }

  /** Starts a new session (a new refresh token family) or continues one. */
  async issue(userId: string, familyId: string = randomUUID()): Promise<Tokens> {
    const now = this.settings.now();
    const exp = Math.floor(now / 1000) + this.settings.accessTtlSeconds;
    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setAudience(AUDIENCE)
      .setIssuedAt(Math.floor(now / 1000))
      .setExpirationTime(exp)
      .sign(this.key);
    const refreshToken = randomBytes(32).toString('base64url');
    await this.db.insert(refreshTokens).values({
      userId,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(now + this.settings.refreshTtlDays * 86_400_000),
    });
    return { accessToken, accessExpiresAt: exp * 1000, refreshToken };
  }

  /** The user id from an access token; 401 "token_expired" lets the app refresh and retry. */
  async verifyAccess(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        audience: AUDIENCE,
        algorithms: ['HS256'],
        currentDate: new Date(this.settings.now()),
      });
      if (typeof payload.sub !== 'string') throw unauthorized();
      return payload.sub;
    } catch (error) {
      if (error instanceof joseErrors.JWTExpired) throw new ApiError(401, 'token_expired');
      throw unauthorized();
    }
  }

  /** Swaps a refresh token for a new pair. A replaced token used again closes the whole session. */
  async rotate(refreshToken: string): Promise<{ userId: string; tokens: Tokens }> {
    const now = new Date(this.settings.now());
    const hash = sha256(refreshToken);
    const [claimed] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)))
      .returning();
    if (claimed) {
      if (claimed.expiresAt <= now) throw unauthorized();
      return { userId: claimed.userId, tokens: await this.issue(claimed.userId, claimed.familyId) };
    }
    const [known] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
    if (known?.revokedAt && now.getTime() - known.revokedAt.getTime() > REUSE_GRACE_MS) {
      await this.revokeFamily(known.familyId);
    }
    throw unauthorized();
  }

  /** Signs out the session the token belongs to. Unknown tokens are ignored. */
  async revoke(refreshToken: string): Promise<void> {
    const [known] = await this.db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, sha256(refreshToken)));
    if (known) await this.revokeFamily(known.familyId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(this.settings.now()) })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }

  /**
   * Removes expired tokens; run from time to time. Replaced tokens stay until they expire, so a leaked one is
   * still recognized when it comes back.
   */
  async prune(): Promise<void> {
    await this.db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date(this.settings.now() - 86_400_000)));
  }
}
