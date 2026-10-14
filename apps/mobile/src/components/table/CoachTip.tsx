import type { DecisionReview } from '@pokerall/coach';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { GRADE_COLOR, textParams } from '@/components/hands/DecisionCard';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** The coach's word on your last decision, in the row above the action buttons. Tap to hide. */
export function CoachTip({ review, onDismiss }: { review: DecisionReview; onDismiss: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const color = colors[GRADE_COLOR[review.grade]];
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(180)}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityHint={t('table.coachHide')}
        accessibilityLiveRegion="polite"
        style={[styles.tip, { borderColor: withAlpha(color, 0.7), backgroundColor: colors.surface }]}>
        <View style={[styles.strip, { backgroundColor: color }]} />
        <View style={styles.body}>
          <AppText variant="caption" numberOfLines={3}>
            <AppText variant="caption" strong style={{ color }}>
              {t('table.coach', { grade: t(`coach.grades.${review.grade}`) })}{' '}
            </AppText>
            {t(`coach.reasons.${review.reason}`, textParams(review))}
            {review.better ? ` ${t('coach.better', { move: t(`coach.moves.${review.better}`) })}` : ''}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** A short line of help above the action buttons: the price of a call, the outs of a draw. */
export function TableTip({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tip, { borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
      <View style={[styles.strip, { backgroundColor: colors.cyan }]} />
      <View style={styles.body}>
        <AppText variant="caption">{text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
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
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
  },
});
