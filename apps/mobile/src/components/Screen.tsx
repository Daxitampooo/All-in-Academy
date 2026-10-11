import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, space } from '@/theme/tokens';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** Rendered above the title, e.g. a back button. */
  header?: ReactNode;
  children: ReactNode;
};

/** Scrollable page with safe-area padding and a centered content column. */
export function Screen({ title, subtitle, header, children }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.column}>
        {header}
        {title ? (
          <View style={styles.titleBlock}>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? (
              <AppText tone="muted" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
        ) : null}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: maxContentWidth,
    gap: space.lg,
  },
  titleBlock: {
    gap: space.sm,
    marginBottom: space.xs,
  },
  subtitle: {
    maxWidth: 420,
  },
});
