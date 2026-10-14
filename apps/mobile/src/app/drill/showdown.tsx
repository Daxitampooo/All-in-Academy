import { showdownQuestion, type ShowdownQuestion } from '@pokerall/content';
import { describeHand } from '@pokerall/poker-engine';
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
import { handNameKey } from '@/table/describe';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function ShowdownDrill() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rng = useDrillRng();
  const [n, setN] = useState(0);
  const [q, setQ] = useState<ShowdownQuestion>(() => showdownQuestion(rng));
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(EMPTY_SCORE);
  const described = q.hands.map((h) => describeHand([...h, ...q.board]));
  const names = described.map((d, i) => t(handNameKey(d.categoryId, q.hands[i]!)));
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('drills.showdown.title')} subtitle={t('drills.showdown.subtitle')}>
      <ScoreBar score={score} />
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="label" tone="muted">
          {t('drills.showdown.board')}
        </AppText>
        <View style={styles.cards}>
          {q.board.map((c) => (
            <PlayingCard key={c} card={c} size="md" highlight={answered && q.winner !== 2 && described[q.winner]!.bestFive.includes(c)} />
          ))}
        </View>
        <View style={styles.hands}>
          {q.hands.map((h, i) => (
            <View key={i} style={styles.hand}>
              <AppText variant="label" strong tone={i === 0 ? 'cyan' : 'magenta'}>
                {t('drills.showdown.hand', { n: i + 1 })}
              </AppText>
              <View style={styles.cards}>
                {h.map((c) => (
                  <PlayingCard key={c} card={c} size="md" highlight={answered && q.winner === i && described[i]!.bestFive.includes(c)} />
                ))}
              </View>
              {answered ? (
                <AppText variant="caption" tone="muted">
                  {names[i]}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      </View>
      <QuizBlock
        key={n}
        question={t('drills.showdown.question')}
        options={[t('drills.showdown.hand', { n: 1 }), t('drills.showdown.hand', { n: 2 }), t('drills.showdown.split')]}
        answer={q.winner}
        explain={
          q.winner === 2
            ? t('drills.showdown.explainSplit', { name: names[0] })
            : t('drills.showdown.explain', { n: q.winner + 1, winner: names[q.winner], loser: names[1 - q.winner] })
        }
        onAnswer={(right) => {
          useLifetime.getState().addDrillAnswer(right);
          setScore((s) => addAnswer(s, right));
          setAnswered(true);
        }}
      />
      {answered ? (
        <Button
          label={t('drills.next')}
          onPress={() => {
            setQ(showdownQuestion(rng));
            setN((x) => x + 1);
            setAnswered(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  cards: {
    flexDirection: 'row',
    gap: space.xs,
  },
  hands: {
    flexDirection: 'row',
    gap: space.lg,
    marginTop: space.xs,
  },
  hand: {
    gap: space.xs,
  },
});
