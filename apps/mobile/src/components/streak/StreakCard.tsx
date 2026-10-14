import { currentStreak, dayDone, dayKey, longestStreak, STREAK_GOAL, STREAK_POINTS } from '@pokerall/shared/client';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FlameIcon } from '@/components/icons';
import { useStreak } from '@/store/streak';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

import { useToday } from './useToday';

const WEEK = 7;

/** The day streak: days in a row with enough tasks, today's progress and the last seven days. */
export function StreakCard() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const days = useStreak((s) => s.days);
  const today = useToday();

  const key = dayKey(today);
  const done = Math.min(days[key] ?? 0, STREAK_GOAL);
  const todayDone = dayDone(days, key);
  const streak = currentStreak(days, today);
  const best = longestStreak(days);
  const left = STREAK_GOAL - done;
  const flame = todayDone ? colors.amber : streak > 0 ? withAlpha(colors.amber, 0.7) : colors.textMuted;

  const week = Array.from({ length: WEEK }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (WEEK - 1 - i));
    const k = dayKey(d);
    return {
      key: k,
      letter: d.toLocaleDateString(i18n.language, { weekday: 'narrow' }),
      done: dayDone(days, k),
      isToday: k === key,
    };
  });

  const status = todayDone
    ? t('streak.doneToday')
    : streak > 0
      ? t('streak.keep', { count: left })
      : t('streak.left', { count: left });
  const title = streak > 0 ? t('streak.title', { count: streak }) : t('streak.start');

  return (
    <Pressable
      onPress={() => router.navigate('/(tabs)/train')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${t('streak.today', { done, goal: STREAK_GOAL })}. ${status}`}
      accessibilityHint={t('streak.openHint')}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: todayDone ? withAlpha(colors.amber, 0.6) : colors.border,
          boxShadow: todayDone && colors.glow > 0 ? `0 0 16px ${withAlpha(colors.amber, 0.3)}` : undefined,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.head}>
        <View style={[styles.flame, { backgroundColor: withAlpha(flame, 0.12), borderColor: withAlpha(flame, 0.5) }]}>
          <FlameIcon color={flame} size={30} filled={todayDone} />
          <AppText variant="heading" numeric strong style={{ color: flame }}>
            {streak}
          </AppText>
        </View>
        <View style={styles.headText}>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="label" tone="muted">
            {status}
          </AppText>
        </View>
      </View>

      <View>
        <View style={styles.progressRow}>
          <AppText variant="caption" tone="muted">
            {t('streak.today', { done, goal: STREAK_GOAL })}
          </AppText>
          {best > 0 ? (
            <AppText variant="caption" tone="muted">
              {t('streak.best', { count: best })}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.fill, { width: `${(done / STREAK_GOAL) * 100}%`, backgroundColor: colors.amber }]} />
        </View>
      </View>

      <View style={styles.week} accessible={false} importantForAccessibility="no-hide-descendants">
        {week.map((d) => (
          <View key={d.key} style={styles.day}>
            <View
              style={[
                styles.dot,
                {
                  borderColor: d.done ? colors.amber : d.isToday ? withAlpha(colors.amber, 0.7) : colors.border,
                  backgroundColor: d.done ? colors.amber : 'transparent',
                  borderStyle: d.isToday && !d.done ? 'dashed' : 'solid',
                },
              ]}
            />
            <AppText variant="caption" tone={d.isToday ? 'text' : 'muted'} strong={d.isToday}>
              {d.letter}
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="caption" tone="muted">
        {t('streak.how', { lesson: STREAK_POINTS.lessonTest })}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  pressed: {
    opacity: 0.8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  flame: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: 4,
    width: 32,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
});
