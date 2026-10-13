import { RANKS, rankOf, suitOf, type Card } from '@pokerall/poker-engine';
import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import type { BackStyle } from '@/looks/catalog';
import { useTableLook } from '@/looks/LookProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { withAlpha } from '@/theme/tokens';

export type CardSize = 'sm' | 'md' | 'lg';

const SIZES: Record<CardSize, { w: number; h: number; rank: number; suit: number; corner: number }> = {
  sm: { w: 30, h: 42, rank: 13, suit: 12, corner: 5 },
  md: { w: 42, h: 59, rank: 17, suit: 17, corner: 6 },
  lg: { w: 54, h: 76, rank: 22, suit: 22, corner: 7 },
};

const SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades'] as const;

export function SuitShape({ suit, color, size }: { suit: number; color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {suit === 0 ? (
        <G fill={color}>
          <Circle cx={12} cy={7.6} r={4} />
          <Circle cx={7.2} cy={13.4} r={4} />
          <Circle cx={16.8} cy={13.4} r={4} />
          <Path d="M12 11 L9.4 21 H14.6 Z" />
        </G>
      ) : suit === 1 ? (
        <Path d="M12 2.2 19.6 12 12 21.8 4.4 12Z" fill={color} />
      ) : suit === 2 ? (
        <Path
          d="M12 21S3.2 15.2 3.2 9.1C3.2 6.1 5.5 3.8 8.4 3.8c1.6 0 2.8.7 3.6 1.9.8-1.2 2-1.9 3.6-1.9 2.9 0 5.2 2.3 5.2 5.3C20.8 15.2 12 21 12 21Z"
          fill={color}
        />
      ) : (
        <Path
          d="M12 2.6c-2.7 3.4-7.8 6.4-7.8 10.5 0 2.4 1.9 4.2 4.3 4.2 1.2 0 2.2-.5 2.8-1.2-.2 1.9-1 3.4-2.5 4.7h6.4c-1.5-1.3-2.3-2.8-2.5-4.7.6.7 1.6 1.2 2.8 1.2 2.4 0 4.3-1.8 4.3-4.2 0-4.1-5.1-7.1-7.8-10.5Z"
          fill={color}
        />
      )}
    </Svg>
  );
}

type Props = {
  /** null draws the back of the card. */
  card: Card | null;
  size?: CardSize;
  /** Part of the winning hand: lifted and outlined. */
  highlight?: boolean;
  /** Not part of the winning hand at showdown. */
  dim?: boolean;
};

const CLUB_PATH =
  'M12 2.5a4 4 0 0 0-3.6 5.7 4 4 0 1 0 2.9 6.9L9.4 21h5.2l-1.9-5.9a4 4 0 1 0 2.9-6.9A4 4 0 0 0 12 2.5Z';

