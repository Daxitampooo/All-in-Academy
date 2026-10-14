import { describe, expect, it } from 'vitest';

import { PushFoldSolver, classEquity, classIndex, classShare, solvePushFold } from '../src';

const at = (weights: Float32Array, cls: string) => weights[classIndex(cls)]!;

describe('preflop class equities', () => {
  it('match well-known matchups', () => {
    const near = (a: string, b: string, value: number) =>
      expect(Math.abs(classEquity(classIndex(a), classIndex(b)) - value), `${a} vs ${b}`).toBeLessThan(0.01);
    near('AA', 'KK', 0.82);
    near('AA', 'AKs', 0.877);
    near('AKo', 'QQ', 0.43);
    near('22', 'AKo', 0.526);
    near('KK', 'AKs', 0.66);
    expect(classEquity(classIndex('KK'), classIndex('AA'))).toBeCloseTo(1 - classEquity(classIndex('AA'), classIndex('KK')), 9);
  });
});

describe('push/fold', () => {
  it('heads-up at 10 BB is close to the known equilibrium (push ~58%, call ~37%)', () => {
    const s = solvePushFold({ players: 2, behind: 1, stack: 10, ante: 0 });
    const push = classShare(s.push);
    const call = classShare(s.calls[0]!);
    expect(push).toBeGreaterThan(0.55);
    expect(push).toBeLessThan(0.65);
    expect(call).toBeGreaterThan(0.33);
    expect(call).toBeLessThan(0.42);
    expect(at(s.push, 'AA')).toBe(1);
    expect(at(s.push, 'A2o')).toBe(1);
    expect(at(s.calls[0]!, 'AA')).toBe(1);
    expect(at(s.calls[0]!, '72o')).toBe(0);
    expect(call).toBeLessThan(push);
  });

  it('pushes wider with shorter stacks and with antes', () => {
    const share = (stack: number, ante = 0) => classShare(solvePushFold({ players: 2, behind: 1, stack, ante }).push);
    expect(share(3)).toBeGreaterThan(share(10));
    expect(share(10)).toBeGreaterThan(share(20));
    expect(classShare(solvePushFold({ players: 6, behind: 3, stack: 10, ante: 0.125 }).push)).toBeGreaterThan(
      classShare(solvePushFold({ players: 6, behind: 3, stack: 10, ante: 0 }).push),
    );
  });

  it('pushes tighter with more players behind', () => {
    const share = (behind: number) => classShare(solvePushFold({ players: 6, behind, stack: 10, ante: 0 }).push);
    expect(share(5)).toBeLessThan(share(3));
    expect(share(3)).toBeLessThan(share(1));
  });

  it('runs in steps with the same result', () => {
    const spot = { players: 9, behind: 8, stack: 8, ante: 0.1 };
    const solver = new PushFoldSolver(spot);
    let ticks = 0;
    while (!solver.done) {
      solver.run(10);
      ticks++;
    }
    expect(ticks).toBe(15);
    expect(solver.progress).toBe(1);
    expect(Array.from(solver.solution().push)).toEqual(Array.from(solvePushFold(spot).push));
  });

  it('rejects impossible spots', () => {
    expect(() => solvePushFold({ players: 2, behind: 2, stack: 10, ante: 0 })).toThrow();
    expect(() => solvePushFold({ players: 6, behind: 1, stack: 0.5, ante: 0 })).toThrow();
  });
});
