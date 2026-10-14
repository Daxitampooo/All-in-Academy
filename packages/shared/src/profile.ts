import { z } from 'zod';

import type { IdentityKind } from './auth';

export const PLAY_STYLES = ['tag', 'lag', 'nit', 'station', 'maniac', 'balanced'] as const;

const PartId = z.string().regex(/^[A-Za-z0-9-]{1,32}$/);

/**
 * The avatar as the builder saves it. The server checks only the shape; the app falls back to the default part
 * when it meets an id it doesn't know (for example, after an update removed one).
 */
export const AvatarSchema = z.object({
  face: z
    .object({
      hair: PartId,
      hat: PartId.optional(),
      eyes: PartId,
      brows: PartId.optional(),
      mouth: PartId,
      beard: PartId.optional(),
      extra: PartId.optional(),
    })
    .strict(),
  background: PartId,
  frame: PartId,
  outline: PartId,
  badge: PartId.nullable(),
});

/** Starting hand in range notation: "AKs", "QJo", "77". */
export const HandClassSchema = z.string().regex(/^(?:([AKQJT2-9])\1|(?!([AKQJT2-9])\2)[AKQJT2-9]{2}[so])$/);

export const ProfileSchema = z.object({
  /** Checked against the nickname rules from @pokerall/moderation on the server. */
  nickname: z.string().trim().min(1).max(32).nullable(),
  about: z.string().max(400),
  /** ISO 3166-1 alpha-2. */
  country: z.string().regex(/^[A-Z]{2}$/).nullable(),
  favoriteHand: HandClassSchema.nullable(),
  style: z.enum(PLAY_STYLES).nullable(),
  avatar: AvatarSchema,
  /** Achievement whose title is shown under the nickname. */
  title: z.string().regex(/^[a-z0-9-]{1,40}$/).nullable(),
  showTitle: z.boolean(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Avatar = z.infer<typeof AvatarSchema>;

/** A saved profile with the time of its last change, ms since 1970. */
export type StoredProfile = Profile & { updatedAt: number };

export const PrivacySchema = z.object({
  /** Who can open the profile (nickname, avatar and rating are always visible at a table). */
  profileVisibility: z.enum(['everyone', 'friends', 'nobody']),
  /** Who can write private messages. */
  messages: z.enum(['everyone', 'friends', 'nobody']),
  /** Who can send friend requests. */
  friendRequests: z.enum(['everyone', 'nobody']),
  /** Friends see when the player is online. */
  showOnline: z.boolean(),
});

export type Privacy = z.infer<typeof PrivacySchema>;

export { DEFAULT_PRIVACY } from './profile-defaults';

/** The signed-in account as the app sees it. */
export type Me = {
  id: string;
  createdAt: number;
  identities: { kind: IdentityKind; email?: string }[];
  /** Null until the player saves a profile from any device. */
  profile: StoredProfile | null;
  privacy: Privacy;
};
