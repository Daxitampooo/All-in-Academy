import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Props<T extends string | number> = {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of small choices, one picked (number of players, seat, ante). */
export function Chips<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.chip,
                { borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? withAlpha(colors.cyan, 0.14) : colors.surface },
              ]}>
              <AppText variant="label" strong={active} tone={active ? 'cyan' : 'text'} numeric>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  chip: {
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
