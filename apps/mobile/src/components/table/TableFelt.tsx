import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Line, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTableLook } from '@/looks/LookProvider';
import type { FeltPattern } from '@/looks/catalog';
import { useTheme } from '@/theme/ThemeProvider';

/** Texture drawn over the felt, clipped to the table. */
function FeltTexture({ id, pattern, color, width, height }: { id: string; pattern: FeltPattern; color: string; width: number; height: number }) {
  switch (pattern) {
    case 'none':
      return null;
    case 'grain':
      return (
        <>
          <Defs>
            <Pattern id={`felt-grain-${id}`} width={7} height={7} patternUnits="userSpaceOnUse">
              <Line x1={0} y1={7} x2={7} y2={0} stroke={color} strokeOpacity={0.08} strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#felt-grain-${id})`} />
        </>
      );
    case 'grid':
      return (
        <>
          <Defs>
            <Pattern id={`felt-grid-${id}`} width={18} height={18} patternUnits="userSpaceOnUse">
              <Path d="M18 0H0V18" fill="none" stroke={color} strokeOpacity={0.1} strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#felt-grid-${id})`} />
        </>
      );
    case 'hex':
      return (
        <>
          <Defs>
            <Pattern id={`felt-hex-${id}`} width={24} height={41.57} patternUnits="userSpaceOnUse">
              <Path
                d="M6 0L18 0L24 10.39L18 20.78L6 20.78L0 10.39Z M6 20.78L0 31.18L6 41.57M18 20.78L24 31.18L18 41.57"
                fill="none"
                stroke={color}
                strokeOpacity={0.1}
                strokeWidth={1}
              />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#felt-hex-${id})`} />
        </>
      );
    case 'aurora':
      return (
        <>
          <Defs>
            <RadialGradient id={`aurora-a-${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`aurora-b-${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#A97BFF" stopOpacity={0.24} />
              <Stop offset="1" stopColor="#A97BFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={width * 0.3} cy={height * 0.35} rx={width * 0.45} ry={height * 0.22} fill={`url(#aurora-a-${id})`} />
          <Ellipse cx={width * 0.72} cy={height * 0.62} rx={width * 0.42} ry={height * 0.2} fill={`url(#aurora-b-${id})`} />
        </>
      );
  }
}

/** The table: a tall rimmed oval that fills its parent, drawn in the current look. */
export function TableFelt({ width, height }: { width: number; height: number }) {
  const { colors } = useTheme();
  const { felt, neon } = useTableLook();
  // SVG ids are global on the web: every table on screen needs its own.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (width <= 0 || height <= 0) return null;
  const w = width * 0.8;
  const h = height * 0.66;
  const x = (width - w) / 2;
  const y = height * 0.13;
  const r = Math.min(w, h) / 2;
  const glow = colors.glow * neon.glow;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id={`felt-clip-${id}`}>
            <Rect x={x} y={y} width={w} height={h} rx={r} />
          </ClipPath>
        </Defs>
        {glow > 0 ? (
          <>
            <Rect x={x} y={y} width={w} height={h} rx={r} stroke={neon.main} strokeOpacity={Math.min(0.2, 0.06 * glow)} strokeWidth={22} fill="none" />
            <Rect x={x} y={y} width={w} height={h} rx={r} stroke={neon.main} strokeOpacity={Math.min(0.4, 0.15 * glow)} strokeWidth={9} fill="none" />
          </>
        ) : null}
        <Rect x={x} y={y} width={w} height={h} rx={r} fill={felt.fill} />
        <G clipPath={`url(#felt-clip-${id})`}>
          <G x={x} y={y}>
            <FeltTexture id={id} pattern={felt.pattern} color={felt.inner} width={w} height={h} />
          </G>
        </G>
        <Rect x={x} y={y} width={w} height={h} rx={r} stroke={neon.main} strokeWidth={3} fill="none" />
        <Rect
          x={x + 14}
          y={y + 14}
          width={w - 28}
          height={h - 28}
          rx={r - 14}
          stroke={neon.accent}
          strokeOpacity={0.35}
          strokeWidth={1.2}
          fill="none"
        />
      </Svg>
    </View>
  );
}
