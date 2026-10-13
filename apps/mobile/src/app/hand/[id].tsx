import { reviewHand } from '@pokerall/coach';
import { createSeededRng, replay, type HandEvent } from '@pokerall/poker-engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { DecisionCard, GRADE_COLOR } from '@/components/hands/DecisionCard';
import { Replayer } from '@/components/hands/Replayer';
import { FlagIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { ANALYSIS_CONFIG } from '@/config/analysis';
import { actionText, bbText, opponentOf, whenText } from '@/hands/describe';
import { formatDecimal } from '@/lib/format';
import { LookScope, usePersonalLook } from '@/looks/LookProvider';
import { useAnalysesLeft, useAnalysisQuota } from '@/store/analysisQuota';
import { useHands } from '@/store/hands';
import { usePro } from '@/store/pro';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type ActionEvent = Extract<HandEvent, { type: 'action' }>;

/** A fixed seed per hand, so analyzing the same hand gives the same numbers. */
function seedOf(id: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < id.length; i++) bytes[i % 32] = (bytes[i % 32]! * 31 + id.charCodeAt(i)) % 256;
  return bytes;
}

export default function HandScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const look = usePersonalLook();
  const hand = useHands((s) => s.hands.find((h) => h.id === id));
  const review = useHands((s) => (id ? s.reviews[id] : undefined));
  const toggleFlag = useHands((s) => s.toggleFlag);
  const saveReview = useHands((s) => s.saveReview);
  const nickname = useProfile((s) => s.nickname);
  const pro = usePro();
  const left = useAnalysesLeft(pro);
  const consume = useAnalysisQuota((s) => s.consume);
  const states = useMemo(() => (hand ? replay(hand.history) : []), [hand]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const header = <BackButton label={t('hands.title')} fallback="/hands" />;
  if (!hand || states.length === 0) {
    return (
      <Screen header={header} title={t('hands.handTitle')}>
        <AppText tone="muted">{t('hands.notFound')}</AppText>
      </Screen>
    );
  }

  const bigBlind = hand.history.config.bigBlind;
  const analyze = () => {
    if (!consume(pro)) {
      setBlocked(true);
      return;
    }
    setBusy(true);
    // Let the spinner show before the work starts; a hand takes a fraction of a second.
    setTimeout(() => {
      const result = reviewHand(hand.history, hand.hero, { rng: createSeededRng(seedOf(hand.id)), samples: ANALYSIS_CONFIG.samples });
      saveReview(hand.id, result);
      setBusy(false);
    }, 60);
  };

  const titleOf = (decisionStep: number) => {
    const after = states[decisionStep + 1];
    let last: ActionEvent | null = null;
    if (after) for (const e of after.events) if (e.type === 'action') last = e;
    const street = states[decisionStep]!.phase;
    return `${t(`analysis.streets.${street === 'complete' ? 'river' : street}`)}: ${last ? actionText(last, t) : ''}`;
  };

  return (
    <Screen header={header} title={t('hands.handTitle')}>
      <View style={styles.meta}>
        <AppText variant="label" tone="muted" style={styles.flex}>
          {`${whenText(hand.at, t, i18n.language)} · ${opponentOf(hand, t)}`}
        </AppText>
        <AppText variant="heading" numeric tone={hand.net > 0 ? 'lime' : hand.net < 0 ? 'magenta' : 'muted'}>
          {bbText(hand.net, bigBlind, t)}
        </AppText>
      </View>
      {hand.equity ? (
        <AppText variant="caption" tone="amber">
          {t('hands.splitNote', { pct: Math.round(hand.equity[hand.hero]! * 100) })}
        </AppText>
      ) : null}

      <LookScope look={look}>
        <Replayer hand={hand} states={states} step={step} onStep={setStep} nickname={nickname} />
      </LookScope>

      <Pressable
        onPress={() => toggleFlag(hand.id)}
        accessibilityRole="switch"
        accessibilityState={{ checked: hand.flagged }}
        style={({ pressed }) => [
          styles.flag,
          {
            borderColor: hand.flagged ? colors.amber : colors.border,
            backgroundColor: hand.flagged ? withAlpha(colors.amber, 0.1) : pressed ? colors.surfaceRaised : colors.surface,
          },
        ]}>
        <FlagIcon color={hand.flagged ? colors.amber : colors.textMuted} filled={hand.flagged} />
        <View style={styles.flex}>
          <AppText strong tone={hand.flagged ? 'amber' : 'text'}>
            {t(hand.flagged ? 'hands.flagged' : 'hands.flag')}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t('hands.flagHint')}
          </AppText>
        </View>
      </Pressable>

      <View style={styles.section}>
        <AppText variant="title">{t('coach.title')}</AppText>
        {review ? (
          <>
            <View style={[styles.summary, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.counts}>
                {(['good', 'inaccuracy', 'mistake'] as const).map((g) => (
                  <View key={g} style={styles.count}>
                    <AppText variant="title" numeric style={{ color: colors[GRADE_COLOR[g]] }}>
                      {String(review.counts[g])}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {t(`coach.gradesPlural.${g}`)}
                    </AppText>
                  </View>
                ))}
              </View>
              <AppText variant="label" tone={review.totalLossBB > 0 ? 'magenta' : 'lime'}>
                {review.totalLossBB > 0 ? t('coach.totalLoss', { bb: formatDecimal(review.totalLossBB) }) : t('coach.noLoss')}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('coach.disclaimer')}
              </AppText>
            </View>
            {review.decisions.map((d) => (
              <DecisionCard key={d.step} review={d} title={titleOf(d.step)} selected={step === d.step} onShow={() => setStep(d.step)} />
            ))}
          </>
        ) : busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.cyan} />
            <AppText tone="muted">{t('coach.working')}</AppText>
          </View>
        ) : (
          <>
            <AppText tone="muted">{t('coach.intro')}</AppText>
            <Button
              label={t('coach.analyze')}
              hint={left === null ? t('coach.unlimited') : t('coach.left', { left, total: ANALYSIS_CONFIG.freePerDay })}
              disabled={left !== null && left <= 0}
              onPress={analyze}
            />
            {blocked || (left !== null && left <= 0) ? (
              <AppText variant="label" tone="amber">
                {t('coach.limitReached', { total: ANALYSIS_CONFIG.freePerDay })}
              </AppText>
            ) : null}
          </>
        )}
      </View>

      <Button label={t('hands.toList')} kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/hands'))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: -space.sm,
  },
  flex: {
    flex: 1,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  section: {
    gap: space.sm,
  },
  summary: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  counts: {
    flexDirection: 'row',
  },
  count: {
    flex: 1,
    gap: 2,
  },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
});
