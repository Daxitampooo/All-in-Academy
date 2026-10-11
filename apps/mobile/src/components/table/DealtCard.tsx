import type { Card } from '@pokerall/poker-engine';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { PlayingCard, type CardSize } from '@/components/table/PlayingCard';

/** How long a board card takes to fly from the dealer to its place. */
const FLIGHT = 320;
/** How long turning a card over takes. */
const TURN = 240;

type FlipProps = {
  /** null keeps the card face down. */
  card: Card | null;
  size: CardSize;
  /** Wait before turning over. */
  delay?: number;
  highlight?: boolean;
  dim?: boolean;
};

/**
 * A card that turns over when its face becomes known: the back squeezes to an edge, then the face opens up.
 * Mount it with a card to turn it over right away (after `delay`).
 */
export function FlipCard({ card, size, delay = 0, highlight, dim }: FlipProps) {
  const turned = useSharedValue(0);

  useEffect(() => {
    turned.set(card === null ? 0 : withDelay(delay, withTiming(1, { duration: TURN, easing: Easing.inOut(Easing.quad) })));
  }, [card, delay, turned]);

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(turned.get(), [0, 0.5, 1], [1, 0, 0]) }],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(turned.get(), [0, 0.5, 1], [0, 0, 1]) }],
  }));

  return (
    <View>
      <Animated.View style={backStyle}>
        <PlayingCard card={null} size={size} />
      </Animated.View>
      {card !== null ? (
        <Animated.View style={[StyleSheet.absoluteFill, faceStyle]}>
          <PlayingCard card={card} size={size} highlight={highlight} dim={dim} />
        </Animated.View>
      ) : null}
    </View>
  );
}

type DealtProps = {
  card: Card;
  size: CardSize;
  /** Wait before flying in: the flop comes one card after another. */
  delay?: number;
  highlight?: boolean;
  dim?: boolean;
};

/** A board card: flies in face down from the dealer above the board, then turns over. */
export function DealtCard({ card, size, delay = 0, highlight, dim }: DealtProps) {
  const flown = useSharedValue(0);

  useEffect(() => {
    flown.set(withDelay(delay, withTiming(1, { duration: FLIGHT, easing: Easing.out(Easing.cubic) })));
  }, [delay, flown]);

  const flight = useAnimatedStyle(() => ({
    opacity: flown.get(),
    transform: [{ translateY: interpolate(flown.get(), [0, 1], [-64, 0]) }, { scale: interpolate(flown.get(), [0, 1], [0.55, 1]) }],
  }));

  return (
    <Animated.View style={flight}>
      <FlipCard card={card} size={size} delay={delay + FLIGHT} highlight={highlight} dim={dim} />
    </Animated.View>
  );
}
