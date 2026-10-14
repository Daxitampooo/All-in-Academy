import { outsQuestion, type OutsQuestion } from '@pokerall/content';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { QuizBlock } from '@/components/academy/QuizBlock';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { addAnswer, EMPTY_SCORE, ScoreBar } from '@/components/drills/ScoreBar';
import { useDrillRng } from '@/components/drills/useDrillRng';
import { Screen } from '@/components/Screen';
import { useLifetime } from '@/store/lifetime';
import { PlayingCard } from '@/components/table/PlayingCard';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Chance to hit one of `outs` cards with one card to come (47 unseen) or two. */
function hitChance(outs: number, cards: 1 | 2): number {
  if (cards === 1) return outs / 47;
  return 1 - ((47 - outs) / 47) * ((46 - outs) / 46);
}

export default function OutsDrill() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rng = useDrillRng();
  const [n, setN] = useState(0);
  const [q, setQ] = useState<OutsQuestion>(() => outsQuestion(rng));
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(EMPTY_SCORE);
  const outs = q.outs.length;
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('drills.outs.title')} subtitle={t('drills.outs.subtitle')}>
      <ScoreBar score={score} />
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="label" tone="muted">
          {t('drills.outs.hand')}
        </AppText>
        <View style={styles.cards}>
          {q.hole.map((c) => (
            <PlayingCard key={c} card={c} size="md" />
          ))}
        </View>
        <AppText variant="label" tone="muted">
          {t('drills.outs.flop')}
        </AppText>
        <View style={styles.cards}>
          {q.board.map((c) => (
            <PlayingCard key={c} card={c} size="md" />
          ))}
        </View>
      </View>
      <QuizBlock
        key={n}
        question={t('drills.outs.question')}
        options={q.options.map(String)}
        answer={q.answer}
        explain={t('drills.outs.explain', {
          outs,
          turn: Math.round(hitChance(outs, 1) * 100),
          river: Math.round(hitChance(outs, 2) * 100),
          rule2: outs * 2,
          rule4: outs * 4,
        })}
        onAnswer={(right) => {
          useLifetime.getState().addDrillAnswer(right);
          setScore((s) => addAnswer(s, right));
          setAnswered(true);
        }}
      />
      {answered ? (
        <>
          <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="label" strong>
              {t('drills.outs.list', { count: outs })}
            </AppText>
            <View style={styles.outs}>
              {q.outs.map((c) => (
                <PlayingCard key={c} card={c} size="sm" />
              ))}
            </View>
          </View>
          <Button
            label={t('drills.next')}
            onPress={() => {
              setQ(outsQuestion(rng));
              setN((x) => x + 1);
              setAnswered(false);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  cards: {
    flexDirection: 'row',
    gap: space.xs,
  },
  outs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
});
