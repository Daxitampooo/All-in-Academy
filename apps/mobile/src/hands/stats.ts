import { replay, statRates, statsFor } from '@pokerall/poker-engine';
import { useMemo } from 'react';

import { useHands } from '@/store/hands';

/** VPIP, PFR and the number of hands over everything saved in "My hands". */
export function useHandStats(): { hands: number; vpip: number | null; pfr: number | null } {
  const hands = useHands((s) => s.hands);
  return useMemo(() => {
    if (hands.length === 0) return { hands: 0, vpip: null, pfr: null };
    // Hero seats differ between hands only in theory; each hand is counted for its own hero seat.
    const finals = hands.map((h) => ({ state: replay(h.history).at(-1)!, hero: h.hero }));
    const counters = finals.reduce(
      (acc, { state, hero }) => {
        const one = statsFor([state], hero);
        return { hands: acc.hands + one.hands, vpip: acc.vpip + one.vpip, pfr: acc.pfr + one.pfr };
      },
      { hands: 0, vpip: 0, pfr: 0 },
    );
    const rates = statRates({ ...statsFor([], 0), ...counters });
    return { hands: counters.hands, vpip: rates.vpip, pfr: rates.pfr };
  }, [hands]);
}
