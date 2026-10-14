import { DEFAULT_PRIVACY, type Me, type Privacy, type StoredProfile } from '@pokerall/shared';
import { eq } from 'drizzle-orm';

import type { Db } from '../db/client';
import { identities, privacySettings, profiles, users } from '../db/schema';

type ProfileRow = typeof profiles.$inferSelect;

export function profileFromRow(row: ProfileRow): StoredProfile {
  return {
    nickname: row.nickname,
    about: row.about,
    country: row.country,
    favoriteHand: row.favoriteHand,
    style: row.style as StoredProfile['style'],
    avatar: row.avatar,
    title: row.title,
    showTitle: row.showTitle,
    updatedAt: row.updatedAt,
  };
}

export async function loadPrivacy(db: Db, userId: string): Promise<Privacy> {
  const [row] = await db.select().from(privacySettings).where(eq(privacySettings.userId, userId));
  if (!row) return DEFAULT_PRIVACY;
  return {
    profileVisibility: row.profileVisibility,
    messages: row.messages,
    friendRequests: row.friendRequests,
    showOnline: row.showOnline,
  };
}

/** The account as the app sees it, or null when it no longer exists. */
export async function loadMe(db: Db, userId: string): Promise<Me | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const ids = await db
    .select({ kind: identities.kind, email: identities.email })
    .from(identities)
    .where(eq(identities.userId, userId));
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const order = { email: 0, google: 1, guest: 2 } as const;
  return {
    id: user.id,
    createdAt: user.createdAt.getTime(),
    identities: ids
      .sort((a, b) => order[a.kind] - order[b.kind])
      .map((i) => (i.email ? { kind: i.kind, email: i.email } : { kind: i.kind })),
    profile: profile ? profileFromRow(profile) : null,
    privacy: await loadPrivacy(db, userId),
  };
}
