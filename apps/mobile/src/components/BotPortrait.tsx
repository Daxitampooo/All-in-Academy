import { useId, type ReactNode } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Text as SvgText } from 'react-native-svg';

import type { PortraitKind } from '@/bots/catalog';
import { FaceDrawing, type FaceSpec } from '@/components/FacePortrait';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

type Props = {
  /** A drawing of its own, or a face put together from parts. */
  kind: PortraitKind | FaceSpec;
  /** Bot color: ring and main lines. */
  color: string;
  size?: number;
  /** Dimmed, for bots that are locked or not ready yet. */
  muted?: boolean;
  /** Stronger glow, e.g. when it's this bot's turn. */
  active?: boolean;
};

/** Neon line-art portrait of a bot inside a glowing ring (100×100 drawing). */
export function BotPortrait({ kind, color, size = 64, muted = false, active = false }: Props) {
  const { colors } = useTheme();
  const glow = colors.glow;
  const ink = muted ? colors.textMuted : color;
  const detail = muted ? colors.border : colors.text;
  // Unique per portrait on screen; colons from useId aren't safe inside url(#…).
  const clipId = `clip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={muted ? 0.55 : 1}>
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={50} cy={50} r={45} />
        </ClipPath>
      </Defs>
      {glow > 0 && !muted ? (
        <Circle cx={50} cy={50} r={46} stroke={ink} strokeOpacity={(active ? 0.35 : 0.16) * glow} strokeWidth={active ? 9 : 7} fill="none" />
      ) : null}
      <Circle cx={50} cy={50} r={46} fill={colors.surfaceRaised} stroke={ink} strokeWidth={active ? 3.2 : 2.4} />
      <G clipPath={`url(#${clipId})`} stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {typeof kind === 'string' ? (
          drawings[kind]({ ink, detail, text: colors.textMuted })
        ) : (
          <FaceDrawing spec={kind} ink={ink} detail={detail} />
        )}
      </G>
    </Svg>
  );
}

type Ink = { ink: string; detail: string; text: string };

const shoulders = 'M20 102 C23 82 36 74 50 74 C64 74 77 82 80 102';

