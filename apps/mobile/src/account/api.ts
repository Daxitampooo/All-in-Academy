import { isErrorCode, type ErrorCode, type Me, type Privacy, type Profile, type StoredProfile, type SyncPush, type SyncState, type Tokens } from '@pokerall/shared/client';

import { API_URL } from './config';
import { loadSession, saveSession } from './session';

/** What went wrong with a request: a server error code, no connection, or no server configured. */
export type AccountErrorCode = ErrorCode | 'network' | 'not_configured' | 'session_lost';

export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    readonly status = 0,
    readonly field?: string,
    readonly reason?: string,
  ) {
    super(code);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const TIMEOUT_MS = 15_000;

async function send<T>(method: Method, path: string, body?: unknown, accessToken?: string): Promise<T> {
  if (!API_URL) throw new AccountError('not_configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError('network');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204 || res.status === 202) return undefined as T;
  const json = (await res.json().catch(() => null)) as { error?: { code?: unknown; field?: string; reason?: string } } | null;
  if (!res.ok) {
    const e = json?.error;
    throw new AccountError(isErrorCode(e?.code) ? e.code : 'internal', res.status, e?.field, e?.reason);
  }
  return json as T;
}

/** Called when the server no longer accepts the session (signed out elsewhere, account deleted). */
let onSessionLost: () => void = () => {};
export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler;
}

let refreshing: Promise<Tokens> | null = null;

/** Gets a new token pair; one refresh at a time, so the token is never used twice. */
function refreshSession(): Promise<Tokens> {
  refreshing ??= (async () => {
    try {
      const session = await loadSession();
      if (!session) throw new AccountError('session_lost');
      const { tokens } = await send<{ tokens: Tokens }>('POST', '/v1/auth/refresh', { refreshToken: session.refreshToken });
      await saveSession(tokens);
      return tokens;
    } catch (error) {
      if (error instanceof AccountError && (error.status === 401 || error.code === 'session_lost')) {
        await saveSession(null);
        onSessionLost();
        throw new AccountError('session_lost', 401);
      }
      throw error;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** A request as the signed-in player; refreshes the access token when it is about to run out or has. */
async function authed<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const session = await loadSession();
  if (!session) throw new AccountError('session_lost', 401);
  let token = session.accessToken;
  if (session.accessExpiresAt - Date.now() < 30_000) token = (await refreshSession()).accessToken;
  try {
    return await send<T>(method, path, body, token);
  } catch (error) {
    if (error instanceof AccountError && (error.code === 'token_expired' || error.code === 'unauthorized')) {
      const next = await refreshSession();
      return send<T>(method, path, body, next.accessToken);
    }
    throw error;
  }
}

export type AuthResponse = { tokens: Tokens; me: Me };
type Locale = 'en' | 'ru';

export const api = {
  guest: (guestSecret: string, locale: Locale) =>
    send<AuthResponse>('POST', '/v1/auth/guest', { guestSecret, ageConfirmed: true, locale }),
  register: (email: string, password: string, locale: Locale) =>
    send<AuthResponse>('POST', '/v1/auth/register', { email, password, ageConfirmed: true, locale }),
  login: (email: string, password: string) => send<AuthResponse>('POST', '/v1/auth/login', { email, password }),
  logout: (refreshToken: string) => send<void>('POST', '/v1/auth/logout', { refreshToken }),
  me: () => authed<{ me: Me }>('GET', '/v1/me'),
  linkEmail: (email: string, password: string) => authed<{ me: Me }>('POST', '/v1/me/identities/email', { email, password }),
  putProfile: (profile: Profile, updatedAt: number) =>
    authed<{ profile: StoredProfile; applied: boolean }>('PUT', '/v1/me/profile', { profile, updatedAt }),
  checkNickname: (nickname: string) =>
    authed<{ available: boolean; problem: string | null }>('GET', `/v1/nicknames/check?nickname=${encodeURIComponent(nickname)}`),
  putPrivacy: (privacy: Privacy) => authed<{ privacy: Privacy }>('PUT', '/v1/me/privacy', privacy),
  sync: (push: SyncPush) => authed<{ state: SyncState }>('PUT', '/v1/sync', push),
  deleteAccount: () => authed<void>('DELETE', '/v1/me'),
};
