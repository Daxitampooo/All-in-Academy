# @pokerall/poker-engine

No-Limit Texas Hold'em logic in plain TypeScript, with no I/O. The phone app uses it
for offline games, drills and analysis; the future server will use the same code.

| Module | What it does |
|---|---|
| `cards` | Cards as numbers 0..51, parsing and printing (`As`, `Td`). |
| `rng` | ChaCha20-based seeded RNG and Fisher–Yates shuffle (replayable, provably fair decks). |
| `evaluator` | Best hand out of 5–7 cards as one comparable number; categories and the best five cards. |
| `game` | A hand from blinds to showdown: legal actions, minimum raises, short all-ins, side pots, uncalled bets, split pots. |
| `history` | Compact hand history and step-by-step replay. |
| `ranges` | Range notation (`22+, A2s+, KTo+, AKo:0.5`), the 13×13 grid, combo counting with dead cards. |
| `equity` | Exact or Monte Carlo equity for hands and ranges. |
| `arrange` | Builds a deck that deals chosen cards (tests, lessons, drills). |

```ts
import { startHand, applyAction, legalActions, shuffledDeck, createSeededRng } from '@pokerall/poker-engine';

let hand = startHand(
  { players: [{ id: 'me', stack: 10_000 }, { id: 'bot', stack: 10_000 }], button: 0, smallBlind: 50, bigBlind: 100 },
  shuffledDeck(createSeededRng(seed)),
);
legalActions(hand); // { canCheck, callAmount, raise: { type, min, max } }
hand = applyAction(hand, { type: 'raise', amount: 300 });
```

Rules followed: heads-up button posts the small blind and acts first preflop; a raise must
add at least the previous full raise; an all-in for less than a full raise does not reopen
betting for players who already acted (several short all-ins that add up to a full raise do);
uncalled chips go back before pots are built; odd chips go to the first winner left of the button.

Tests: `pnpm --filter @pokerall/poker-engine test` (every 5-card hand is enumerated, 3000
random hands check that no chip is lost and every hand replays identically).
