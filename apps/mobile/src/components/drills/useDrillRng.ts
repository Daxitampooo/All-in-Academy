import { createSeededRng, type Rng } from '@pokerall/poker-engine';
import { getRandomBytes } from 'expo-crypto';
import { useState } from 'react';

/** A random source for one trainer session. */
export function useDrillRng(): Rng {
  const [rng] = useState(() => createSeededRng(getRandomBytes(32)));
  return rng;
}
