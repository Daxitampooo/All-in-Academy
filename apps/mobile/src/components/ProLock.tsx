import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { LockIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** Shown instead of a Pro tool to players without Pro: what the tool does and that it is part of Pro. */
export function ProLock({ what }: { what: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { borderColor: withAlpha(colors.amber, 0.6), backgroundColor: withAlpha(colors.amber, 0.08) }]}>
      <View style={styles.head}>
        <LockIcon color={colors.amber} size={20} />
        <AppText variant="heading" tone="amber">
          {t('tools.proTitle')}
        </AppText>
      </View>
      <AppText>{what}</AppText>
      <AppText variant="caption" tone="muted">
        {t('tools.proBody')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
