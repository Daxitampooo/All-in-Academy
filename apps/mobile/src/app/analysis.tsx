import { statRates, statsFor, type StatRates } from '@pokerall/poker-engine';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { botById, seriesTarget } from '@/bots/catalog';
import { HandReview } from '@/components/analysis/HandReview';
import { ResultChart } from '@/components/analysis/ResultChart';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { formatChips, formatDecimal } from '@/lib/format';
import { useMatchReview } from '@/store/matchReview';
import { seatName } from '@/table/describe';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const HERO = 0;
/** Below this many hands the stats are shown with a warning that they're rough. */
const RELIABLE_HANDS = 100;

const STAT_KEYS: (keyof StatRates)[] = ['vpip', 'pfr', 'threeBet', 'af', 'wtsd', 'wsd'];

export default function AnalysisScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const match = useMatchReview((s) => s.match);

  const summary = useMemo(() => {
    if (!match || match.hands.length === 0) return null;
    const hands = match.hands.map((r) => r.hand);
    const counters = statsFor(hands, HERO);
    const bigBlind = hands[0]!.config.bigBlind;
    let running = 0;
    const curve = [0, ...match.hands.map((r) => (running += r.net[HERO]! / bigBlind))];
    const net = match.hands.reduce((sum, r) => sum + r.net[HERO]!, 0);
    return {
      rates: statRates(counters),
      net,
      bigBlind,
      curve,
      potsWon: match.hands.filter((r) => r.won[HERO]! > 0).length,
      splits: match.hands.filter((r) => r.split).length,
    };
  }, [match]);

  const header = <BackButton label={t('analysis.back')} fallback="/bots" />;

  if (!match || !summary) {
    return (
      <Screen header={header} title={t('analysis.title')}>
        <AppText tone="muted">{t('analysis.empty')}</AppText>
        <Button label={t('table.toBots')} onPress={() => router.replace('/bots')} />
      </Screen>
    );
  }

  const { mode, result, series } = match;
  const target = mode.kind === 'hu' ? seriesTarget(botById(mode.botId)!) : 1;
  const where =
    mode.kind === 'hu'
      ? t('analysis.opponent', { name: seatName(match.seats[1]!, t) })
      : t('analysis.table', { league: t(`bots.leagues.${mode.league}`) });
  const outcome = mode.kind === 'six' ? t('analysis.practice') : result ? t(result.heroWon ? 'analysis.won' : 'analysis.lost') : t('analysis.unfinished');
  const outcomeTone = mode.kind === 'six' || !result ? 'muted' : result.heroWon ? 'lime' : 'magenta';
  const sign = (v: number) => (v > 0 ? '+' : '');
  const percent = (v: number | null) => (v === null ? t('analysis.noData') : `${Math.round(v * 100)}%`);
  const statValue = (key: keyof StatRates) => {
    const v = summary.rates[key];
    if (key !== 'af') return percent(v);
    if (v === null) return t('analysis.noData');
    return v === Infinity ? '∞' : formatDecimal(v);
  };

  return (
    <Screen header={header} title={mode.kind === 'hu' ? t('analysis.title') : t('analysis.sessionTitle')}>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="caption" tone="muted">
          {where}
        </AppText>
        <AppText variant="title" tone={outcomeTone}>
          {outcome}
        </AppText>
        {series && target > 1 ? (
          <AppText variant="label" tone="cyan">
            {series.over === 'won'
              ? t('table.seriesWon', series.series)
              : series.over === 'lost'
                ? t('table.seriesLost', { ...series.series, name: seatName(match.seats[1]!, t) })
                : t('table.seriesScore', { ...series.series, target })}
          </AppText>
        ) : null}
        <View style={styles.netRow}>
          <AppText variant="display" numeric tone={summary.net > 0 ? 'lime' : summary.net < 0 ? 'magenta' : 'text'}>
            {`${sign(summary.net)}${formatChips(summary.net)}`}
          </AppText>
          <AppText variant="label" tone="muted" numeric>
            {t('analysis.netBB', { bb: `${sign(summary.net)}${formatDecimal(summary.net / summary.bigBlind)}` })}
          </AppText>
        </View>
        <View style={styles.cells}>
          <Cell label={t('analysis.hands')} value={String(match.hands.length)} />
          <Cell label={t('analysis.potsWon')} value={String(summary.potsWon)} />
          {mode.kind === 'hu' ? <Cell label={t('analysis.splits')} value={String(summary.splits)} /> : null}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="heading">{t('analysis.chartTitle')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('analysis.chartUnit')}
        </AppText>
        <ResultChart values={summary.curve} label={t('analysis.chartTitle')} />
      </View>

      <View style={styles.section}>
        <AppText variant="heading">{t('analysis.statsTitle')}</AppText>
        {match.hands.length < RELIABLE_HANDS ? (
          <AppText variant="caption" tone="amber">
            {t('analysis.smallSample', { n: RELIABLE_HANDS })}
          </AppText>
        ) : null}
        <View style={[styles.stats, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {STAT_KEYS.map((key, i) => (
            <View key={key} style={[styles.stat, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.statText}>
                <AppText variant="label" strong>
                  {t(`analysis.stats.${key}.name`)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t(`analysis.stats.${key}.desc`)}
                </AppText>
              </View>
              <AppText variant="heading" numeric tone="cyan">
                {statValue(key)}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="heading">{t('analysis.handsTitle')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('analysis.handsNote')}
        </AppText>
        {match.hands.map((record, i) => (
          <HandReview key={i} record={record} number={i + 1} seats={match.seats} hero={HERO} />
        ))}
      </View>
    </Screen>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <AppText variant="heading" numeric>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    marginTop: space.xs,
  },
  cells: {
    flexDirection: 'row',
    gap: space.lg,
    marginTop: space.sm,
  },
  cell: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: space.sm,
  },
  stats: {
    borderWidth: 1,
    borderRadius: radius.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  statText: {
    flex: 1,
    gap: 2,
  },
});
