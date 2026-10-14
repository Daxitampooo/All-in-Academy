/**
 * The part of this package the mobile app uses: merge rules, error codes and types, without zod (the app
 * doesn't validate requests, the server does).
 */
export * from './errors';
export * from './merge';
export type { IdentityKind, Locale, Tokens } from './auth';
export type { Avatar, Me, Privacy, Profile, StoredProfile } from './profile';
export { DEFAULT_PRIVACY } from './profile-defaults';
