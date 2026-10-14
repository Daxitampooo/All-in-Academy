import { classRange, classShare } from '@pokerall/poker-engine';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { RangeMatrix } from '@/components/academy/RangeMatrix';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ProLock } from '@/components/ProLock';
import { Screen } from '@/components/Screen';
import { Chips } from '@/components/tools/Chips';
import { Stepper } from '@/components/tools/Stepper';
import { formatNumber } from '@/lib/format';
import { usePro } from '@/store/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { ANTES, TABLE_SIZES, anteLabel, seatsBehind, seatWithBehind, usePushFold } from '@/tools/pushFold';

export default function PushFoldChartsScreen() {
  const { t } = useTranslation();
  const pro = usePro();
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('tools.pushfold.title')} subtitle={t('tools.pushfold.subtitle')}>
      {pro ? <Charts /> : <ProLock what={t('tools.pushfold.pro')} />}
    </Screen>
  );
}

function Charts() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [players, setPlayers] = useState(6);
  const [behind, setBehind] = useState(1);
  const [stack, setStack] = useState(10);
  const [ante, setAnte] = useState(0);
  const [caller, setCaller] = useState(0);

  const spotBehind = Math.min(behind, players - 1);
  const { solution, progress } = usePushFold({ players, behind: spotBehind, stack, ante });
  const callers = seatsBehind(players, spotBehind);
  const callerIdx = Math.min(caller, callers.length - 1);
  const hero = seatWithBehind(players, spotBehind);

  const pushActions = useMemo(() => (solution ? { allin: classRange(solution.push) } : null), [solution]);
  const callActions = useMemo(() => (solution ? { call: classRange(solution.calls[callerIdx]!) } : null), [solution, callerIdx]);

  // Seats that can push: every seat except the big blind, earliest first.
  const seats = Array.from({ length: players - 1 }, (_, i) => players - 1 - i).map((b) => ({ value: b, label: seatWithBehind(players, b) }));

  return (
    <>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Chips label={t('tools.pushfold.players')} options={TABLE_SIZES.map((n) => ({ value: n, label: String(n) }))} value={players} onChange={(n) => {
          setPlayers(n);
          setBehind(1);
          setCaller(0);
        }} />
        <Chips label={t('tools.pushfold.seat')} options={seats} value={spotBehind} onChange={(b) => {
          setBehind(b);
          setCaller(0);
        }} />
        <Stepper label={t('tools.pushfold.stack')} value={stack} min={1} max={25} step={1} format={(v) => t('tools.pushfold.bb', { n: formatNumber(v, 1) })} onChange={setStack} />
        <Chips label={t('tools.pushfold.ante')} options={ANTES.map((a) => ({ value: a, label: anteLabel(t, a) }))} value={ante} onChange={setAnte} />
      </View>

      {solution && pushActions && callActions ? (
        <>
          <AppText variant="heading">{t('tools.pushfold.pushTitle', { seat: hero, pct: formatNumber(classShare(solution.push) * 100, 1) })}</AppText>
          <RangeMatrix actions={pushActions} caption={t('tools.pushfold.pushCaption', { seat: hero, stack })} />
          {callers.length > 1 ? (
            <Chips label={t('tools.pushfold.caller')} options={callers.map((s, i) => ({ value: i, label: s }))} value={callerIdx} onChange={setCaller} />
          ) : null}
          <AppText variant="heading">
            {t('tools.pushfold.callTitle', { seat: callers[callerIdx]!, hero, pct: formatNumber(classShare(solution.calls[callerIdx]!) * 100, 1) })}
          </AppText>
          <RangeMatrix actions={callActions} caption={t('tools.pushfold.callCaption')} />
        </>
      ) : (
        <View style={styles.progressWrap} accessibilityLiveRegion="polite">
          <AppText tone="muted">{t('tools.pushfold.solving')}</AppText>
          <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.amber }]} />
          </View>
        </View>
      )}
      <Button label={t('tools.pushfold.drill')} kind="secondary" onPress={() => router.push('/drill/pushfold')} />
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
