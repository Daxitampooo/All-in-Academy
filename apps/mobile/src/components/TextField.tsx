import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the field; red when `error` is set. */
  hint?: string;
  error?: string | null;
};

/** A labeled text input in the app's style. */
export function TextField({ label, hint, error, editable = true, ...input }: Props) {
  const { colors } = useTheme();
  const note = error ?? hint;
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        editable={editable}
        {...input}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            fontFamily: fonts.body,
            borderColor: error ? colors.danger : colors.border,
          },
          !editable && styles.disabled,
        ]}
      />
      {note ? (
        <AppText variant="caption" tone={error ? 'danger' : 'muted'}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    minHeight: 48,
  },
  disabled: {
    opacity: 0.5,
  },
});
