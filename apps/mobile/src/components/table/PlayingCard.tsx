import { RANKS, rankOf, suitOf, type Card } from '@pokerall/poker-engine';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/AppText';
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

export function PlayingCard({ card, size = 'md', highlight = false, dim = false }: Props) {
  const { colors } = useTheme();
  const s = SIZES[size];

  if (card === null) {
    return (
      <View style={{ width: s.w, height: s.h }} accessibilityLabel="Card">
        <Svg width={s.w} height={s.h} viewBox={`0 0 ${s.w} ${s.h}`}>
          <Rect x={0.75} y={0.75} width={s.w - 1.5} height={s.h - 1.5} rx={s.corner} fill={colors.surfaceRaised} stroke={withAlpha(colors.cyan, 0.7)} strokeWidth={1.5} />
          <Rect x={4} y={4} width={s.w - 8} height={s.h - 8} rx={s.corner - 2} fill="none" stroke={withAlpha(colors.magenta, 0.45)} strokeWidth={1} />
          <Path
            d={`M${s.w / 2} ${s.h * 0.28} L${s.w * 0.68} ${s.h / 2} L${s.w / 2} ${s.h * 0.72} L${s.w * 0.32} ${s.h / 2} Z`}
            fill="none"
            stroke={withAlpha(colors.cyan, 0.6)}
            strokeWidth={1.2}
          />
        </Svg>
      </View>
    );
  }

  const suit = suitOf(card);
  const red = suit === 1 || suit === 2;
  const ink = red ? colors.cardRed : colors.cardInk;
  const rank = RANKS[rankOf(card)]!;

  return (
    <View
      accessibilityLabel={`${rank === 'T' ? '10' : rank} ${SUIT_NAMES[suit]}`}
      style={[
        styles.face,
        {
          width: s.w,
          height: s.h,
          borderRadius: s.corner,
          backgroundColor: colors.cardFace,
          borderColor: highlight ? colors.lime : colors.glow > 0 ? colors.cardFace : colors.border,
          transform: [{ translateY: highlight ? -6 : 0 }],
          opacity: dim ? 0.45 : 1,
          boxShadow: highlight && colors.glow > 0 ? `0 0 14px ${withAlpha(colors.lime, 0.7)}` : undefined,
        },
      ]}>
      <AppText variant="heading" style={[styles.rank, { color: ink, fontSize: s.rank, lineHeight: s.rank * 1.1 }]}>
        {rank === 'T' ? '10' : rank}
      </AppText>
      <View style={styles.suit}>
        <SuitShape suit={suit} color={ink} size={s.suit} />
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
