import type { Card, HandEvent, HandState, Street } from '@pokerall/poker-engine';
import { potSize } from '@pokerall/poker-engine';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StepIcon } from '@/components/icons';
import { BetChip } from '@/components/table/BetChip';
import { PlayingCard } from '@/components/table/PlayingCard';
import { RoomBackdrop } from '@/components/table/RoomBackdrop';
import { TableFelt } from '@/components/table/TableFelt';
import { actionText, seatLabel } from '@/hands/describe';
import { formatChips } from '@/lib/format';
import { useTableLook } from '@/looks/LookProvider';
import type { SavedHand } from '@/store/hands';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type ActionEvent = Extract<HandEvent, { type: 'action' }>;

/** Seat spots as fractions of the box, by position relative to the hero (0 = hero, then clockwise). */
const SPOTS: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: 0.5, y: 0.84 },
    { x: 0.5, y: 0.14 },
  ],
  6: [
    { x: 0.5, y: 0.86 },
    { x: 0.14, y: 0.66 },
    { x: 0.14, y: 0.3 },
    { x: 0.5, y: 0.12 },
    { x: 0.86, y: 0.3 },
    { x: 0.86, y: 0.66 },
  ],
};

function lastAction(state: HandState): ActionEvent | null {
  for (let i = state.events.length - 1; i >= 0; i--) {
    const e = state.events[i]!;
    if (e.type === 'action') return e;
  }
  return null;
}

export const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

/** First step of each street that was reached. */
export function streetSteps(states: HandState[]): Partial<Record<Street, number>> {
  const out: Partial<Record<Street, number>> = {};
  states.forEach((s, i) => {
    const street = s.phase === 'complete' ? null : s.phase;
    if (street && out[street] === undefined) out[street] = i;
  });
  return out;
}

type Props = {
  hand: SavedHand;
  states: HandState[];
  step: number;
  onStep: (step: number) => void;
  nickname: string | null;
};

