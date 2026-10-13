import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { EyeIcon } from '@/components/icons';
import { formatDecimal } from '@/lib/format';
import type { MatchResult } from '@/table/useTableGame';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Report = NonNullable<MatchResult['training']>;

const signed = (bb: number) => `${bb > 0 ? '+' : ''}${formatDecimal(bb)}`;

/**
 * The end of a match against a training bot: what the bot was doing all along, and the player's result
 * next to what their all-ins were worth.
 */
export function TrainingReveal({ report, bigBlind }: { report: Report; bigBlind: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const real = report.realNet / bigBlind;
  const ev = report.evNet / bigBlind;
  return (
    <View
      style={[styles.box, { borderColor: withAlpha(colors.magenta, 0.55), backgroundColor: withAlpha(colors.magenta, 0.08) }]}
      accessibilityRole="summary">
      <View style={styles.title}>
        <EyeIcon color={colors.magenta} />
        <AppText variant="label" strong tone="magenta">
          {t(`table.training.${report.botId}.title`)}
        </AppText>
      </View>
      <AppText variant="caption">
        {t(`table.training.${report.botId}.reveal`, { count: report.riggedHands })}
      </AppText>
      <View style={styles.numbers}>
        <View style={styles.cell}>
          <AppText variant="caption" tone="muted">
            {t('table.training.real')}
          </AppText>
          <AppText variant="heading" numeric tone={real >= 0 ? 'lime' : 'magenta'}>
            {t('table.training.bb', { bb: signed(real) })}
          </AppText>
        </View>
        <View style={styles.cell}>
          <AppText variant="caption" tone="muted">
            {t('table.training.ev')}
          </AppText>
          <AppText variant="heading" numeric tone={ev >= 0 ? 'lime' : 'magenta'}>
            {t('table.training.bb', { bb: signed(ev) })}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" tone="muted">
        {t('table.training.badBeats', { count: report.badBeats })}
      </AppText>
      <AppText variant="caption">{t(`table.training.${report.botId}.lesson`)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  numbers: {
    flexDirection: 'row',
    gap: space.md,
  },
  cell: {
    flex: 1,
    gap: 2,
  },
});
