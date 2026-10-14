import type { Privacy } from './profile';

/** Privacy of a new account: open profile, messages only from friends. */
export const DEFAULT_PRIVACY: Privacy = {
  profileVisibility: 'everyone',
  messages: 'friends',
  friendRequests: 'everyone',
  showOnline: true,
};
