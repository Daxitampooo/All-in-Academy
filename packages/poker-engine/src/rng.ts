import type { Card } from './cards';

/** Source of random integers. Implementations must be uniform. */
export interface Rng {
  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

/**
 * ChaCha20 block function (RFC 8439, section 2.3).
 * `key` is 8 words, `nonce` 3 words; returns 16 words of keystream.
 */
export function chacha20Block(key: Uint32Array, counter: number, nonce: Uint32Array): Uint32Array {
  const state = new Uint32Array(16);
  state[0] = 0x61707865;
  state[1] = 0x3320646e;
  state[2] = 0x79622d32;
  state[3] = 0x6b206574;
  state.set(key, 4);
  state[12] = counter >>> 0;
  state.set(nonce, 13);

  const x = new Uint32Array(state);
  const rotl = (v: number, n: number) => ((v << n) | (v >>> (32 - n))) >>> 0;
  const qr = (a: number, b: number, c: number, d: number) => {
    x[a] = (x[a]! + x[b]!) >>> 0;
    x[d] = rotl(x[d]! ^ x[a]!, 16);
    x[c] = (x[c]! + x[d]!) >>> 0;
    x[b] = rotl(x[b]! ^ x[c]!, 12);
    x[a] = (x[a]! + x[b]!) >>> 0;
    x[d] = rotl(x[d]! ^ x[a]!, 8);
    x[c] = (x[c]! + x[d]!) >>> 0;
    x[b] = rotl(x[b]! ^ x[c]!, 7);
  };
  for (let i = 0; i < 10; i++) {
    qr(0, 4, 8, 12);
    qr(1, 5, 9, 13);
    qr(2, 6, 10, 14);
    qr(3, 7, 11, 15);
    qr(0, 5, 10, 15);
    qr(1, 6, 11, 12);
    qr(2, 7, 8, 13);
    qr(3, 4, 9, 14);
  }
  for (let i = 0; i < 16; i++) x[i] = (x[i]! + state[i]!) >>> 0;
  return x;
}

/**
 * Deterministic, cryptographic-quality RNG: the ChaCha20 keystream for a
 * 32-byte seed. The same seed always gives the same deck, which makes hands
 * replayable and lets the server publish a hash of the seed before dealing.
 */
export function createSeededRng(seed: Uint8Array): Rng {
  if (seed.length !== 32) throw new Error('Seed must be 32 bytes');
  const key = new Uint32Array(8);
  for (let i = 0; i < 8; i++) {
    key[i] =
      (seed[i * 4]! | (seed[i * 4 + 1]! << 8) | (seed[i * 4 + 2]! << 16) | (seed[i * 4 + 3]! << 24)) >>> 0;
  }
  const nonce = new Uint32Array(3);
  let counter = 0;
  let block = new Uint32Array(0);
  let pos = 0;

  const nextUint32 = () => {
    if (pos >= block.length) {
      block = chacha20Block(key, counter++, nonce);
      pos = 0;
    }
    return block[pos++]!;
  };

  return {
    nextInt(maxExclusive: number) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 2 ** 32) {
        throw new Error(`Bad range ${maxExclusive}`);
      }
      // Rejection sampling removes modulo bias.
      const limit = 2 ** 32 - (2 ** 32 % maxExclusive);
      for (;;) {
        const v = nextUint32();
        if (v < limit) return v % maxExclusive;
      }
    },
  };
}

/** Parses a 64-character hex seed. */
export function seedFromHex(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('Seed must be 64 hex characters');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function seedToHex(seed: Uint8Array): string {
  return Array.from(seed, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** A shuffled 52-card deck. */
export function shuffledDeck(rng: Rng): Card[] {
  return shuffle(
    Array.from({ length: 52 }, (_, i) => i),
    rng,
  );
}
