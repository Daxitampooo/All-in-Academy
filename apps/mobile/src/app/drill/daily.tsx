import { DAILY_SIZE, dailyQuestions } from '@pokerall/content';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { SpotQuestion } from '@/components/drills/SpotQuestion';
import { Screen } from '@/components/Screen';
import { localDay } from '@/store/analysisQuota';
import { dailyStreak, useDaily } from '@/store/daily';
import { useLifetime } from '@/store/lifetime';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

export default function DailyChallengeScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [day] = useState(() => localDay());
  const questions = useMemo(() => dailyQuestions(day), [day]);
  const results = useDaily((s) => s.results);
  const current = useDaily((s) => s.current);
  const record = useDaily((s) => s.answer);
  const result = results[day];
  const answers = current?.day === day ? current.answers : [];
  /** The question whose answer is on screen, until "Next". */
  const [viewing, setViewing] = useState<number | null>(null);
  /** Another run after the counted one: answers aren't saved. */
  const [practice, setPractice] = useState<{ index: number; right: number; answered: boolean } | null>(null);

  const dateText = new Date().toLocaleDateString(i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' });
  const past = Object.entries(results)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7);
  const best = Math.max(0, ...Object.values(results).map((r) => r.right));

  const header = <BackButton label={t('train.title')} fallback="/train" />;

  if (practice) {
    const done = practice.index >= DAILY_SIZE;
    return (
      <Screen header={header} title={t('drills.daily.title')} subtitle={t('drills.daily.practiceSubtitle')}>
        {done ? (
          <>
            <AppText variant="title">{t('drills.daily.practiceDone', { right: practice.right, total: DAILY_SIZE })}</AppText>
            <Button label={t('drills.daily.back')} onPress={() => setPractice(null)} />
          </>
        ) : (
          <>
            <SpotQuestion
              key={`p-${practice.index}`}
              question={questions[practice.index]!}
              label={t('drills.daily.counter', { n: practice.index + 1, total: DAILY_SIZE })}
              onAnswer={(right) => setPractice((p) => p && { ...p, right: p.right + (right ? 1 : 0), answered: true })}
            />
            {practice.answered ? (
              <Button label={t('drills.next')} onPress={() => setPractice((p) => p && { ...p, index: p.index + 1, answered: false })} />
            ) : null}
          </>
        )}
      </Screen>
    );
  }

  if (result && viewing === null) {
    return (
      <Screen header={header} title={t('drills.daily.title')} subtitle={t('drills.daily.subtitle', { date: dateText })}>
        <View style={[styles.card, { borderColor: withAlpha(colors.amber, 0.6), backgroundColor: withAlpha(colors.amber, 0.08) }]}>
          <AppText variant="caption" tone="muted">
            {t('drills.daily.today')}
          </AppText>
          <AppText variant="display" tone="amber" numeric>
            {t('drills.daily.score', { right: result.right, total: result.total })}
          </AppText>
          <AppText tone="muted">{t('drills.daily.comeBack')}</AppText>
        </View>
        <View style={styles.stats}>
          <View style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="title" numeric>
              {t('drills.daily.score', { right: best, total: DAILY_SIZE })}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t('drills.daily.best')}
            </AppText>
          </View>
          <View style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="title" numeric>
              {dailyStreak(results, new Date())}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t('drills.daily.streak')}
            </AppText>
          </View>
        </View>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AppText variant="heading">{t('drills.daily.history')}</AppText>
          {past.map(([d, r]) => (
            <View key={d} style={styles.row}>
              <AppText style={styles.flex} numeric>
                {d.split('-').reverse().join('.')}
              </AppText>
              <AppText strong numeric>
                {t('drills.daily.score', { right: r.right, total: r.total })}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" tone="muted">
          {t('drills.daily.leaderboard')}
        </AppText>
        <Button label={t('drills.daily.practice')} kind="secondary" onPress={() => setPractice({ index: 0, right: 0, answered: false })} />
      </Screen>
    );
  }

  const index = viewing ?? answers.length;
  return (
    <Screen header={header} title={t('drills.daily.title')} subtitle={t('drills.daily.subtitle', { date: dateText })}>
      <View style={styles.progress} accessibilityLabel={t('drills.daily.counter', { n: index + 1, total: DAILY_SIZE })}>
        {questions.map((_, i) => {
          const done = i < answers.length || (result && i < DAILY_SIZE);
          const right = i < answers.length ? answers[i] : undefined;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: right === true ? colors.lime : right === false ? colors.magenta : done ? colors.amber : colors.surfaceRaised,
                  borderColor: i === index ? colors.text : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>
      <SpotQuestion
        key={`d-${index}`}
        question={questions[index]!}
        label={t('drills.daily.counter', { n: index + 1, total: DAILY_SIZE })}
        onAnswer={(right) => {
          setViewing(index);
          record(day, right);
          useLifetime.getState().addDrillAnswer(right);
        }}
      />
      {viewing !== null ? (
        <Button label={index + 1 >= DAILY_SIZE ? t('drills.daily.finish') : t('drills.next')} onPress={() => setViewing(null)} />
      ) : (
        <AppText variant="caption" tone="muted">
          {t('drills.daily.rules')}
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    gap: space.xs,
  },
  dot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
});
