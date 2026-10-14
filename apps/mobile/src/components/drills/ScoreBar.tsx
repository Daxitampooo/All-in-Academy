import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export type Score = { right: number; total: number; streak: number };

export const EMPTY_SCORE: Score = { right: 0, total: 0, streak: 0 };

export function addAnswer(score: Score, right: boolean): Score {
  return { right: score.right + (right ? 1 : 0), total: score.total + 1, streak: right ? score.streak + 1 : 0 };
}

/** Right answers this session, and the current streak. */
export function ScoreBar({ score, extra }: { score: Score; extra?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <AppText variant="label" strong numeric>
        {t('drills.score', { right: score.right, total: score.total })}
      </AppText>
      <AppText variant="label" tone={score.streak >= 3 ? 'lime' : 'muted'} numeric>
        {t('drills.streak', { n: score.streak })}
      </AppText>
      {extra ? (
        <AppText variant="caption" tone="muted" numeric style={styles.extra}>
          {extra}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  extra: {
    marginLeft: 'auto',
  },
});
