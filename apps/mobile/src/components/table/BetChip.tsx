import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { formatChips } from '@/lib/format';
import { useTableLook } from '@/looks/LookProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** A chip in the current look's chip style. */
export function ChipIcon({ size = 16 }: { size?: number }) {
  const { chips } = useTableLook();
  const { main, edge, pattern } = chips;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10.5} fill={main} />
      {pattern === 'dashed' ? (
        <>
          <Circle cx={12} cy={12} r={6.5} fill="none" stroke={edge} strokeWidth={1.6} strokeDasharray="3 2.2" />
          <Path d="M12 1.5v3.2M12 19.3v3.2M1.5 12h3.2M19.3 12h3.2" stroke={edge} strokeWidth={2} />
        </>
      ) : pattern === 'solid' ? (
        <Circle cx={12} cy={12} r={6.5} fill="none" stroke={edge} strokeWidth={2} />
      ) : (
        <>
          <Circle cx={12} cy={12} r={6.2} fill="none" stroke={edge} strokeWidth={1.4} />
          <Path
            d="M12 1.5v3.4M12 19.1v3.4M1.5 12h3.4M19.1 12h3.4M4.6 4.6l2.4 2.4M17 17l2.4 2.4M4.6 19.4L7 17M17 7l2.4-2.4"
            stroke={edge}
            strokeWidth={2.6}
          />
        </>
      )}
    </Svg>
  );
}

/** Chips a player has in front of them on the current street; `color` marks whose they are. */
export function BetChip({ amount, color }: { amount: number; color?: string }) {
  const { colors } = useTheme();
  const { chips } = useTableLook();
  const chip = color ?? chips.main;
  return (
    <View style={[styles.wrap, { backgroundColor: withAlpha(colors.bg, 0.75), borderColor: withAlpha(chip, 0.5) }]}>
      <ChipIcon />
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
