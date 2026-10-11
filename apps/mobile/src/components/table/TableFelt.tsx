import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/** The table: a tall neon-rimmed oval that fills its parent. */
export function TableFelt({ width, height }: { width: number; height: number }) {
  const { colors } = useTheme();
  if (width <= 0 || height <= 0) return null;
  const w = width * 0.8;
  const h = height * 0.66;
  const x = (width - w) / 2;
  const y = height * 0.13;
  const r = Math.min(w, h) / 2;
  const glow = colors.glow;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {glow > 0 ? (
          <>
            <Rect x={x} y={y} width={w} height={h} rx={r} stroke={colors.cyan} strokeOpacity={0.06 * glow} strokeWidth={22} fill="none" />
            <Rect x={x} y={y} width={w} height={h} rx={r} stroke={colors.cyan} strokeOpacity={0.15 * glow} strokeWidth={9} fill="none" />
          </>
        ) : null}
        <Rect x={x} y={y} width={w} height={h} rx={r} stroke={colors.cyan} strokeWidth={3} fill={colors.felt} />
        <Rect
          x={x + 14}
          y={y + 14}
          width={w - 28}
          height={h - 28}
          rx={r - 14}
          stroke={colors.magenta}
          strokeOpacity={0.35}
          strokeWidth={1.2}
          fill="none"
        />
      </Svg>
    </View>
  );
}
