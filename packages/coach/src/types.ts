import type { Street } from '@pokerall/poker-engine';

export type Grade = 'good' | 'inaccuracy' | 'mistake';

export type Move = 'fold' | 'check' | 'call' | 'bet' | 'raise';

/**
 * Why a decision got its grade. The app turns each code into a sentence with the numbers in `params`
 * (hand, position, equity, the price of a call…).
 */
export type Reason =
  // Before the flop, nobody has raised.
  | 'openGood'
  | 'openLoose'
  | 'jamDeep'
  | 'limp'
  | 'limpHu'
  | 'foldOpenable'
  | 'foldWeak'
  // Before the flop, after limpers.
  | 'isoRaise'
  | 'isoLoose'
  | 'overlimp'
  | 'limpStrong'
  | 'checkStrong'
  | 'checkBB'
  // Before the flop, facing raises.
  | 'threeBetValue'
  | 'threeBetBluff'
  | 'threeBetLoose'
  | 'fourBetValue'
  | 'fourBetBluff'
  | 'fourBetLoose'
  | 'jamGood'
  | 'jamBad'
  // Calling or folding to a bet, on any street: decided by the price.
  | 'callGood'
  | 'callBad'
  | 'foldGood'
  | 'foldBad'
  | 'callClose'
  | 'foldClose'
  // After the flop, nobody has bet.
  | 'valueBet'
  | 'betThin'
  | 'semiBluff'
  | 'bluff'
  | 'bluffMultiway'
  | 'check'
  | 'slowplay'
  | 'missedValue'
  // After the flop, raising a bet.
  | 'raiseValue'
  | 'raiseSemi'
  | 'raiseOk'
  | 'raiseBluff'
  | 'missedRaise';

/** Academy lessons a review points to (the Academy of stage 5 opens them by these ids). */
export type LessonId =
  | 'preflop-rfi'
  | 'preflop-vs-open'
  | 'preflop-3bet'
  | 'sizing-preflop'
  | 'math-pot-odds'
  | 'postflop-value'
  | 'postflop-bluff'
  | 'postflop-draws';

export type DecisionReview = {
  /** Index of the hand state before the decision in `replay(history)`; the replayer jumps there. */
  step: number;
  street: Street;
  move: Move;
  /** Chips the bet or raise went to, for bets and raises. */
  amount: number | null;
  allIn: boolean;
  grade: Grade;
  /** What the decision cost against the better move, in big blinds; null when it can't be put in numbers. */
  evLossBB: number | null;
  /** Share of the pot the hand wins against the opponents' likely ranges (not their real cards). */
  equity: number | null;
  /** Equity a call needed to break even; null when there was nothing to call. */
  potOdds: number | null;
  /** The better move when the grade isn't "good". */
  better: Move | null;
  reason: Reason;
  params: Record<string, string | number>;
  lesson: LessonId;
};

export type HandReview = {
  version: 1;
  decisions: DecisionReview[];
  counts: Record<Grade, number>;
  /** Sum of the EV lost where it could be counted, in big blinds. */
  totalLossBB: number;
};
