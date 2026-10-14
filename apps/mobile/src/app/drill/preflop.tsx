import { RFI_RANGES, checkPreflop, preflopQuestion, rangeActions, type PreflopQuestion } from '@pokerall/content';
import { rangeShare } from '@pokerall/poker-engine';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PositionsTable } from '@/components/academy/PositionsTable';
import { RangeMatrix } from '@/components/academy/RangeMatrix';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { addAnswer, EMPTY_SCORE, ScoreBar } from '@/components/drills/ScoreBar';
import { useDrillRng } from '@/components/drills/useDrillRng';
import { Screen } from '@/components/Screen';
import { PlayingCard } from '@/components/table/PlayingCard';
import { DRILL_CONFIG } from '@/config/drills';
import { useDrillQuota, usePreflopLeft } from '@/store/drillQuota';
import { usePro } from '@/store/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Verdict = { move: 'raise' | 'fold'; correct: boolean; mixed: boolean };

export default function PreflopDrill() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rng = useDrillRng();
  const pro = usePro();
  const left = usePreflopLeft(pro);
  const consume = useDrillQuota((s) => s.consume);
  const [question, setQuestion] = useState<PreflopQuestion>(() => preflopQuestion(rng));
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(EMPTY_SCORE);
  /** Missed hands waiting to come back, with how many questions until they do. */
  const [repeats, setRepeats] = useState<{ q: PreflopQuestion; in: number }[]>([]);
  const [blocked, setBlocked] = useState(false);

  const answer = (move: 'raise' | 'fold') => {
    if (!consume(pro)) {
      setBlocked(true);
      return;
    }
    const v = checkPreflop(question, move);
    setVerdict({ move, ...v });
    setScore((s) => addAnswer(s, v.correct));
    if (!v.correct) setRepeats((r) => [...r, { q: question, in: DRILL_CONFIG.repeatAfter }]);
  };

  const next = () => {
    const due = repeats.find((r) => r.in <= 0);
    setRepeats((rs) => rs.filter((r) => r !== due).map((r) => ({ ...r, in: r.in - 1 })));
    setQuestion(due ? due.q : preflopQuestion(rng));
    setVerdict(null);
  };

  const share = rangeShare(rangeActions(RFI_RANGES[question.seat]!).raise!);
  const outOfHands = blocked || (left !== null && left <= 0 && !verdict);

  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('drills.preflop.title')} subtitle={t('drills.preflop.subtitle')}>
      <ScoreBar score={score} extra={left === null ? undefined : t('drills.left', { left: Math.max(0, left), total: DRILL_CONFIG.preflopFreePerDay })} />
      {outOfHands ? (
        <View style={[styles.card, { borderColor: withAlpha(colors.amber, 0.5), backgroundColor: withAlpha(colors.amber, 0.08) }]}>
          <AppText variant="heading" tone="amber">
            {t('drills.limitTitle')}
          </AppText>
          <AppText tone="muted">{t('drills.limitBody', { total: DRILL_CONFIG.preflopFreePerDay })}</AppText>
        </View>
      ) : (
        <>
          <PositionsTable seats={6} highlight={[question.seat]} />
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="heading">{t('drills.preflop.situation', { seat: question.seat })}</AppText>
            <View style={styles.cards}>
              {question.cards.map((c) => (
                <PlayingCard key={c} card={c} size="lg" />
              ))}
            </View>
            {verdict ? null : (
              <View style={styles.buttons}>
                <View style={styles.flex}>
                  <Button label={t('drills.preflop.fold')} kind="secondary" onPress={() => answer('fold')} />
                </View>
                <View style={styles.flex}>
                  <Button label={t('drills.preflop.raise')} onPress={() => answer('raise')} />
                </View>
              </View>
            )}
          </View>
          {verdict ? (
            <View
              style={[
                styles.card,
                {
                  borderColor: verdict.correct ? colors.lime : colors.magenta,
                  backgroundColor: withAlpha(verdict.correct ? colors.lime : colors.magenta, 0.08),
                },
              ]}
              accessibilityLiveRegion="polite">
              <AppText variant="heading" tone={verdict.correct ? 'lime' : 'magenta'}>
                {verdict.mixed ? t('drills.preflop.mixed') : verdict.correct ? t('drills.right') : t('drills.wrong')}
              </AppText>
              <AppText>
                {t('drills.preflop.explain', {
                  seat: question.seat,
                  share: Math.round(share * 100),
                  hand: question.handClass,
                  pct: Math.round(question.raise * 100),
                })}
              </AppText>
              {!verdict.correct ? (
                <AppText variant="caption" tone="muted">
                  {t('drills.repeatNote')}
                </AppText>
              ) : null}
              <RangeMatrix actions={rangeActions(RFI_RANGES[question.seat]!)} mark={question.handClass} />
              <Button label={t('drills.next')} onPress={next} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.md,
  },
  cards: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
