import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  /** Filled neon for the main action, outlined for the others. */
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  /** Small second line under the label. */
  hint?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ label, onPress, kind = 'primary', disabled = false, hint, style, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const accent = kind === 'danger' ? colors.magenta : colors.cyan;
  const filled = kind === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint ?? hint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        filled
          ? {
              backgroundColor: accent,
              borderColor: accent,
              boxShadow: colors.glow > 0 && !disabled ? `0 0 18px ${withAlpha(accent, 0.45)}` : undefined,
            }
          : { backgroundColor: pressed ? withAlpha(accent, 0.12) : 'transparent', borderColor: withAlpha(accent, 0.7) },
        disabled && styles.disabled,
        pressed && filled && { opacity: 0.85 },
        style,
      ]}>
      <View style={styles.texts}>
        <AppText variant="heading" style={{ color: filled ? colors.onAccent : accent, textAlign: 'center' }}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" style={{ color: filled ? withAlpha(colors.onAccent, 0.75) : colors.textMuted, textAlign: 'center' }}>
            {hint}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    alignItems: 'center',
    gap: space.xxs,
  },
  disabled: {
    opacity: 0.4,
  },
});
