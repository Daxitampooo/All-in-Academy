import type { HandReview } from '@pokerall/coach';
import type { HandHistory, Position } from '@pokerall/poker-engine';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LeagueId } from '@/bots/catalog';
import { ANALYSIS_CONFIG } from '@/config/analysis';
import { kvStorage } from '@/lib/storage';
import type { SeatInfo } from '@/table/useTableGame';

/** A hand saved for "My hands": enough to replay it exactly, plus what the list shows and filters on. */
export type SavedHand = {
  id: string;
  matchId: string;
  /** When the hand ended, ms since 1970. */
  at: number;
  mode: 'hu' | 'six';
  /** The opponent in a heads-up match. */
  botId: string | null;
  /** The league of a practice table. */
  league: LeagueId | null;
  seats: SeatInfo[];
  hero: number;
  position: Position;
  history: HandHistory;
  /** The hero's result in chips; for all-ins split by equity, the split result. */
  net: number;
  /** Set when an all-in before the river was split by equity: each seat's share of the pot. */
  equity: number[] | null;
  /** Flagged "for review" by the player. */
  flagged: boolean;
};

type HandsState = {
  /** Newest last. */
  hands: SavedHand[];
  /** Analyses already made, by hand id: opening them again is free. */
  reviews: Record<string, HandReview>;
  add: (hand: SavedHand) => void;
  toggleFlag: (id: string) => void;
  saveReview: (id: string, review: HandReview) => void;
};

/** Drops the oldest hands over the limit, flagged ones last. */
function prune(hands: SavedHand[], reviews: Record<string, HandReview>) {
  const limit = ANALYSIS_CONFIG.historyLimit;
  if (hands.length <= limit) return { hands, reviews };
  let extra = hands.length - limit;
  const drop = new Set<string>();
  for (const pass of [false, true]) {
    for (const h of hands) {
      if (extra === 0) break;
      if (h.flagged === pass && !drop.has(h.id)) {
        drop.add(h.id);
        extra -= 1;
      }
    }
  }
  const kept = hands.filter((h) => !drop.has(h.id));
  const keptReviews: Record<string, HandReview> = {};
  for (const h of kept) if (reviews[h.id]) keptReviews[h.id] = reviews[h.id]!;
  return { hands: kept, reviews: keptReviews };
}

/** The player's hand history on this phone. */
export const useHands = create<HandsState>()(
  persist(
    (set) => ({
      hands: [],
      reviews: {},
      add: (hand) => set((s) => prune([...s.hands, hand], s.reviews)),
      toggleFlag: (id) => set((s) => ({ hands: s.hands.map((h) => (h.id === id ? { ...h, flagged: !h.flagged } : h)) })),
      saveReview: (id, review) => set((s) => ({ reviews: { ...s.reviews, [id]: review } })),
    }),
    {
      name: 'hand-history',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ hands, reviews }) => ({ hands, reviews }),
    },
  ),
);

export function handById(id: string): SavedHand | undefined {
  return useHands.getState().hands.find((h) => h.id === id);
}
