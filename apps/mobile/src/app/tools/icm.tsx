import { icmCall, icmEquity } from '@pokerall/poker-engine';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ProLock } from '@/components/ProLock';
import { Screen } from '@/components/Screen';
import { Chips } from '@/components/tools/Chips';
import { formatNumber } from '@/lib/format';
import { usePro } from '@/store/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, withAlpha } from '@/theme/tokens';

const MAX_PLAYERS = 9;

const PAYOUT_PRESETS: Record<string, string[]> = {
  top3: ['50', '30', '20'],
  top2: ['65', '35'],
  winner: ['100'],
  top9: ['30', '20', '14', '10', '8', '6.5', '5', '3.5', '3'],
};

/** A number typed with a comma or a dot; null when it isn't one or is negative. */
function readNumber(text: string): number | null {
  const v = Number(text.replace(',', '.').replace(/\s/g, ''));
  return text.trim() !== '' && Number.isFinite(v) && v >= 0 ? v : null;
}

const pct = (v: number) => `${formatNumber(v * 100, 1)}%`;

export default function IcmScreen() {
  const { t } = useTranslation();
  const pro = usePro();
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('tools.icm.title')} subtitle={t('tools.icm.subtitle')}>
      {pro ? <IcmCalculator /> : <ProLock what={t('tools.icm.pro')} />}
    </Screen>
  );
}

function NumberField({ value, onChange, label, wide }: { value: string; onChange: (v: string) => void; label: string; wide?: boolean }) {
  const { colors } = useTheme();
  const bad = readNumber(value) === null;
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      accessibilityLabel={label}
      style={[
        styles.input,
        wide && styles.wide,
        { color: colors.text, backgroundColor: colors.bg, borderColor: bad ? colors.danger : colors.border, fontFamily: fonts.body },
      ]}
    />
  );
}

