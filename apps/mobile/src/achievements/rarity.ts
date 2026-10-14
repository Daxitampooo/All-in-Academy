import type { ColorKey } from '@/theme/tokens';

import type { Rarity } from './catalog';

export const RARITY_COLOR: Record<Rarity, ColorKey> = {
  common: 'cyan',
  rare: 'lime',
  epic: 'magenta',
  legendary: 'amber',
};
