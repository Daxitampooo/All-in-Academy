import { classCombos, suitOf, type Card } from '@pokerall/poker-engine';

/** Cards to show a starting hand with: spades for suited hands, spade and heart otherwise. */
export function showCards(handClass: string): [Card, Card] {
  const combos = classCombos(handClass);
  const suited = handClass.endsWith('s');
  const best = combos.find(([a, b]) => (suited ? suitOf(a) === 3 && suitOf(b) === 3 : suitOf(a) === 3 && suitOf(b) === 2));
  return best ?? combos[0]!;
}
