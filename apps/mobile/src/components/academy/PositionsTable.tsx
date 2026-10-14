import { positionsFor } from '@pokerall/poker-engine';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** A table with every seat named by its position; highlighted seats glow. The button sits at the bottom. */
export function PositionsTable({ seats, highlight, caption }: { seats: 2 | 6 | 9; highlight: string[]; caption?: string }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const h = 210;
  const names = positionsFor(seats, 0);
  const lit = new Set(highlight);
  const cx = w / 2;
  const cy = h / 2;
  const rx = w * 0.38;
  const ry = h * 0.36;
  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={{ height: h }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={names.join(', ')}>
        {w > 0 ? (
          <>
            <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
              <Rect x={cx - rx * 0.78} y={cy - ry * 0.7} width={rx * 1.56} height={ry * 1.4} rx={ry * 0.7} fill={colors.felt} stroke={colors.cyan} strokeOpacity={0.6} strokeWidth={2} />
            </Svg>
            {names.map((name, i) => {
              // Clockwise from the bottom: the button first, then the blinds to its left.
              const angle = Math.PI / 2 + (i * 2 * Math.PI) / seats;
              const x = cx + rx * Math.cos(angle);
              const y = cy + ry * Math.sin(angle);
              const on = lit.has(name);
              return (
                <View
                  key={i}
                  style={[
                    styles.seat,
                    {
                      left: x - 26,
                      top: y - 16,
                      borderColor: on ? colors.cyan : colors.border,
                      backgroundColor: on ? withAlpha(colors.cyan, 0.18) : colors.surfaceRaised,
                      boxShadow: on && colors.glow > 0 ? `0 0 10px ${withAlpha(colors.cyan, 0.6)}` : undefined,
                    },
                  ]}>
                  <AppText variant="caption" strong tone={on ? 'cyan' : 'muted'} numberOfLines={1}>
                    {name}
                  </AppText>
                </View>
              );
            })}
          </>
        ) : null}
      </View>
      {caption ? (
        <AppText variant="caption" tone="muted">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  seat: {
    position: 'absolute',
    width: 52,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
