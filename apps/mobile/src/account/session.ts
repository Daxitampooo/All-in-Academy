import type { Tokens } from '@pokerall/shared/client';

import { secureStorage } from './secure';

const SESSION_KEY = 'pokerall.session';

let cached: Tokens | null | undefined;

/** The saved session, read from secure storage once. */
export async function loadSession(): Promise<Tokens | null> {
  if (cached !== undefined) return cached;
  const raw = await secureStorage.get(SESSION_KEY);
  try {
    cached = raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveSession(tokens: Tokens | null): Promise<void> {
  cached = tokens;
  if (tokens) await secureStorage.set(SESSION_KEY, JSON.stringify(tokens));
  else await secureStorage.remove(SESSION_KEY);
}
