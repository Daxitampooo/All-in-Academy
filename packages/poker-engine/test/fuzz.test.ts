import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createSeededRng,
  historyOf,
  legalActions,
  replay,
  seedFromHex,
  shuffledDeck,
  startHand,
  type HandConfig,
  type PlayerAction,
  type Rng,
} from '../src';

function randomAction(rng: Rng, legal: NonNullable<ReturnType<typeof legalActions>>): PlayerAction {
  const options: PlayerAction[] = [];
  if (legal.canFold) options.push({ type: 'fold' });
  if (legal.canCheck) options.push({ type: 'check' });
  if (legal.callAmount > 0) options.push({ type: 'call' }, { type: 'call' });
  if (legal.raise) {
    const { type, min, max } = legal.raise;
    const roll = rng.nextInt(3);
    const amount = roll === 0 ? min : roll === 1 ? max : min + rng.nextInt(max - min + 1);
    options.push({ type, amount });
  }
  return options[rng.nextInt(options.length)]!;
}

describe('random hands', () => {
  it('keep every chip, never go negative and replay identically', () => {
    const rng = createSeededRng(seedFromHex('ab'.repeat(32)));
    for (let hand = 0; hand < 3000; hand++) {
      const count = 2 + rng.nextInt(9);
      const bb = [2, 10, 100][rng.nextInt(3)]!;
      const config: HandConfig = {
        players: Array.from({ length: count }, (_, i) => ({
          id: `p${i}`,
          // Some stacks are smaller than the blinds on purpose.
          stack: 1 + rng.nextInt(rng.nextInt(4) === 0 ? bb * 2 : bb * 150),
        })),
        button: rng.nextInt(count),
        smallBlind: Math.floor(bb / 2),
        bigBlind: bb,
        ante: rng.nextInt(3) === 0 ? Math.max(1, Math.floor(bb / 10)) : 0,
      };
      const total = config.players.reduce((s, p) => s + p.stack, 0);

      let state = startHand(config, shuffledDeck(rng));
      let steps = 0;
      while (state.phase !== 'complete') {
        const legal = legalActions(state);
        expect(legal).not.toBeNull();
        state = applyAction(state, randomAction(rng, legal!));
        for (const p of state.players) expect(p.stack).toBeGreaterThanOrEqual(0);
        expect(++steps).toBeLessThan(500);
      }

      const result = state.result!;
      expect(state.players.reduce((s, p) => s + p.stack, 0)).toBe(total);
      expect(result.net.reduce((a, b) => a + b, 0)).toBe(0);
      expect(result.won.reduce((a, b) => a + b, 0)).toBe(state.players.reduce((s, p) => s + p.totalBet, 0));
      expect(result.pots.reduce((s, p) => s + p.amount, 0)).toBe(result.won.reduce((a, b) => a + b, 0));
      if (!result.uncontested) expect(state.board).toHaveLength(5);

      const replayed = replay(historyOf(state));
      expect(replayed[replayed.length - 1]!.players.map((p) => p.stack)).toEqual(state.players.map((p) => p.stack));
    }
  });
});