/** The hand street by street: the table at each step, with buttons to move through it. */
export function Replayer({ hand, states, step, onStep, nickname }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const look = useTableLook();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [openCards, setOpenCards] = useState(false);
  const state = states[step]!;
  const final = states[states.length - 1]!;
  const n = state.players.length;
  const spots = SPOTS[n] ?? SPOTS[6]!;
  const last = step > 0 ? lastAction(state) : null;
  const shown = new Set<number>();
  for (const e of final.events) if (e.type === 'showdown') shown.add(e.seat);
  const end = step === states.length - 1;
  const streets = streetSteps(states);

  const caption = end
    ? t('hands.replay.end')
    : last
      ? `${seatLabel(hand, last.seat, t, nickname)}: ${actionText(last, t)}`
      : t('hands.replay.deal');

  const cardsOf = (seat: number): (Card | null)[] => {
    const p = state.players[seat]!;
    const visible = seat === hand.hero || openCards || (end && shown.has(seat));
    return visible ? [...p.holeCards] : [null, null];
  };

  const control = (kind: 'first' | 'prev' | 'next' | 'last', a11y: string, target: number, disabled: boolean) => (
    <Pressable
      onPress={() => onStep(target)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [
        styles.control,
        { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface, opacity: disabled ? 0.4 : 1 },
      ]}>
      <StepIcon kind={kind} color={colors.cyan} />
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.table, { height: n > 2 ? 400 : 330, borderColor: colors.border }]}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <RoomBackdrop room={look.room} />
        {/* With six seats the felt is drawn smaller, so the seats on the sides sit outside its rim. */}
        <View style={[styles.felt, n > 2 ? { left: size.w * 0.17, right: size.w * 0.17, top: size.h * 0.05, bottom: size.h * 0.05 } : null]}>
          <TableFelt width={n > 2 ? size.w * 0.66 : size.w} height={n > 2 ? size.h * 0.9 : size.h} />
        </View>
        {size.w > 0 ? (
          <>
            <View style={[styles.center, { top: size.h * 0.4 - 36 }]} pointerEvents="none">
              <AppText variant="caption" strong tone="amber" numeric>
                {t('table.pot', { amount: formatChips(potSize(state)) })}
              </AppText>
              <View style={styles.cards}>
                {Array.from({ length: 5 }, (_, i) =>
                  state.board[i] !== undefined ? (
                    <PlayingCard key={i} card={state.board[i]!} size="sm" />
                  ) : (
                    <View key={i} style={[styles.slot, { borderColor: withAlpha(colors.textMuted, 0.3) }]} />
                  ),
                )}
              </View>
            </View>
            {state.players.map((p) => {
              const rel = (p.seat - hand.hero + n) % n;
              const spot = spots[rel]!;
              const won = end ? (final.result?.won[p.seat] ?? 0) : 0;
              const acted = last?.seat === p.seat && !end;
              return (
                <View key={p.seat} style={[styles.seat, { left: spot.x * size.w - 50, top: spot.y * size.h - 40 }]}>
                  <AppText variant="caption" strong numberOfLines={1} tone={p.seat === hand.hero ? 'cyan' : 'text'}>
                    {`${seatLabel(hand, p.seat, t, nickname)} · ${p.position}`}
                  </AppText>
                  <View style={[styles.cards, p.folded && styles.folded]}>
                    {cardsOf(p.seat).map((c, i) => (
                      <PlayingCard key={i} card={c} size="sm" />
                    ))}
                  </View>
                  <AppText variant="caption" tone="muted" numeric>
                    {formatChips(p.stack)}
                  </AppText>
                  {p.folded ? (
                    <AppText variant="caption" tone="muted">
                      {t('analysis.act.fold')}
                    </AppText>
                  ) : won > 0 ? (
                    <AppText variant="caption" strong tone="lime" numeric>
                      {`+${formatChips(won)}`}
                    </AppText>
                  ) : p.streetBet > 0 ? (
                    <BetChip amount={p.streetBet} />
                  ) : null}
                  {acted ? <View style={[styles.actedDot, { backgroundColor: colors.cyan }]} /> : null}
                </View>
              );
            })}
          </>
        ) : null}
      </View>

      <View style={[styles.captionBox, { borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
        <AppText variant="caption" tone="muted" numeric>
          {t('hands.replay.step', { n: step, total: states.length - 1 })}
        </AppText>
        <AppText variant="label" strong numberOfLines={2}>
          {caption}
        </AppText>
      </View>

      <View style={styles.controls}>
        {control('first', t('hands.replay.first'), 0, step === 0)}
        {control('prev', t('hands.replay.prev'), Math.max(0, step - 1), step === 0)}
        {control('next', t('hands.replay.next'), Math.min(states.length - 1, step + 1), end)}
        {control('last', t('hands.replay.last'), states.length - 1, end)}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streets}>
        {STREETS.filter((s) => streets[s] !== undefined).map((s) => {
          const at = streets[s]!;
          const next = STREETS.slice(STREETS.indexOf(s) + 1).map((x) => streets[x]).find((x) => x !== undefined) ?? states.length - 1;
          const active = step >= at && (step < next || (s === 'river' && !end));
          return (
            <Pressable
              key={s}
              onPress={() => onStep(at)}
              accessibilityRole="button"
              style={[styles.chip, { borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? withAlpha(colors.cyan, 0.12) : colors.surface }]}>
              <AppText variant="caption" strong tone={active ? 'cyan' : 'text'}>
                {t(`analysis.streets.${s}`)}
              </AppText>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onStep(states.length - 1)}
          accessibilityRole="button"
          style={[styles.chip, { borderColor: end ? colors.cyan : colors.border, backgroundColor: end ? withAlpha(colors.cyan, 0.12) : colors.surface }]}>
          <AppText variant="caption" strong tone={end ? 'cyan' : 'text'}>
            {t('hands.replay.result')}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setOpenCards(!openCards)}
          accessibilityRole="switch"
          accessibilityState={{ checked: openCards }}
          style={[styles.chip, { borderColor: openCards ? colors.amber : colors.border, backgroundColor: openCards ? withAlpha(colors.amber, 0.12) : colors.surface }]}>
          <AppText variant="caption" strong tone={openCards ? 'amber' : 'text'}>
            {t('hands.replay.openCards')}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  table: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  felt: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: space.xs,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
  },
  slot: {
    width: 30,
    height: 42,
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  seat: {
    position: 'absolute',
    width: 100,
    alignItems: 'center',
    gap: 2,
  },
  folded: {
    opacity: 0.35,
  },
  actedDot: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  captionBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: space.sm,
  },
  control: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 48,
  },
  streets: {
    gap: space.sm,
    paddingRight: space.lg,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
