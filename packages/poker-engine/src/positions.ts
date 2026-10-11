/** Position names used in the Academy and in statistics. */
export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'UTG+2' | 'MP' | 'LJ' | 'HJ' | 'CO';

// Seats between the big blind and the button, in acting order, by table size.
const MIDDLE_SEATS: Record<number, Position[]> = {
  3: [],
  4: ['UTG'],
  5: ['UTG', 'CO'],
  6: ['UTG', 'HJ', 'CO'],
  7: ['UTG', 'LJ', 'HJ', 'CO'],
  8: ['UTG', 'MP', 'LJ', 'HJ', 'CO'],
  9: ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'],
  10: ['UTG', 'UTG+1', 'UTG+2', 'MP', 'LJ', 'HJ', 'CO'],
};

/**
 * Position of every seat for a hand with `count` players (2..10) and the given
 * button index. Heads-up: the button is also the small blind and is called BTN.
 */
export function positionsFor(count: number, button: number): Position[] {
  if (!Number.isInteger(count) || count < 2 || count > 10) throw new Error(`Bad player count ${count}`);
  if (!Number.isInteger(button) || button < 0 || button >= count) throw new Error(`Bad button ${button}`);
  const out = new Array<Position>(count);
  const at = (offset: number) => (button + offset) % count;
  if (count === 2) {
    out[at(0)] = 'BTN';
    out[at(1)] = 'BB';
    return out;
  }
  out[at(0)] = 'BTN';
  out[at(1)] = 'SB';
  out[at(2)] = 'BB';
  MIDDLE_SEATS[count]!.forEach((position, i) => {
    out[at(3 + i)] = position;
  });
  return out;
}
