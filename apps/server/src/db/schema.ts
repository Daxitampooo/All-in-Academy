import type { Avatar, SyncDoc } from '@pokerall/shared';
import { bigint, boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Database tables for stage 7: accounts, sign-in methods, sessions, profile, privacy and synced progress.
 * Every table that belongs to a player is removed together with the player (ON DELETE CASCADE), so deleting an
 * account is one statement and can't leave data behind.
 *
 * After changing this file run `pnpm --filter @pokerall/server db:generate` to write a migration.
 */

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: createdAt(),
  /** When the player confirmed being 18 or older (on the first launch, before the account was made). */
  ageConfirmedAt: timestamp('age_confirmed_at', { withTimezone: true }).notNull(),
  locale: text('locale').notNull(),
});

/** Ways to sign in to an account: a guest secret, email and password, Google. One of each kind at most. */
export const identities = pgTable(
  'identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['guest', 'email', 'google'] }).notNull(),
    /** guest: SHA-256 of the secret; email: the address in lower case; google: Google's account id. */
    subject: text('subject').notNull(),
    /** Shown in the app for email and Google sign-in. */
    email: text('email'),
    passwordHash: text('password_hash'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('identities_kind_subject').on(t.kind, t.subject),
    uniqueIndex('identities_user_kind').on(t.userId, t.kind),
  ],
);

/**
 * Refresh tokens, stored as SHA-256 hashes. Each sign-in starts a family; every refresh replaces the token
 * with a new one in the same family. A replaced token used again means it leaked, and the family is closed.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash').on(t.tokenHash),
    index('refresh_tokens_family').on(t.familyId),
    index('refresh_tokens_user').on(t.userId),
    index('refresh_tokens_expires').on(t.expiresAt),
  ],
);

export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    nickname: text('nickname'),
    /** The nickname in the form used for uniqueness (see nicknameKey in @pokerall/moderation). */
    nicknameKey: text('nickname_key'),
    about: text('about').notNull().default(''),
    country: text('country'),
    favoriteHand: text('favorite_hand'),
    style: text('style'),
    avatar: jsonb('avatar').$type<Avatar>().notNull(),
    title: text('title'),
    showTitle: boolean('show_title').notNull().default(true),
    /** Time of the edit on the phone, ms since 1970; the later edit wins between devices. */
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (t) => [uniqueIndex('profiles_nickname_key').on(t.nicknameKey)],
);

export const privacySettings = pgTable('privacy_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileVisibility: text('profile_visibility', { enum: ['everyone', 'friends', 'nobody'] }).notNull(),
  messages: text('messages', { enum: ['everyone', 'friends', 'nobody'] }).notNull(),
  friendRequests: text('friend_requests', { enum: ['everyone', 'nobody'] }).notNull(),
  showOnline: boolean('show_online').notNull(),
});

/** Synced progress: one document per player, merged by the rules in @pokerall/shared. */
export const syncDocs = pgTable('sync_docs', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  doc: jsonb('doc').$type<SyncDoc>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Deletion requests sent from the web page by people who can't open the app (lost phone, Google sign-in).
 * Not linked to an account: the team checks the request and deletes the account by hand.
 */
export const deletionRequests = pgTable('deletion_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  nickname: text('nickname'),
  message: text('message'),
  locale: text('locale').notNull(),
  createdAt: createdAt(),
  handledAt: timestamp('handled_at', { withTimezone: true }),
});
