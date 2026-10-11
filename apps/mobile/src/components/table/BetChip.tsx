import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { formatChips } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

export function ChipIcon({ color, size = 16 }: { color: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10.5} fill={color} />
      <Circle cx={12} cy={12} r={6.5} fill="none" stroke={colors.cardFace} strokeWidth={1.6} strokeDasharray="3 2.2" />
      <Path d="M12 1.5v3.2M12 19.3v3.2M1.5 12h3.2M19.3 12h3.2" stroke={colors.cardFace} strokeWidth={2} />
    </Svg>
  );
}

/** Chips a player has in front of them on the current street. */
export function BetChip({ amount, color }: { amount: number; color?: string }) {
  const { colors } = useTheme();
  const chip = color ?? colors.amber;
  return (
    <View style={[styles.wrap, { backgroundColor: withAlpha(colors.bg, 0.75), borderColor: withAlpha(chip, 0.5) }]}>
      <ChipIcon color={chip} />
      <AppText variant="caption" strong numeric>
        {formatChips(amount)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingLeft: 3,
    paddingRight: space.sm,
    paddingVertical: 2,
  },
});
