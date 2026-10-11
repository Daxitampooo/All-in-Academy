import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const W = 340;
const H = 210;

// Six seats around a 6-max table; index 0 is the player's own seat.
const seats = [
  { x: 170, y: 188 },
  { x: 72, y: 168 },
  { x: 72, y: 42 },
  { x: 170, y: 22 },
  { x: 268, y: 42 },
  { x: 268, y: 168 },
];

const flop = [
  { rank: 'A', suit: '♠', red: false },
  { rank: 'K', suit: '♥', red: true },
  { rank: '7', suit: '♦', red: true },
];

const CARD_W = 28;
const CARD_H = 38;
const CARD_GAP = 6;

/** Decorative 6-max table drawn with neon outlines. */
export function NeonTable() {
  const { colors } = useTheme();
  const glow = colors.glow;
  const cardsX = W / 2 - (CARD_W * 3 + CARD_GAP * 2) / 2;
  const cardsY = 86;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Poker table">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* Rim: wide faint strokes under a thin bright one read as a neon tube. */}
        {glow > 0 ? (
          <G>
            <Rect x={34} y={40} width={272} height={132} rx={66} stroke={colors.cyan} strokeOpacity={0.07 * glow} strokeWidth={18} fill="none" />
            <Rect x={34} y={40} width={272} height={132} rx={66} stroke={colors.cyan} strokeOpacity={0.16 * glow} strokeWidth={8} fill="none" />
          </G>
        ) : null}
        <Rect x={34} y={40} width={272} height={132} rx={66} stroke={colors.cyan} strokeWidth={3} fill={colors.felt} />
        <Rect x={50} y={54} width={240} height={104} rx={52} stroke={colors.magenta} strokeOpacity={0.4} strokeWidth={1.2} fill="none" />

        {flop.map((card, i) => {
          const x = cardsX + i * (CARD_W + CARD_GAP);
          const ink = card.red ? colors.cardRed : colors.cardInk;
          return (
            <G key={card.rank + card.suit}>
              <Rect x={x} y={cardsY} width={CARD_W} height={CARD_H} rx={4} fill={colors.cardFace} stroke={colors.border} strokeWidth={glow > 0 ? 0 : 1} />
              <SvgText x={x + 6} y={cardsY + 15} fill={ink} fontSize={13} fontFamily={fonts.display}>
                {card.rank}
              </SvgText>
              <SvgText x={x + CARD_W - 7} y={cardsY + CARD_H - 6} fill={ink} fontSize={14} textAnchor="end">
                {card.suit}
              </SvgText>
            </G>
          );
        })}

        {seats.map((seat, i) => {
          const isHero = i === 0;
          return (
            <G key={`${seat.x}-${seat.y}`}>
              {isHero && glow > 0 ? (
                <Circle cx={seat.x} cy={seat.y} r={17} fill={colors.cyan} fillOpacity={0.18 * glow} />
              ) : null}
              <Circle
                cx={seat.x}
                cy={seat.y}
                r={11}
                fill={isHero ? colors.cyan : colors.surfaceRaised}
                stroke={isHero ? colors.cyan : colors.border}
                strokeWidth={1.5}
              />
            </G>
          );
        })}

        {/* Dealer button next to the player's seat. */}
        <Circle cx={198} cy={160} r={7} fill={colors.amber} />
        <SvgText x={198} y={163.5} fill={colors.onAccent} fontSize={9} fontFamily={fonts.display} textAnchor="middle">
          D
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: W / H,
  },
});