const drawings: Record<PortraitKind, (c: Ink) => ReactNode> = {
  cat: ({ ink, detail }) => (
    <>
      <Path d="M24 102 C26 82 38 72 50 72 C62 72 74 82 76 102" />
      <Circle cx={50} cy={74.5} r={2.8} stroke={detail} strokeWidth={1.6} />
      <Path d="M29 46 L31 17 L45 29 Q50 27.5 55 29 L69 17 L71 46 Q71 66 50 67 Q29 66 29 46 Z" />
      <Path d="M34 24 L35.5 31" stroke={detail} strokeWidth={1.4} />
      <Path d="M66 24 L64.5 31" stroke={detail} strokeWidth={1.4} />
      <Path d="M36.5 45 Q41 40.5 45.5 45 Q41 49.5 36.5 45 Z" />
      <Path d="M54.5 45 Q59 40.5 63.5 45 Q59 49.5 54.5 45 Z" />
      <Line x1={41} y1={42.5} x2={41} y2={47.5} stroke={detail} strokeWidth={1.8} />
      <Line x1={59} y1={42.5} x2={59} y2={47.5} stroke={detail} strokeWidth={1.8} />
      <Path d="M47.5 52.5 L52.5 52.5 L50 55 Z" fill={ink} />
      <Path d="M50 55 Q47.5 58.5 44.5 57" />
      <Path d="M50 55 Q52.5 58.5 55.5 57" />
      <Path d="M36 54 L21 51 M36 57 L21 58.5 M64 54 L79 51 M64 57 L79 58.5" stroke={detail} strokeWidth={1.3} />
    </>
  ),
  rookie: ({ ink, detail }) => (
    <>
      <Path d={shoulders} />
      <Path d="M47 75 L46 88 M53 75 L54 88" stroke={detail} strokeWidth={1.5} />
      <Ellipse cx={50} cy={48} rx={18} ry={20} />
      <Path d="M31.5 41 Q32 23 50 23 Q68 23 68.5 41 Z" fill={ink} fillOpacity={0.12} />
      <Path d="M64 41 Q77 40 84 45" />
      <Circle cx={50} cy={24.5} r={1.6} fill={ink} />
      <Path d="M39.5 44 Q43 41.5 46.5 43.5 M53.5 43.5 Q57 41.5 60.5 44" stroke={detail} strokeWidth={1.5} />
      <Circle cx={43} cy={49} r={3} />
      <Circle cx={57} cy={49} r={3} />
      <Circle cx={43.6} cy={48.4} r={0.9} fill={detail} stroke="none" />
      <Circle cx={57.6} cy={48.4} r={0.9} fill={detail} stroke="none" />
      <Path d="M43 58 Q50 64.5 57 58 Q50 60.5 43 58 Z" fill={ink} fillOpacity={0.2} />
      <G fill={detail} stroke="none">
        <Circle cx={37} cy={55} r={0.9} />
        <Circle cx={39.5} cy={56.5} r={0.9} />
        <Circle cx={36.5} cy={57.8} r={0.9} />
        <Circle cx={63} cy={55} r={0.9} />
        <Circle cx={60.5} cy={56.5} r={0.9} />
        <Circle cx={63.5} cy={57.8} r={0.9} />
      </G>
    </>
  ),
  station: ({ ink, detail }) => (
    <>
      <Path d="M18 102 C21 83 33 75 50 75 C67 75 79 83 82 102" />
      <Path d="M43 75 L50 84 L57 75" stroke={detail} strokeWidth={1.6} />
      <Path d="M50 84 L50 102" stroke={detail} strokeWidth={1.4} />
      <Path d="M27 86 L33 102 M31 83 L37 101 M73 86 L67 102 M69 83 L63 101" stroke={detail} strokeWidth={1.4} />
      <Path d="M32 36 Q32 24 50 24 Q68 24 68 36 L68 52 Q68 67 50 68 Q32 67 32 52 Z" />
      <Path d="M33.5 32 Q50 25.5 66.5 32" stroke={detail} strokeWidth={1.4} strokeDasharray="1.5 2.5" />
      <Path d="M38.5 46.5 Q42.5 49.5 46.5 46.5" />
      <Path d="M53.5 46.5 Q57.5 49.5 61.5 46.5" />
      <Path d="M38.5 44.5 L46.5 45 M53.5 45 L61.5 44.5" stroke={detail} strokeWidth={1.3} />
      <Path d="M40.5 57 Q45 52.5 50 55.5 Q55 52.5 59.5 57 Q55 55.5 50 57.5 Q45 55.5 40.5 57 Z" fill={ink} fillOpacity={0.85} />
      <Path d="M46 61.5 L54 61.5" stroke={detail} strokeWidth={1.4} />
    </>
  ),
  limper: ({ ink, detail }) => (
    <>
      <Path d={shoulders} />
      <Circle cx={50} cy={50} r={19} />
      <Path d="M30.5 43 Q30 21 50 21 Q70 21 69.5 43 Z" fill={ink} fillOpacity={0.12} />
      <Path d="M30 43 L70 43" strokeWidth={3.2} />
      <Path d="M36 27 L36 42 M43 23.5 L43 42 M50 22 L50 42 M57 23.5 L57 42 M64 27 L64 42" stroke={detail} strokeWidth={1.1} />
      <Circle cx={50} cy={17} r={4} fill={ink} fillOpacity={0.3} />
      <Circle cx={44} cy={51} r={1.7} fill={detail} stroke="none" />
      <Circle cx={56} cy={51} r={1.7} fill={detail} stroke="none" />
      <Path d="M44 58.5 Q50 62.5 56 58.5" />
      <G fill={detail} stroke="none">
        <Circle cx={44} cy={64} r={0.8} />
        <Circle cx={47} cy={65.5} r={0.8} />
        <Circle cx={50} cy={66} r={0.8} />
        <Circle cx={53} cy={65.5} r={0.8} />
        <Circle cx={56} cy={64} r={0.8} />
      </G>
    </>
  ),
  granny: ({ ink, detail }) => (
    <>
      <Path d={shoulders} />
      <Path d="M36 77 Q50 92 64 77" stroke={detail} strokeWidth={1.5} />
      <Circle cx={50} cy={20} r={6.5} fill={ink} fillOpacity={0.15} />
      <Ellipse cx={50} cy={48} rx={17.5} ry={20} />
      <Path d="M32.5 44 Q31 26 50 27 Q69 26 67.5 44" />
      <Path d="M37 32 Q44 36 50 28 Q56 36 63 32" stroke={detail} strokeWidth={1.3} />
      <Circle cx={42.5} cy={48} r={5.5} />
      <Circle cx={57.5} cy={48} r={5.5} />
      <Path d="M48 48 L52 48" />
      <Circle cx={42.5} cy={48.5} r={1.3} fill={detail} stroke="none" />
      <Circle cx={57.5} cy={48.5} r={1.3} fill={detail} stroke="none" />
      <Path d="M45 59 Q50 61.5 55 59" stroke={detail} strokeWidth={1.6} />
      <Circle cx={32} cy={55} r={2} fill={ink} />
      <Circle cx={68} cy={55} r={2} fill={ink} />
    </>
  ),
  fish: ({ ink, detail }) => (
    <>
      <Path d={shoulders} />
      <Path d="M31 47 Q27 21 50 21 Q73 21 69 47 L72 78 M31 47 L28 78" />
      <Ellipse cx={50} cy={48} rx={16.5} ry={19} />
      <Path d="M34 36 Q42 41 49 32 Q57 40 66 36" stroke={detail} strokeWidth={1.4} />
      <Circle cx={43.5} cy={49} r={3.4} />
      <Circle cx={56.5} cy={49} r={3.4} />
      <Circle cx={44.1} cy={48.3} r={1} fill={detail} stroke="none" />
      <Circle cx={57.1} cy={48.3} r={1} fill={detail} stroke="none" />
      <Path d="M39.5 45 L38 43 M42 44.2 L41.5 41.8 M60.5 45 L62 43 M58 44.2 L58.5 41.8" stroke={detail} strokeWidth={1.2} />
      <Path d="M44 57.5 Q50 62.5 56 57.5" />
      <Path d="M58 27.5 Q63 22.5 68 27.5 Q63 32.5 58 27.5 Z M68 27.5 L72 24 L72 31 Z" fill={ink} fillOpacity={0.35} strokeWidth={1.6} />
      <Circle cx={61} cy={27.2} r={0.8} fill={detail} stroke="none" />
    </>
  ),
  unknown: ({ text }) => (
    <>
      <Path d={shoulders} fill={text} fillOpacity={0.12} />
      <Ellipse cx={50} cy={47} rx={17} ry={20} fill={text} fillOpacity={0.12} />
      <SvgText
        x={50}
        y={56}
        fill={text}
        stroke="none"
        fontSize={24}
        fontFamily={fonts.display}
        textAnchor="middle">
        ?
      </SvgText>
    </>
  ),
};
