import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { formatDecimal } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

const HEIGHT = 150;
const PAD = 10;

/** Running result after every hand, in big blinds, with the zero line dashed. */
export function ResultChart({ values, label }: { values: number[]; label: string }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const last = values[values.length - 1] ?? 0;
  const color = last >= 0 ? colors.lime : colors.magenta;
  const x = (i: number) => (values.length > 1 ? PAD + (i / (values.length - 1)) * (width - 2 * PAD) : width / 2);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (HEIGHT - 2 * PAD);
  const signed = (v: number) => `${v > 0 ? '+' : ''}${formatDecimal(v)}`;

  return (
    <View
      style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={label}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Line x1={PAD} x2={width - PAD} y1={y(0)} y2={y(0)} stroke={colors.textMuted} strokeOpacity={0.5} strokeDasharray="4 5" />
          <Polyline
            points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx={x(values.length - 1)} cy={y(last)} r={4} fill={color} />
        </Svg>
      ) : null}
      <AppText variant="caption" tone="muted" numeric style={[styles.mark, { top: 4 }]}>
        {signed(max)}
      </AppText>
      <AppText variant="caption" tone="muted" numeric style={[styles.mark, { bottom: 4 }]}>
        {signed(min)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: HEIGHT,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mark: {
    position: 'absolute',
    left: 8,
  },
});
