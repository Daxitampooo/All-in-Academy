import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { ChevronLeftIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Goes back, or to `fallback` when the screen was opened directly (e.g. a web link). */
export function BackButton({ label, fallback }: { label: string; fallback: Href }) {
  const { colors } = useTheme();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallback));

  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
      <ChevronLeftIcon color={colors.cyan} />
      <AppText variant="label" tone="cyan">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xxs,
    marginLeft: -space.xs,
  },
});