/** The back of a card in the current look. */
function CardBack({ w, h, corner, back }: { w: number; h: number; corner: number; back: BackStyle }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const inner = { x: 4, y: 4, width: w - 8, height: h - 8, rx: Math.max(1, corner - 2) };
  const diamond = `M${w / 2} ${h * 0.28} L${w * 0.68} ${h / 2} L${w / 2} ${h * 0.72} L${w * 0.32} ${h / 2} Z`;
  let art: ReactNode = null;
  switch (back.pattern) {
    case 'neon':
      art = (
        <>
          <Rect {...inner} fill="none" stroke={withAlpha(back.accent, 0.45)} strokeWidth={1} />
          <Path d={diamond} fill="none" stroke={withAlpha(back.line, 0.6)} strokeWidth={1.2} />
        </>
      );
      break;
    case 'lattice':
      art = (
        <>
          <Defs>
            <Pattern id={`lat-${id}`} width={5} height={5} patternUnits="userSpaceOnUse">
              <Path d="M0 0L5 5M5 0L0 5" stroke={back.accent} strokeOpacity={0.55} strokeWidth={0.7} />
            </Pattern>
          </Defs>
          <Rect {...inner} fill={`url(#lat-${id})`} stroke={back.line} strokeWidth={1} />
        </>
      );
      break;
    case 'stripes':
      art = (
        <>
          <Defs>
            <Pattern id={`str-${id}`} width={6} height={6} patternUnits="userSpaceOnUse">
              <Path d="M0 6L6 0" stroke={back.line} strokeOpacity={0.7} strokeWidth={1.6} />
            </Pattern>
          </Defs>
          <Rect {...inner} fill={`url(#str-${id})`} stroke={back.accent} strokeWidth={1} />
        </>
      );
      break;
    case 'club': {
      const size = Math.min(w, h) * 0.55;
      art = (
        <>
          <Rect {...inner} fill="none" stroke={withAlpha(back.accent, 0.5)} strokeWidth={1} />
          <G transform={`translate(${(w - size) / 2} ${(h - size) / 2}) scale(${size / 24})`}>
            <Path d={CLUB_PATH} fill="none" stroke={back.line} strokeWidth={1.6} />
          </G>
        </>
      );
      break;
    }
    case 'holo':
      art = (
        <>
          <Defs>
            <LinearGradient id={`holo-${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={back.line} stopOpacity={0.55} />
              <Stop offset="0.5" stopColor="#A97BFF" stopOpacity={0.35} />
              <Stop offset="1" stopColor={back.accent} stopOpacity={0.55} />
            </LinearGradient>
          </Defs>
          <Rect {...inner} fill={`url(#holo-${id})`} />
          <Path d={diamond} fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.2} />
        </>
      );
      break;
  }
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={corner} fill={back.base} stroke={withAlpha(back.line, 0.7)} strokeWidth={1.5} />
      {art}
    </Svg>
  );
}

export function PlayingCard({ card, size = 'md', highlight = false, dim = false }: Props) {
  const { colors } = useTheme();
  const look = useTableLook();
  const s = SIZES[size];

  if (card === null) {
    return (
      <View style={{ width: s.w, height: s.h }} accessibilityLabel="Card">
        <CardBack w={s.w} h={s.h} corner={s.corner} back={look.back} />
      </View>
    );
  }

  const suit = suitOf(card);
  const { deck } = look;
  const ink = look.suits[suit]!;
  const rank = RANKS[rankOf(card)]!;
  const large = deck.large;
  const rankSize = large ? Math.round(s.rank * 1.3) : s.rank;
  const suitSize = large ? Math.round(s.suit * 1.3) : s.suit;
  const glow = colors.glow > 0;

  return (
    <View
      accessibilityLabel={`${rank === 'T' ? '10' : rank} ${SUIT_NAMES[suit]}`}
      style={[
        styles.face,
        {
          width: s.w,
          height: s.h,
          borderRadius: s.corner,
          backgroundColor: deck.face,
          borderColor: highlight ? colors.lime : deck.outline ? ink : deck.border,
          transform: [{ translateY: highlight ? -6 : 0 }],
          opacity: dim ? 0.45 : 1,
          boxShadow:
            highlight && glow
              ? `0 0 14px ${withAlpha(colors.lime, 0.7)}`
              : deck.outline && glow
                ? `0 0 8px ${withAlpha(ink, 0.6)}`
                : undefined,
        },
      ]}>
      <AppText
        variant="heading"
        style={[styles.rank, { color: ink, fontSize: rankSize, lineHeight: rankSize * 1.1, letterSpacing: rank === 'T' && large ? -1.5 : -0.5 }]}>
        {rank === 'T' ? '10' : rank}
      </AppText>
      <View style={styles.suit}>
        <SuitShape suit={suit} color={ink} size={suitSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    borderWidth: 2,
    paddingHorizontal: 3,
    paddingTop: 2,
    overflow: 'hidden',
  },
  rank: {
    letterSpacing: -0.5,
  },
  suit: {
    position: 'absolute',
    right: 3,
    bottom: 3,
  },
});
