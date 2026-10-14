import { PushFoldSolver, type Position, type PushFoldSolution, type PushFoldSpot } from '@pokerall/poker-engine';
import { useEffect, useState } from 'react';

import { formatNumber } from '@/lib/format';

// Seats between the big blind and the button, in acting order, by table size (as in the engine).
const MIDDLE: Record<number, Position[]> = {
  2: [],
  3: [],
  4: ['UTG'],
  5: ['UTG', 'CO'],
  6: ['UTG', 'HJ', 'CO'],
  7: ['UTG', 'LJ', 'HJ', 'CO'],
  8: ['UTG', 'MP', 'LJ', 'HJ', 'CO'],
  9: ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'],
};

/** Seats in preflop acting order. Heads-up the button is also the small blind. */
export function actingOrder(players: number): Position[] {
  return players === 2 ? ['BTN', 'BB'] : [...MIDDLE[players]!, 'BTN', 'SB', 'BB'];
}

/** The seat that has `behind` players left to act after it. */
export function seatWithBehind(players: number, behind: number): Position {
  const order = actingOrder(players);
  return order[order.length - 1 - behind]!;
}

/** The players behind the pusher, in the order they act (the last is the big blind). */
export function seatsBehind(players: number, behind: number): Position[] {
  const order = actingOrder(players);
  return order.slice(order.length - behind);
}

export function spotKey(s: PushFoldSpot): string {
  return `${s.players}/${s.behind}/${s.stack}/${s.ante}`;
}

function spotFromKey(key: string): PushFoldSpot {
  const [players, behind, stack, ante] = key.split('/').map(Number);
  return { players: players!, behind: behind!, stack: stack!, ante: ante! };
}

const cache = new Map<string, PushFoldSolution>();
const CACHE_SIZE = 48;

/**
 * The push/fold chart for a spot. Solving takes from a fraction of a second to about a second on a phone,
 * so it runs in small steps between frames; solved spots are kept for the session.
 */
export function usePushFold(spot: PushFoldSpot): { solution: PushFoldSolution | null; progress: number } {
  const key = spotKey(spot);
  const [progress, setProgress] = useState({ key: '', value: 0 });
  // The finished solution goes through state: a read of the module cache alone would be memoized by key and
  // never see the result arrive.
  const [solved, setSolved] = useState<{ key: string; solution: PushFoldSolution } | null>(null);

  useEffect(() => {
    if (cache.has(key)) return;
    const s = spotFromKey(key);
    const solver = new PushFoldSolver(s);
    // Bigger tables cost more per step; keep each step short.
    const perTick = Math.max(1, Math.floor(10 / s.behind));
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      solver.run(perTick);
      if (solver.done) {
        if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
        const solution = solver.solution();
        cache.set(key, solution);
        setSolved({ key, solution });
      } else {
        setProgress({ key, value: solver.progress });
        timer = setTimeout(tick, 0);
      }
    };
    timer = setTimeout(tick, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);

  const solution = solved?.key === key ? solved.solution : (cache.get(key) ?? null);
  return { solution, progress: progress.key === key ? progress.value : 0 };
}

/** Table sizes offered in the charts and the trainer. */
export const TABLE_SIZES = [2, 6, 9] as const;

/** Antes per player, in big blinds. */
export const ANTES = [0, 0.1, 0.125, 0.25] as const;

export function anteLabel(t: (key: string, options?: Record<string, unknown>) => string, ante: number): string {
  return ante === 0 ? t('tools.pushfold.noAnte') : t('tools.pushfold.antePct', { pct: formatNumber(ante * 100, 1) });
}
