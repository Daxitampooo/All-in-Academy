import { useRef } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Props = {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  label: string;
  lessLabel: string;
  moreLabel: string;
};

function snap(raw: number, min: number, max: number, step: number): number {
  if (raw >= max - step / 2) return max;
  if (raw <= min) return min;
  return Math.min(max, Math.max(min, min + Math.round((raw - min) / step) * step));
}

/** Drag or tap to choose a bet size; − and + step by `step`. */
export function BetSlider({ min, max, step, value, onChange, label, lessLabel, moreLabel }: Props) {
  const { colors } = useTheme();
  const track = useRef<View>(null);
  const geometry = useRef({ x: 0, width: 1 });

  const measure = () =>
    track.current?.measureInWindow((x, _y, width) => {
      geometry.current = { x, width: Math.max(1, width) };
    });

  const update = (e: GestureResponderEvent) => {
    const { x, width } = geometry.current;
    const share = Math.min(1, Math.max(0, (e.nativeEvent.pageX - x) / width));
    onChange(snap(min + share * (max - min), min, max, step));
  };

  const share = max > min ? (value - min) / (max - min) : 1;
  const nudge = (dir: 1 | -1) => onChange(snap(value + dir * step, min, max, step));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => nudge(-1)}
        accessibilityRole="button"
        accessibilityLabel={lessLabel}
        hitSlop={8}
        style={[styles.nudge, { borderColor: colors.border }]}>
        <AppText variant="heading">−</AppText>
      </Pressable>
      <View
        ref={track}
        onLayout={measure}
        style={styles.track}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          measure();
          update(e);
        }}
        onResponderMove={update}>
        <View style={[styles.rail, { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: colors.cyan }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: `${share * 100}%`,
              backgroundColor: colors.cyan,
              borderColor: colors.bg,
              boxShadow: colors.glow > 0 ? `0 0 10px ${withAlpha(colors.cyan, 0.8)}` : undefined,
            },
          ]}
        />
      </View>
      <Pressable
        onPress={() => nudge(1)}
        accessibilityRole="button"
        accessibilityLabel={moreLabel}
        hitSlop={8}
        style={[styles.nudge, { borderColor: colors.border }]}>
        <AppText variant="heading">+</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  nudge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  rail: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    borderWidth: 3,
  },
});
