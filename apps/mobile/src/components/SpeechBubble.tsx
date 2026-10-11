import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

export type TailSide = 'up' | 'down' | 'left' | 'right' | 'none';

type Props = {
  text: string;
  /** Border color, usually the bot's own hue. */
  color: string;
  /** Which side the little tail points to. */
  tail?: TailSide;
  /**
   * Where the tail sits along its side, measured from the left (up/down tails) or the top (left/right tails)
   * to the tail's center. Centered when omitted.
   */
  tailAt?: number;
  /** Measure `tailAt` from the right edge instead of the left (up/down tails only). */
  tailFromEnd?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TAIL = 7;

/** A chat line from a bot. */
export function SpeechBubble({ text, color, tail = 'none', tailAt, tailFromEnd = false, style }: Props) {
  const { colors } = useTheme();
  const edge = withAlpha(color, 0.75);

  let tailStyle: StyleProp<ViewStyle> = null;
  if (tail === 'up' || tail === 'down') {
    const along =
      tailAt === undefined ? styles.alongCenter : tailFromEnd ? { right: tailAt - TAIL } : { left: tailAt - TAIL };
    tailStyle = [styles.tail, tail === 'up' ? [styles.up, { borderBottomColor: edge }] : [styles.down, { borderTopColor: edge }], along];
  } else if (tail === 'left' || tail === 'right') {
    const along = { top: (tailAt ?? 18) - TAIL };
    tailStyle = [styles.tail, tail === 'left' ? [styles.left, { borderRightColor: edge }] : [styles.right, { borderLeftColor: edge }], along];
  }

  return (
    <View
      style={[styles.bubble, { backgroundColor: colors.surface, borderColor: edge }, style]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite">
      {tailStyle ? <View style={tailStyle} /> : null}
      <AppText variant="label" numberOfLines={3}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    maxWidth: 260,
  },
  tail: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  alongCenter: {
    alignSelf: 'center',
  },
  up: {
    top: -8,
    borderBottomWidth: 8,
    borderLeftWidth: TAIL,
    borderRightWidth: TAIL,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  down: {
    bottom: -8,
    borderTopWidth: 8,
    borderLeftWidth: TAIL,
    borderRightWidth: TAIL,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  left: {
    left: -8,
    borderRightWidth: 8,
    borderTopWidth: TAIL,
    borderBottomWidth: TAIL,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  right: {
    right: -8,
    borderLeftWidth: 8,
    borderTopWidth: TAIL,
    borderBottomWidth: TAIL,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
