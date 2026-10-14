import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
};

/** A number with − and + buttons (stack size in big blinds). */
export function Stepper({ label, value, min, max, step = 1, format, onChange }: Props) {
  const { colors } = useTheme();
  const button = (delta: number, text: string, hint: string) => {
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 100) / 100));
    const disabled = next === value;
    return (
      <Pressable
        onPress={() => onChange(next)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={hint}
        hitSlop={6}
        style={({ pressed }) => [
          styles.button,
          { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface, opacity: disabled ? 0.4 : 1 },
        ]}>
        <AppText variant="title" tone="cyan">
          {text}
        </AppText>
      </Pressable>
    );
  };
  return (
    <View style={styles.wrap} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: format(value) }}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        {button(-step, '−', `${label} −`)}
        <AppText variant="title" numeric style={styles.value}>
          {format(value)}
        </AppText>
        {button(step, '+', `${label} +`)}
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
    alignItems: 'center',
    gap: space.md,
  },
  button: {
    width: 48,
    height: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 80,
    textAlign: 'center',
  },
});
