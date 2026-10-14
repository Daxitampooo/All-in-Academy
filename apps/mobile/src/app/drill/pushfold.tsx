import {
  CLASS_COUNT,
  classAt,
  classCombos,
  classIndex,
  classRange,
  handClassOf,
  type Card,
  type PushFoldSolution,
  type PushFoldSpot,
  type Range,
} from '@pokerall/poker-engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { RangeMatrix } from '@/components/academy/RangeMatrix';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { addAnswer, EMPTY_SCORE, ScoreBar } from '@/components/drills/ScoreBar';
import { useDrillRng } from '@/components/drills/useDrillRng';
import { ProLock } from '@/components/ProLock';
import { Screen } from '@/components/Screen';
import { PlayingCard } from '@/components/table/PlayingCard';
import { Chips } from '@/components/tools/Chips';
import { formatNumber } from '@/lib/format';
import { useLifetime } from '@/store/lifetime';
import { usePro } from '@/store/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';
import { TABLE_SIZES, seatsBehind, seatWithBehind, usePushFold } from '@/tools/pushFold';

/** Decisions closer than this (in big blinds) count as right either way. */
const CLOSE_BB = 0.05;
const MIN_STACK = 3;
const MAX_STACK = 15;
const TRAINER_ANTE = 0.125;

type Question = {
  spot: PushFoldSpot;
  role: 'push' | 'call';
  /** Index of the caller among the players behind (for "call" questions). */
  caller: number;
  /** Picks the hand once the chart is ready. */
  seed: number;
};

type Verdict = { move: 'go' | 'fold'; gain: number; right: boolean; close: boolean };

function newQuestion(rng: { nextInt: (n: number) => number }, players: number, ante: boolean): Question {
  const behind = 1 + rng.nextInt(players - 1);
  const role = rng.nextInt(100) < 65 ? 'push' : 'call';
  return {
    spot: { players, behind, stack: MIN_STACK + rng.nextInt(MAX_STACK - MIN_STACK + 1), ante: ante ? TRAINER_ANTE : 0 },
    role,
    caller: rng.nextInt(behind),
    seed: rng.nextInt(2 ** 30),
  };
}

/** Small deterministic generator, so the same question always shows the same hand. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
}

/**
 * Picks a hand for the question: mostly hands near the edge of the range, where the decision is hard, and
 * some at random.
 */
function pickHand(solution: PushFoldSolution, q: Question): [Card, Card] {
  const next = seeded(q.seed);
  const gains = q.role === 'push' ? solution.pushGain : solution.callGain[q.caller]!;
  const near: number[] = [];
  for (let i = 0; i < CLASS_COUNT; i++) if (Math.abs(gains[i]!) < 1.2) near.push(i);
  const cls = near.length > 0 && next(100) < 65 ? near[next(near.length)]! : next(CLASS_COUNT);
  const combos = classCombos(classAt(cls));
  return combos[next(combos.length)]!;
}

export default function PushFoldDrillScreen() {
  const { t } = useTranslation();
  const pro = usePro();
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('drills.pushfold.title')} subtitle={t('drills.pushfold.subtitle')}>
      {pro ? <Drill /> : <ProLock what={t('drills.pushfold.pro')} />}
    </Screen>
  );
}

