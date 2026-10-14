import { rangeById } from '@pokerall/content';
import { parseRange, rangeShare, type Range } from '@pokerall/poker-engine';

/** A range typed in notation, or null when the text can't be read or holds no hands. */
export function readRange(text: string): Range | null {
  if (!text.trim()) return null;
  try {
    const range = parseRange(text);
    return rangeShare(range) > 0 ? range : null;
  } catch {
    return null;
  }
}

const fromContent = (id: string, action: string) => rangeById(id)?.actions[action]?.range ?? '';

/** Ready ranges for the calculator: a few by hand and the Academy's reference ranges. */
export const RANGE_PRESETS: { id: string; text: () => string }[] = [
  { id: 'premium', text: () => 'QQ+, AKs, AKo' },
  { id: 'rfiUTG', text: () => fromContent('6max-100bb-rfi-UTG', 'raise') },
  { id: 'rfiCO', text: () => fromContent('6max-100bb-rfi-CO', 'raise') },
  { id: 'rfiBTN', text: () => fromContent('6max-100bb-rfi-BTN', 'raise') },
  { id: 'threeBet', text: () => fromContent('6max-100bb-3bet-BTN-vs-CO', 'raise') },
  { id: 'bbDefend', text: () => fromContent('6max-100bb-defend-BB-vs-BTN', 'call') },
  {
    id: 'any',
    text: () =>
      '22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J2o+, T2o+, 92o+, 82o+, 72o+, 62o+, 52o+, 42o+, 32o',
  },
];
