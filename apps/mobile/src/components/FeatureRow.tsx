import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type ColorKey } from '@/theme/tokens';

export type Accent = 'cyan' | 'magenta' | 'lime' | 'amber';

type FeatureRowProps = {
  title: string;
  body: string;
  /** Color of the strip on the left; it tells which part of the app this belongs to. */
  accent: Accent;
  /** Badges shown under the text (level, availability). */
  badges?: ReactNode;
};

/** A card describing a mode, a lesson track or a drill. */
export function FeatureRow({ title, body, accent, badges }: FeatureRowProps) {
  const { colors } = useTheme();
  const accentColor = colors[accent satisfies ColorKey];

  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${title}. ${body}`}>
      <View style={[styles.strip, { backgroundColor: accentColor }]} />
      <View style={styles.text}>
        <AppText variant="heading">{title}</AppText>
        <AppText tone="muted">{body}</AppText>
        {badges ? <View style={styles.badges}>{badges}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
  },
  text: {
    flex: 1,
    gap: space.xs,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
});
