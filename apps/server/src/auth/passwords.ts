import argon2 from 'argon2';

/**
 * argon2id with the OWASP minimum settings (19 MiB, 2 passes): strong enough for passwords and light enough for
 * a small server that has to answer several sign-ins at once.
 */
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | null = null;

/**
 * Spends the same time as checking a real password, so the answer time doesn't tell whether an email has an
 * account.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummy ??= hashPassword('not-a-real-password-just-for-timing');
  await verifyPassword(await dummy, password);
}
