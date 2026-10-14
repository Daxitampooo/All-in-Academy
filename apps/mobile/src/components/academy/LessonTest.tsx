import type { Lesson, LessonText } from '@pokerall/content';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

import { QuizBlock } from './QuizBlock';

type Props = {
  lesson: Lesson;
  text: LessonText;
  onFinish: (score: number, passed: boolean) => void;
  /** The next lesson's title, for the button after passing. */
  nextTitle: string | null;
  onNext: () => void;
};

/** The test at the end of a lesson: questions one at a time, then the score and whether it's passed. */
export function LessonTest({ lesson, text, onFinish, nextTitle, onNext }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const total = lesson.test.length;

  const restart = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setRight(0);
    setAnswered(false);
    setResult(null);
  };

  if (result) {
    const color = result.passed ? colors.lime : colors.amber;
    return (
      <View style={[styles.result, { borderColor: color, backgroundColor: withAlpha(color, 0.08) }]} accessibilityLiveRegion="polite">
        <AppText variant="title" style={{ color }}>
          {result.passed ? t('academy.test.passed') : t('academy.test.failed')}
        </AppText>
        <AppText numeric>{t('academy.test.score', { right: Math.round(result.score * total), total })}</AppText>
        {!result.passed ? (
          <AppText variant="label" tone="muted">
            {t('academy.test.need', { pct: Math.round(lesson.pass * 100) })}
          </AppText>
        ) : null}
        {result.passed && nextTitle ? <Button label={t('academy.test.next', { title: nextTitle })} onPress={onNext} /> : null}
        <Button label={t('academy.test.again')} kind="secondary" onPress={restart} />
      </View>
    );
  }

  const q = lesson.test[index]!;
  const qt = text.test[q.id]!;
  return (
    <View style={styles.wrap}>
      <QuizBlock
        key={`${attempt}-${q.id}`}
        label={t('academy.test.question', { n: index + 1, total })}
        question={qt.q}
        options={qt.options}
        answer={q.answer}
        explain={qt.explain}
        onAnswer={(ok) => {
          if (ok) setRight((r) => r + 1);
          setAnswered(true);
        }}
      />
      {answered ? (
        <Button
          label={index + 1 < total ? t('academy.test.continue') : t('academy.test.finish')}
          onPress={() => {
            if (index + 1 < total) {
              setIndex(index + 1);
              setAnswered(false);
              return;
            }
            const score = right / total;
            const passed = score >= lesson.pass - 1e-9;
            setResult({ score, passed });
            onFinish(score, passed);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  result: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
});
