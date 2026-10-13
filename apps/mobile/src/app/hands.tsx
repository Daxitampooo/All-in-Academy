import type { HandReview } from '@pokerall/coach';
import { startHand } from '@pokerall/poker-engine';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { GRADE_COLOR } from '@/components/hands/DecisionCard';
import { FlagIcon } from '@/components/icons';
import { PlayingCard } from '@/components/table/PlayingCard';
import { ANALYSIS_CONFIG } from '@/config/analysis';
import { bbText, opponentOf, whenText } from '@/hands/describe';
import { useAnalysesLeft } from '@/store/analysisQuota';
import { useHands, type SavedHand } from '@/store/hands';
import { usePro } from '@/store/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, radius, space, withAlpha } from '@/theme/tokens';

type Period = 'all' | 'today' | 'week' | 'month';
type ModeFilter = 'all' | 'hu' | 'six';
type ResultFilter = 'all' | 'won' | 'lost' | 'flagged' | 'reviewed';

const PERIODS: Period[] = ['all', 'today', 'week', 'month'];
const MODES: ModeFilter[] = ['all', 'hu', 'six'];
const RESULTS: ResultFilter[] = ['all', 'won', 'lost', 'flagged', 'reviewed'];
const POSITION_ORDER = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

function since(period: Period): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === 'today') return today;
  if (period === 'week') return today - 6 * 86_400_000;
  if (period === 'month') return today - 29 * 86_400_000;
  return 0;
}

function Chips<T extends string>({ title, values, value, label, onChange }: { title: string; values: T[]; value: T; label: (v: T) => string; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.filter}>
      <AppText variant="caption" tone="muted">
        {title}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={title}>
        {values.map((v) => {
          const active = v === value;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.chip, { borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? withAlpha(colors.cyan, 0.12) : colors.surface }]}>
              <AppText variant="caption" strong tone={active ? 'cyan' : 'text'}>
                {label(v)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HandRow({ hand, review }: { hand: SavedHand; review: HandReview | undefined }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const cards = useMemo(() => startHand(hand.history.config, hand.history.deck).players[hand.hero]!.holeCards, [hand]);
  const bigBlind = hand.history.config.bigBlind;
  let verdict: { text: string; color: string } | null = null;
  if (review) {
    const worst = review.counts.mistake > 0 ? 'mistake' : review.counts.inaccuracy > 0 ? 'inaccuracy' : 'good';
    verdict = {
      text:
        worst === 'good'
          ? t('hands.clean')
          : [
              review.counts.mistake ? t('hands.mistakes', { count: review.counts.mistake }) : '',
              review.counts.inaccuracy ? t('hands.inaccuracies', { count: review.counts.inaccuracy }) : '',
            ]
              .filter(Boolean)
              .join(', '),
      color: colors[GRADE_COLOR[worst]],
    };
  }
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/hand/[id]', params: { id: hand.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface }]}>
      <View style={styles.rowTop}>
        <View style={styles.cards}>
          {cards.map((c) => (
            <PlayingCard key={c} card={c} size="sm" />
          ))}
        </View>
        <View style={styles.flex}>
          <AppText variant="label" strong numberOfLines={1}>
            {`${opponentOf(hand, t)} · ${hand.position}`}
          </AppText>
          <AppText variant="caption" tone="muted">
            {whenText(hand.at, t, i18n.language)}
          </AppText>
        </View>
        {hand.flagged ? <FlagIcon color={colors.amber} filled size={16} /> : null}
        <AppText variant="label" strong numeric tone={hand.net > 0 ? 'lime' : hand.net < 0 ? 'magenta' : 'muted'}>
          {bbText(hand.net, bigBlind, t)}
        </AppText>
      </View>
      {verdict ? (
        <AppText variant="caption" strong style={{ color: verdict.color }}>
          {verdict.text}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export default function HandsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hands = useHands((s) => s.hands);
  const reviews = useHands((s) => s.reviews);
  const pro = usePro();
  const left = useAnalysesLeft(pro);
  const [period, setPeriod] = useState<Period>('all');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [position, setPosition] = useState<string>('all');
  const [result, setResult] = useState<ResultFilter>('all');

  const positions = useMemo(() => {
    const present = new Set(hands.map((h) => h.position as string));
    return ['all', ...POSITION_ORDER.filter((p) => present.has(p))];
  }, [hands]);

  const shown = useMemo(() => {
    const from = since(period);
    return hands
      .filter(
        (h) =>
          h.at >= from &&
          (mode === 'all' || h.mode === mode) &&
          (position === 'all' || h.position === position) &&
          (result === 'all' ||
            (result === 'won' && h.net > 0) ||
            (result === 'lost' && h.net < 0) ||
            (result === 'flagged' && h.flagged) ||
            (result === 'reviewed' && !!reviews[h.id])),
      )
      .reverse();
  }, [hands, mode, period, position, result, reviews]);

  const header = (
    <View style={styles.header}>
      <BackButton label={t('profile.title')} fallback="/profile" />
      <AppText variant="display" accessibilityRole="header">
        {t('hands.title')}
      </AppText>
      <View style={[styles.quota, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="label" strong tone={left === 0 ? 'amber' : 'cyan'} numeric>
          {left === null ? t('coach.unlimited') : t('coach.left', { left, total: ANALYSIS_CONFIG.freePerDay })}
        </AppText>
        <AppText variant="caption" tone="muted">
          {t('hands.quotaHint')}
        </AppText>
      </View>
      {hands.length > 0 ? (
        <>
          <Chips title={t('hands.filters.period')} values={PERIODS} value={period} label={(v) => t(`hands.periods.${v}`)} onChange={setPeriod} />
          <Chips title={t('hands.filters.mode')} values={MODES} value={mode} label={(v) => t(`hands.modes.${v}`)} onChange={setMode} />
          <Chips title={t('hands.filters.position')} values={positions} value={position} label={(v) => (v === 'all' ? t('hands.all') : v)} onChange={setPosition} />
          <Chips title={t('hands.filters.result')} values={RESULTS} value={result} label={(v) => t(`hands.results.${v}`)} onChange={setResult} />
          <AppText variant="caption" tone="muted" numeric>
            {t('hands.count', { count: shown.length })}
          </AppText>
        </>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl }]}
      data={shown}
      keyExtractor={(h) => h.id}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      renderItem={({ item }) => (
        <View style={styles.column}>
          <HandRow hand={item} review={reviews[item.id]} />
        </View>
      )}
      ListEmptyComponent={
        <View style={[styles.column, styles.empty]}>
          <AppText tone="muted">{hands.length ? t('hands.noMatch') : t('hands.empty')}</AppText>
          {hands.length ? null : <Button label={t('hands.play')} onPress={() => router.push('/bots')} />}
        </View>
      }
      initialNumToRender={12}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
  },
  header: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    gap: space.md,
    marginBottom: space.md,
  },
  column: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  quota: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
  },
  filter: {
    gap: space.xs,
  },
  chips: {
    gap: space.xs,
    paddingRight: space.lg,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
  },
  flex: {
    flex: 1,
  },
  empty: {
    gap: space.md,
  },
});
