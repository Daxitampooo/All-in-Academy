import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import type { RoomStyle } from '@/looks/catalog';

/** Fixed pseudo-random numbers, so the stars and windows don't move between renders. */
function seeded(count: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    out.push(s / 2147483648);
  }
  return out;
}

const STARS = seeded(150, 7);
const BUILDINGS = seeded(40, 11);

function Decor({ room, width, height }: { room: RoomStyle; width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;
  switch (room.decor) {
    case 'none':
      return null;
    case 'grid': {
      // A synthwave floor: lines running to a vanishing point, rows closer together near the horizon.
      const horizon = height * 0.7;
      const rows = [0.02, 0.06, 0.12, 0.2, 0.31, 0.45, 0.63, 0.85].map((f) => horizon + (height - horizon) * f);
      const cols = Array.from({ length: 13 }, (_, i) => (i - 6) / 6);
      return (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Line x1={0} y1={horizon} x2={width} y2={horizon} stroke={room.line} strokeOpacity={0.55} strokeWidth={1.5} />
          {rows.map((y) => (
            <Line key={y} x1={0} y1={y} x2={width} y2={y} stroke={room.line} strokeOpacity={0.28} strokeWidth={1} />
          ))}
          {cols.map((c) => (
            <Line key={c} x1={width / 2 + c * width * 0.2} y1={horizon} x2={width / 2 + c * width * 1.6} y2={height} stroke={room.line} strokeOpacity={0.28} strokeWidth={1} />
          ))}
        </Svg>
      );
    }
    case 'city': {
      const base = height * 0.93;
      let x = -10;
      const blocks: { x: number; w: number; h: number }[] = [];
      for (let i = 0; x < width && i < BUILDINGS.length; i++) {
        const w = 22 + BUILDINGS[i]! * 34;
        blocks.push({ x, w, h: height * (0.08 + BUILDINGS[(i + 7) % BUILDINGS.length]! * 0.22) });
        x += w + 2;
      }
      return (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {blocks.map((b, i) => (
            <Rect key={i} x={b.x} y={base - b.h} width={b.w} height={b.h + height} fill="#0A0F1E" stroke={room.line} strokeOpacity={0.35} strokeWidth={1} />
          ))}
          {blocks.flatMap((b, i) =>
            STARS.slice(i * 3, i * 3 + 3).map((r, j) => (
              <Rect key={`${i}-${j}`} x={b.x + 4 + r * (b.w - 10)} y={base - b.h + 6 + j * 12} width={3} height={4} fill={room.line} opacity={0.5} />
            )),
          )}
        </Svg>
      );
    }
    case 'stars':
      return (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {Array.from({ length: 50 }, (_, i) => (
            <Circle
              key={i}
              cx={STARS[i * 3]! * width}
              cy={STARS[i * 3 + 1]! * height}
              r={0.6 + STARS[i * 3 + 2]! * 1.3}
              fill={room.line}
              opacity={0.25 + STARS[i * 3 + 2]! * 0.6}
            />
          ))}
        </Svg>
      );
    case 'waves':
      return (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {[0.72, 0.8, 0.88, 0.96].map((f, i) => {
            const y = height * f;
            const a = 10 + i * 4;
            const d = `M0 ${y} C ${width * 0.25} ${y - a} ${width * 0.25} ${y + a} ${width * 0.5} ${y} S ${width * 0.75} ${y - a} ${width} ${y}`;
            return <Path key={f} d={d} fill="none" stroke={room.line} strokeOpacity={0.18 + i * 0.06} strokeWidth={1.4} />;
          })}
        </Svg>
      );
  }
}

/** The room behind the table: a gradient and the room's decoration. Fills its parent. */
export function RoomBackdrop({ room }: { room: RoomStyle }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <LinearGradient colors={[room.top, room.bottom]} style={StyleSheet.absoluteFill} />
      <Decor room={room} width={size.w} height={size.h} />
    </View>
  );
}
