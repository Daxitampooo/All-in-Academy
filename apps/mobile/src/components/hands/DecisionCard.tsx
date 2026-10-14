import type { DecisionReview, Grade } from '@pokerall/coach';
import { COACH_LESSONS, lessonById } from '@pokerall/content';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { lessonText, useContentLocale } from '@/academy/locale';
import { AppText } from '@/components/AppText';
import { formatDecimal } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha, type ColorKey } from '@/theme/tokens';

export const GRADE_COLOR: Record<Grade, ColorKey> = { good: 'lime', inaccuracy: 'amber', mistake: 'magenta' };

/** Turns the numbers of a review into what the sentences show: percents, big blinds with the locale's decimal mark. */
function textParams(review: DecisionReview): Record<string, string | number> {
  const out: Record<string, string | number> = { ...review.params };
  if (typeof out.loss === 'number') out.loss = formatDecimal(out.loss);
  return out;
}

type Props = {
  review: DecisionReview;
  /** "Flop: Call 300". */
  title: string;
  onShow: () => void;
  selected: boolean;
};

/** One decision of the analysis: the grade, why, what was better, and the lesson that covers it. */
export function DecisionCard({ review, title, onShow, selected }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const color = colors[GRADE_COLOR[review.grade]];
  const params = textParams(review);
  const locale = useContentLocale();
  const lessonId = COACH_LESSONS[review.lesson];
  const lesson = lessonId ? lessonById(lessonId) : undefined;
  return (
    <Pressable
      onPress={onShow}
      accessibilityRole="button"
      accessibilityHint={t('coach.showInReplay')}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? color : colors.border,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        },
      ]}>
      <View style={[styles.strip, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.head}>
          <AppText variant="label" strong style={styles.flex} numeric>
            {title}
          </AppText>
          <View style={[styles.badge, { borderColor: withAlpha(color, 0.6), backgroundColor: withAlpha(color, 0.12) }]}>
            <AppText variant="caption" strong style={{ color }}>
              {t(`coach.grades.${review.grade}`)}
            </AppText>
          </View>
        </View>
        <AppText variant="label">{t(`coach.reasons.${review.reason}`, params)}</AppText>
        {review.better ? (
          <AppText variant="label" strong tone="cyan">
            {t('coach.better', { move: t(`coach.moves.${review.better}`) })}
          </AppText>
        ) : null}
        <View style={styles.numbers}>
          {review.equity !== null ? (
            <AppText variant="caption" tone="muted" numeric>
              {review.potOdds !== null
                ? t('coach.equityNeed', { eq: Math.round(review.equity * 100), need: Math.round(review.potOdds * 100) })
                : t('coach.equityOnly', { eq: Math.round(review.equity * 100) })}
            </AppText>
          ) : null}
          {review.evLossBB ? (
            <AppText variant="caption" strong tone="magenta" numeric>
              {t('coach.loss', { bb: formatDecimal(review.evLossBB) })}
            </AppText>
          ) : null}
        </View>
        {lesson ? (
          <Pressable
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
            accessibilityRole="link"
            style={({ pressed }) => [styles.lesson, styles.lessonLink, { borderColor: colors.cyan, backgroundColor: pressed ? withAlpha(colors.cyan, 0.15) : 'transparent' }]}>
            <AppText variant="caption" strong tone="cyan">
              {t('coach.lessonOpen', { name: lessonText(lesson, locale).title })}
            </AppText>
          </Pressable>
        ) : (
          <View style={[styles.lesson, { borderColor: colors.border }]}>
            <AppText variant="caption" tone="muted">
              {t('coach.lesson', { name: t(`coach.lessons.${review.lesson}`) })}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: space.md,
    gap: space.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  numbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  lessonLink: {
    borderStyle: 'solid',
  },
  lesson: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    marginTop: space.xxs,
  },
});
