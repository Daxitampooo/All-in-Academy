import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** A setting that is on or off: title, optional hint, and a switch. The whole row is the control. */
export function ToggleRow({ title, hint, value, onChange }: { title: string; hint?: string; value: boolean; onChange: (on: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      accessibilityHint={hint}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceRaised : colors.surface, borderColor: colors.border },
      ]}>
      <View style={styles.texts}>
        <AppText strong>{title}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.track,
          {
            backgroundColor: value ? withAlpha(colors.cyan, 0.3) : colors.surfaceRaised,
            borderColor: value ? colors.cyan : colors.border,
          },
        ]}>
        <View
          style={[
            styles.knob,
            {
              backgroundColor: value ? colors.cyan : colors.textMuted,
              transform: [{ translateX: value ? 20 : 0 }],
              boxShadow: value && colors.glow > 0 ? `0 0 8px ${withAlpha(colors.cyan, 0.8)}` : undefined,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 56,
  },
  texts: {
    flex: 1,
    gap: space.xxs,
  },
  track: {
    width: 46,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    padding: 2,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
  },
});
