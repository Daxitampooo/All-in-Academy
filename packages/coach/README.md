# @pokerall/coach

Post-game review of a player's decisions in one hand: `reviewHand(history, seat, { rng })`.

Each decision gets a grade (good / inaccuracy / mistake), the EV it cost in big blinds where it can be
counted, the better move and a reason code with numbers for the app's text, plus the Academy lesson that
covers it.

How it judges:
- Equity is measured against the opponents' likely ranges from their actions (never their real cards):
  the review is about the decision, not the result.
- Before the flop: simplified opening ranges by position (`openShare`), and equity against the raisers'
  ranges for calls, folds and re-raises; all-in ranges narrow with stack depth (`jamShare`).
- Calls and folds on any street: the price (pot odds) against equity, with less equity realized out of
  position before the flop.
- After the flop: value bets, thin bets, bluffs (multiway bluffs flagged), checks that miss value on the
  river, raises.

These are teaching heuristics, not solver output; the app says so next to every review.