function IcmCalculator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [stacks, setStacks] = useState(['5000', '3000', '2000']);
  const [payouts, setPayouts] = useState(PAYOUT_PRESETS.top3!);
  const [preset, setPreset] = useState('top3');
  const [hero, setHero] = useState(1);
  const [villain, setVillain] = useState(0);
  const [dead, setDead] = useState('0');

  const stackValues = stacks.map(readNumber);
  const payoutValues = payouts.map(readNumber);
  const valid = stackValues.every((v) => v !== null) && payoutValues.every((v) => v !== null) && stackValues.some((v) => v! > 0);
  const totalChips = stackValues.reduce<number>((a, b) => a + (b ?? 0), 0);
  const totalPrize = payoutValues.reduce<number>((a, b) => a + (b ?? 0), 0);

  // A few thousand operations even for nine players: cheap enough to redo on every keystroke.
  const equity = valid && totalPrize > 0 ? icmEquity(stackValues as number[], payoutValues as number[]) : null;

  const heroIdx = Math.min(hero, stacks.length - 1);
  const villainIdx = Math.min(villain, stacks.length - 1);
  const deadValue = readNumber(dead);
  const call =
    equity && heroIdx !== villainIdx && deadValue !== null && stackValues[heroIdx]! > 0 && stackValues[villainIdx]! > 0
      ? icmCall(stackValues as number[], payoutValues as number[], heroIdx, villainIdx, deadValue)
      : null;

  const playerOptions = stacks.map((_, i) => ({ value: i, label: t('tools.icm.playerShort', { n: i + 1 }) }));

  return (
    <>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="heading">{t('tools.icm.payouts')}</AppText>
        <Chips
          options={Object.keys(PAYOUT_PRESETS).map((id) => ({ value: id, label: t(`tools.icm.preset.${id}`) }))}
          value={preset}
          onChange={(id) => {
            setPreset(id);
            setPayouts(PAYOUT_PRESETS[id]!);
          }}
        />
        <View style={styles.wrapRow}>
          {payouts.map((p, i) => (
            <View key={i} style={styles.place}>
              <AppText variant="caption" tone="muted">
                {t('tools.icm.place', { n: i + 1 })}
              </AppText>
              <NumberField
                value={p}
                label={t('tools.icm.place', { n: i + 1 })}
                onChange={(v) => {
                  setPreset('');
                  setPayouts((ps) => ps.map((x, j) => (j === i ? v : x)));
                }}
              />
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {payouts.length < MAX_PLAYERS ? (
            <AppText variant="label" tone="cyan" onPress={() => {
              setPreset('');
              setPayouts((ps) => [...ps, '0']);
            }}>
              {t('tools.icm.addPlace')}
            </AppText>
          ) : null}
          {payouts.length > 1 ? (
            <AppText variant="label" tone="magenta" onPress={() => {
              setPreset('');
              setPayouts((ps) => ps.slice(0, -1));
            }}>
              {t('tools.icm.removePlace')}
            </AppText>
          ) : null}
        </View>
        <AppText variant="caption" tone="muted">
          {t('tools.icm.payoutsHint')}
        </AppText>
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="heading">{t('tools.icm.stacks')}</AppText>
        {stacks.map((s, i) => (
          <View key={i} style={styles.playerRow}>
            <AppText variant="label" style={styles.name}>
              {t('tools.icm.player', { n: i + 1 })}
            </AppText>
            <NumberField value={s} label={t('tools.icm.player', { n: i + 1 })} onChange={(v) => setStacks((xs) => xs.map((x, j) => (j === i ? v : x)))} wide />
            <View style={styles.numbers}>
              <AppText variant="caption" tone="muted" numeric>
                {totalChips > 0 && stackValues[i] !== null ? t('tools.icm.chips', { pct: pct(stackValues[i]! / totalChips) }) : '—'}
              </AppText>
              <AppText variant="label" strong tone="cyan" numeric>
                {equity ? t('tools.icm.share', { pct: pct(equity[i]! / totalPrize) }) : '—'}
              </AppText>
            </View>
          </View>
        ))}
        <View style={styles.row}>
          {stacks.length < MAX_PLAYERS ? (
            <AppText variant="label" tone="cyan" onPress={() => setStacks((xs) => [...xs, '1000'])}>
              {t('tools.icm.addPlayer')}
            </AppText>
          ) : null}
          {stacks.length > 2 ? (
            <AppText variant="label" tone="magenta" onPress={() => setStacks((xs) => xs.slice(0, -1))}>
              {t('tools.icm.removePlayer')}
            </AppText>
          ) : null}
        </View>
        {!valid ? (
          <AppText variant="caption" tone="danger">
            {t('tools.icm.invalid')}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.card, { borderColor: withAlpha(colors.amber, 0.5), backgroundColor: colors.surface }]}>
        <AppText variant="heading">{t('tools.icm.callTitle')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('tools.icm.callHint')}
        </AppText>
        <Chips label={t('tools.icm.hero')} options={playerOptions} value={heroIdx} onChange={setHero} />
        <Chips label={t('tools.icm.villain')} options={playerOptions} value={villainIdx} onChange={setVillain} />
        <View style={styles.playerRow}>
          <AppText variant="label" style={styles.name}>
            {t('tools.icm.dead')}
          </AppText>
          <NumberField value={dead} label={t('tools.icm.dead')} onChange={setDead} wide />
        </View>
        {heroIdx === villainIdx ? (
          <AppText variant="caption" tone="muted">
            {t('tools.icm.samePlayer')}
          </AppText>
        ) : call ? (
          <View style={styles.callResult} accessibilityLiveRegion="polite">
            <AppText>
              {t('tools.icm.need', { icm: pct(call.requiredEquity), chips: pct(call.chipEquity) })}
            </AppText>
            <AppText variant="caption" tone="muted" numeric>
              {t('tools.icm.factor', { factor: Number.isFinite(call.bubbleFactor) ? formatNumber(call.bubbleFactor, 2) : '∞' })}
            </AppText>
          </View>
        ) : null}
      </View>
      <Button
        label={t('tools.icm.reset')}
        kind="secondary"
        onPress={() => {
          setStacks(['5000', '3000', '2000']);
          setPayouts(PAYOUT_PRESETS.top3!);
          setPreset('top3');
          setDead('0');
        }}
      />
      <AppText variant="caption" tone="muted">
        {t('tools.icm.note')}
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    gap: space.lg,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  place: {
    gap: 2,
  },
  input: {
    width: 64,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    fontSize: 16,
  },
  wide: {
    width: 96,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  name: {
    width: 84,
  },
  numbers: {
    flex: 1,
    alignItems: 'flex-end',
  },
  callResult: {
    gap: space.xs,
  },
});
