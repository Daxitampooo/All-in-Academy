import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha, type ColorKey } from '@/theme/tokens';

export type BadgeTone = 'muted' | 'cyan' | 'magenta' | 'lime' | 'amber';

const toneColor: Record<BadgeTone, ColorKey> = {
  muted: 'textMuted',
  cyan: 'cyan',
  magenta: 'magenta',
  lime: 'lime',
  amber: 'amber',
};

export function Badge({ label, tone = 'muted' }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const color = colors[toneColor[tone]];

  return (
    <View
      style={[
        styles.badge,
        { borderColor: withAlpha(color, 0.55), backgroundColor: withAlpha(color, 0.1) },
      ]}>
      <AppText variant="caption" strong style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
  },
});
