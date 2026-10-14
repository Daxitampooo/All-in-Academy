import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

import { ApiError } from '../http/errors';

export type GoogleAccount = { sub: string; email: string | null };

/** Checks a Google ID token from the app and returns the Google account it belongs to. */
export type GoogleVerifier = (idToken: string) => Promise<GoogleAccount>;

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/**
 * Verifies ID tokens with Google's public keys (fetched once and cached by jose). The token must be issued for
 * one of our OAuth client ids. Returns null when no client id is set: Google sign-in is then off.
 */
export function createGoogleVerifier(clientIds: string[], keys?: JWTVerifyGetKey): GoogleVerifier | null {
  if (clientIds.length === 0) return null;
  const jwks = keys ?? createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  return async (idToken) => {
    try {
      const { payload } = await jwtVerify(idToken, jwks, { issuer: GOOGLE_ISSUERS, audience: clientIds });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('no subject');
      const verified = payload.email_verified === true || payload.email_verified === 'true';
      const email = verified && typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
      return { sub: payload.sub, email };
    } catch {
      throw new ApiError(401, 'google_invalid');
    }
  };
}
