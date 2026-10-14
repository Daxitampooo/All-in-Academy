import { reviewLastDecision, type DecisionReview } from '@pokerall/coach';
import { createSeededRng, historyOf, type HandState } from '@pokerall/poker-engine';
import { getRandomBytes } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';

/** How long a coach tip stays on screen. */
const TIP_MS = 7000;
/** Fewer samples than the full analysis: the tip has to appear right after the move. */
const SAMPLES = 500;

export type CoachTip = { key: string; review: DecisionReview };

/**
 * The coach at a bot table: after each of the hero's decisions, grades it the way the hand analysis does
 * (against the opponents' likely ranges, never their real cards) and returns a short tip.
 */
export function useCoach(hand: HandState, handNumber: number, hero: number, enabled: boolean): { tip: CoachTip | null; dismiss: () => void } {
  const [tip, setTip] = useState<CoachTip | null>(null);
  const [rng] = useState(() => createSeededRng(getRandomBytes(32)));
  const seen = useRef('');
  const heroActions = hand.events.filter((e) => e.type === 'action' && e.seat === hero).length;
  const key = `${handNumber}:${heroActions}`;

  useEffect(() => {
    if (!enabled || heroActions === 0 || seen.current === key) return;
    seen.current = key;
    const snapshot = hand;
    // Let the move show on the table first, then think.
    const think = setTimeout(() => {
      const review = reviewLastDecision(historyOf(snapshot), hero, { rng, samples: SAMPLES });
      if (review) setTip({ key, review });
    }, 60);
    return () => clearTimeout(think);
    // The hand object changes with every action; the key says when the hero has made a new decision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    if (!tip) return;
    const hide = setTimeout(() => setTip(null), TIP_MS);
    return () => clearTimeout(hide);
  }, [tip]);

  return { tip: enabled ? tip : null, dismiss: () => setTip(null) };
}
