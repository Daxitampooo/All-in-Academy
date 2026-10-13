import { useId, type ReactNode } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { FaceDrawing } from '@/components/FacePortrait';
import type { AvatarSpec } from '@/profile/avatar';
import { useTheme } from '@/theme/ThemeProvider';

const BADGE_ICONS: Record<string, string> = {
  star: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9Z',
  spade:
    'M12 2.6c-2.7 3.4-7.8 6.4-7.8 10.5 0 2.4 1.9 4.2 4.3 4.2 1.2 0 2.2-.5 2.8-1.2-.2 1.9-1 3.4-2.5 4.7h6.4c-1.5-1.3-2.3-2.8-2.5-4.7.6.7 1.6 1.2 2.8 1.2 2.4 0 4.3-1.8 4.3-4.2 0-4.1-5.1-7.1-7.8-10.5Z',
  heart:
    'M12 21S3.2 15.2 3.2 9.1C3.2 6.1 5.5 3.8 8.4 3.8c1.6 0 2.8.7 3.6 1.9.8-1.2 2-1.9 3.6-1.9 2.9 0 5.2 2.3 5.2 5.3C20.8 15.2 12 21 12 21Z',
  flame: 'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5.2.2 1.7 1 2.7 2 3.2C11 8.5 11.2 5 12 2Z',
  bolt: 'M13.5 2 4.5 13.5h6L9.5 22l9-11.5h-6Z',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-1.8 10H4.8Z',
  diamond: 'M12 2.2 19.6 12 12 21.8 4.4 12Z',
};

/** Fixed star positions for the "stars" background. */
const STAR_DOTS = [
  [22, 24], [70, 18], [80, 40], [16, 52], [34, 12], [60, 30], [86, 62], [12, 76], [44, 22], [74, 80], [26, 88], [58, 10],
];

function Background({ id, spec, ink, surface }: { id: string; spec: AvatarSpec; ink: string; surface: string }) {
  const gradient = (from: string, to: string) => (
    <>
      <Defs>
        <LinearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill={`url(#bg-${id})`} />
    </>
  );
  switch (spec.background) {
    case 'dusk':
      return gradient('#1E0A33', '#5A0F4A');
    case 'ocean':
      return gradient('#03182A', '#0B4F6C');
    case 'gold':
      return gradient('#2A1E04', '#6E5010');
    case 'grid':
      return (
        <>
          <Rect x={0} y={0} width={100} height={100} fill={surface} />
          {[20, 40, 60, 80].map((v) => (
            <G key={v} stroke={ink} strokeOpacity={0.18} strokeWidth={0.8}>
              <Line x1={v} y1={0} x2={v} y2={100} />
              <Line x1={0} y1={v} x2={100} y2={v} />
            </G>
          ))}
        </>
      );
    case 'stars':
      return (
        <>
          <Rect x={0} y={0} width={100} height={100} fill="#06061A" />
          {STAR_DOTS.map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill="#EDEDF7" opacity={0.7} />
          ))}
        </>
      );
    case 'sunburst':
      return (
        <>
          <Rect x={0} y={0} width={100} height={100} fill="#160C04" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const b = a + Math.PI / 24;
            return (
              <Path
                key={i}
                d={`M50 50 L${50 + 70 * Math.cos(a)} ${50 + 70 * Math.sin(a)} L${50 + 70 * Math.cos(b)} ${50 + 70 * Math.sin(b)} Z`}
                fill={ink}
                opacity={0.14}
              />
            );
          })}
        </>
      );
    default:
      return <Rect x={0} y={0} width={100} height={100} fill={surface} />;
  }
}

function Frame({ id, frame, ink, width }: { id: string; frame: string; ink: string; width: number }) {
  const ring = (extra?: object) => <Circle cx={50} cy={50} r={46} fill="none" stroke={ink} strokeWidth={width} {...extra} />;
  switch (frame) {
    case 'double':
      return (
        <>
          {ring()}
          <Circle cx={50} cy={50} r={41.5} fill="none" stroke={ink} strokeWidth={1} strokeOpacity={0.7} />
        </>
      );
    case 'dashed':
      return ring({ strokeDasharray: '7 4' });
    case 'studs':
      return (
        <>
          {ring()}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <Circle key={i} cx={50 + 46 * Math.cos(a)} cy={50 + 46 * Math.sin(a)} r={2.4} fill={ink} />;
          })}
        </>
      );
    case 'notched':
      return (
        <>
          {ring()}
          <Path d="M50 1v8M50 91v8M1 50h8M91 50h8" stroke={ink} strokeWidth={width + 1} strokeLinecap="round" />
        </>
      );
    case 'crown':
      return (
        <>
          {ring({ stroke: '#FFE066' })}
          <Path d="M36 9 L41 2.5 L45.5 7 L50 0.5 L54.5 7 L59 2.5 L64 9 Z" fill="#FFE066" stroke="#FFE066" strokeWidth={1} strokeLinejoin="round" />
        </>
      );
    case 'prism':
      return (
        <>
          <Defs>
            <LinearGradient id={`prism-${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#00F0FF" />
              <Stop offset="0.5" stopColor="#FF2BD6" />
              <Stop offset="1" stopColor="#B6FF3B" />
            </LinearGradient>
          </Defs>
          <Circle cx={50} cy={50} r={46} fill="none" stroke={`url(#prism-${id})`} strokeWidth={width + 0.8} />
        </>
      );
    default:
      return ring();
  }
}

type Props = {
  avatar: AvatarSpec;
  size?: number;
  /** Stronger glow, e.g. on the player's turn. */
  active?: boolean;
  /** Drawn without glow (the official ranked style keeps avatars calm). */
  calm?: boolean;
};

/** The player's avatar: a neon face on a background, framed, with an optional badge. */
export function PlayerAvatar({ avatar, size = 64, active = false, calm = false }: Props) {
  const { colors, hues } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ink = hues[avatar.outline];
  const glow = calm ? 0 : colors.glow;
  const badge = avatar.badge && BADGE_ICONS[avatar.badge];
  let badgeArt: ReactNode = null;
  if (badge) {
    badgeArt = (
      <G>
        <Circle cx={82} cy={82} r={13} fill={colors.bg} stroke={ink} strokeWidth={2} />
        <G transform="translate(73.6 73.6) scale(0.7)">
          <Path d={badge} fill={avatar.badge === 'crown' ? '#FFE066' : ink} />
        </G>
      </G>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={`clip-${id}`}>
          <Circle cx={50} cy={50} r={45} />
        </ClipPath>
      </Defs>
      {glow > 0 ? <Circle cx={50} cy={50} r={46} stroke={ink} strokeOpacity={(active ? 0.35 : 0.16) * glow} strokeWidth={active ? 9 : 7} fill="none" /> : null}
      <G clipPath={`url(#clip-${id})`}>
        <Background id={id} spec={avatar} ink={ink} surface={colors.surfaceRaised} />
        <G stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <FaceDrawing spec={avatar.face} ink={ink} detail={colors.text} />
        </G>
      </G>
      <Frame id={id} frame={avatar.frame} ink={ink} width={active ? 3.2 : 2.6} />
      {badgeArt}
    </Svg>
  );
}
