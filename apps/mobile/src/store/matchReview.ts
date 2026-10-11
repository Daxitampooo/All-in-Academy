import { create } from 'zustand';

import type { SeriesUpdate } from '@/store/botProgress';
import type { HandRecord, MatchResult, SeatInfo, TableMode } from '@/table/useTableGame';

/** A match handed from the table to the analysis screen. */
export type ReviewMatch = {
  mode: TableMode;
  seats: SeatInfo[];
  hands: HandRecord[];
  /** Heads-up result, when the match was played to the end. */
  result: MatchResult | null;
  series: SeriesUpdate | null;
};

type MatchReviewState = {
  match: ReviewMatch | null;
  show: (match: ReviewMatch) => void;
};

/** Kept in memory only: saved hand history comes with "My hands". */
export const useMatchReview = create<MatchReviewState>()((set) => ({
  match: null,
  show: (match) => set({ match }),
}));
