import * as Crypto from 'expo-crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Random bytes as base64url text (no padding). */
function base64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let c = 0; c < chars; c++) out += ALPHABET[(n >> (18 - 6 * c)) & 63];
  }
  return out;
}

/** Key of a guest account: 32 random bytes from the system's secure generator. */
export function newGuestSecret(): string {
  return base64url(Crypto.getRandomBytes(32));
}

/** Id of this install, so progress counters from different phones add up instead of overwriting. */
export function newDeviceId(): string {
  return Crypto.randomUUID().replace(/-/g, '');
}
