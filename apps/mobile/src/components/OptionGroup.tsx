import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { CheckIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type OptionGroupProps<T extends string> = {
  title: string;
  /** Small text under the title. */
  hint?: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
};

/** A titled list of choices where exactly one is picked (language, theme, privacy). */
export function OptionGroup<T extends string>({ title, hint, options, selected, onSelect, disabled }: OptionGroupProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={title}>
      <AppText variant="heading">{title}</AppText>
      {hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
      <View style={[styles.options, { backgroundColor: colors.surface, borderColor: colors.border }, disabled && styles.disabled]}>
        {options.map((option, i) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              style={({ pressed }) => [
                styles.option,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                pressed && { backgroundColor: colors.surfaceRaised },
              ]}>
              <AppText tone={isSelected ? 'cyan' : 'text'} strong={isSelected} style={styles.optionLabel}>
                {option.label}
              </AppText>
              {isSelected ? <CheckIcon color={colors.cyan} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.sm,
  },
  options: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space.lg,
  },
  optionLabel: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});