function Drill() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rng = useDrillRng();
  const [players, setPlayers] = useState(6);
  const [ante, setAnte] = useState(true);
  const [question, setQuestion] = useState<Question>(() => newQuestion(rng, 6, true));
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(EMPTY_SCORE);
  const { solution, progress } = usePushFold(question.spot);

  const hand = useMemo(() => (solution ? pickHand(solution, question) : null), [solution, question]);
  const cls = hand ? classIndex(handClassOf(hand[0], hand[1])) : -1;
  const hero = seatWithBehind(question.spot.players, question.spot.behind);
  const callerSeat = seatsBehind(question.spot.players, question.spot.behind)[question.caller]!;
  const chart = useMemo((): Record<string, Range> | null => {
    if (!solution) return null;
    return question.role === 'push' ? { allin: classRange(solution.push) } : { call: classRange(solution.calls[question.caller]!) };
  }, [solution, question]);

  const restart = (nextPlayers: number, nextAnte: boolean) => {
    setQuestion(newQuestion(rng, nextPlayers, nextAnte));
    setVerdict(null);
  };

  const answer = (move: 'go' | 'fold') => {
    if (!solution || cls < 0) return;
    const gain = question.role === 'push' ? solution.pushGain[cls]! : solution.callGain[question.caller]![cls]!;
    const close = Math.abs(gain) < CLOSE_BB;
    const right = close || (move === 'go') === gain > 0;
    setVerdict({ move, gain, right, close });
    setScore((s) => addAnswer(s, right));
    useLifetime.getState().addDrillAnswer(right);
  };

  const stack = t('tools.pushfold.bb', { n: question.spot.stack });
  const situation =
    question.role === 'push'
      ? t('drills.pushfold.pushSpot', { seat: hero, stack })
      : t('drills.pushfold.callSpot', { pusher: hero, seat: callerSeat, stack });

  return (
    <>
      <Chips label={t('tools.pushfold.players')} options={TABLE_SIZES.map((n) => ({ value: n, label: String(n) }))} value={players} onChange={(n) => {
        setPlayers(n);
        restart(n, ante);
      }} />
      <Chips
        label={t('tools.pushfold.ante')}
        options={[
          { value: 'on', label: t('drills.pushfold.anteOn') },
          { value: 'off', label: t('tools.pushfold.noAnte') },
        ]}
        value={ante ? 'on' : 'off'}
        onChange={(v) => {
          setAnte(v === 'on');
          restart(players, v === 'on');
        }}
      />
      <ScoreBar score={score} />
      {hand && solution && chart ? (
        <>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="heading">{situation}</AppText>
            <View style={styles.cards}>
              {hand.map((c) => (
                <PlayingCard key={c} card={c} size="lg" />
              ))}
            </View>
            {verdict ? null : (
              <View style={styles.buttons}>
                <View style={styles.flex}>
                  <Button label={t('drills.pushfold.fold')} kind="secondary" onPress={() => answer('fold')} />
                </View>
                <View style={styles.flex}>
                  <Button label={t(question.role === 'push' ? 'drills.pushfold.push' : 'drills.pushfold.call')} onPress={() => answer('go')} />
                </View>
              </View>
            )}
          </View>
          {verdict ? (
            <View
              style={[
                styles.card,
                {
                  borderColor: verdict.right ? colors.lime : colors.magenta,
                  backgroundColor: withAlpha(verdict.right ? colors.lime : colors.magenta, 0.08),
                },
              ]}
              accessibilityLiveRegion="polite">
              <AppText variant="heading" tone={verdict.right ? 'lime' : 'magenta'}>
                {verdict.close ? t('drills.pushfold.close') : verdict.right ? t('drills.right') : t('drills.wrong')}
              </AppText>
              <AppText>
                {verdict.gain > 0
                  ? t(question.role === 'push' ? 'drills.pushfold.pushBetter' : 'drills.pushfold.callBetter', { ev: formatNumber(verdict.gain, 2) })
                  : t(question.role === 'push' ? 'drills.pushfold.foldBetterPush' : 'drills.pushfold.foldBetterCall', { ev: formatNumber(-verdict.gain, 2) })}
              </AppText>
              <RangeMatrix
                actions={chart}
                mark={classAt(cls)}
                caption={
                  question.role === 'push'
                    ? t('tools.pushfold.pushCaption', { seat: hero, stack: question.spot.stack })
                    : t('drills.pushfold.callCaption', { seat: callerSeat, hero, stack: question.spot.stack })
                }
              />
              <Button
                label={t('drills.next')}
                onPress={() => {
                  setQuestion(newQuestion(rng, players, ante));
                  setVerdict(null);
                }}
              />
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.progressWrap}>
          <AppText tone="muted">{t('drills.pushfold.preparing')}</AppText>
          <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.amber }]} />
          </View>
        </View>
      )}
      <AppText variant="caption" tone="muted">
        {t('tools.pushfold.note')}
      </AppText>
    </>
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
  progressWrap: {
    gap: space.sm,
    paddingVertical: space.lg,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
