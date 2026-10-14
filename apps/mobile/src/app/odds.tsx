import {
  cardToString,
  createSeededRng,
  describeHand,
  rangeCombos,
  shuffledDeck,
  type Card,
  type EquityResult,
  type Holding,
} from '@pokerall/poker-engine';
import { getRandomBytes } from 'expo-crypto';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { PlayingCard } from '@/components/table/PlayingCard';
import { TableFelt } from '@/components/table/TableFelt';
import { CardPicker } from '@/components/tools/CardPicker';
import { Chips } from '@/components/tools/Chips';
import { formatNumber } from '@/lib/format';
import { handNameKey } from '@/table/describe';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';
import { runEquity } from '@/tools/equityRunner';

const MAX_SEATS = 9;
const SEAT_W = 76;
const SEAT_H = 84;
const FELT_H = 540;

type Seat = { cards: [Card | null, Card | null]; folded: boolean };
type Slot = { kind: 'seat'; seat: number; index: 0 | 1 } | { kind: 'board'; index: number };
type Stage = 'hands' | 'flop' | 'turn' | 'river' | 'done';

const emptySeats = (): Seat[] => Array.from({ length: MAX_SEATS }, () => ({ cards: [null, null], folded: false }));

/** Every two-card hand: the range of a seat whose cards nobody knows. */
const ANY_HAND = new Float32Array(1326).fill(1);

/**
 * The poker calculator: deal cards onto a table yourself (or let it deal), street by street, and watch every
 * player's chance to win the pot change. Free; the Pro equity calculator adds ranges and dead cards.
 */
export default function OddsTableScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [players, setPlayers] = useState(4);
  const [seats, setSeats] = useState<Seat[]>(emptySeats);
  const [board, setBoard] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [width, setWidth] = useState(0);
  const [rng] = useState(() => createSeededRng(getRandomBytes(32)));
  const [result, setResult] = useState<{ key: string; value: EquityResult; seats: number[]; done: boolean } | null>(null);

  const active = seats.slice(0, players);
  const known = useMemo(() => {
    const out: Card[] = board.filter((c): c is Card => c !== null);
    for (const s of seats.slice(0, players)) for (const c of s.cards) if (c !== null) out.push(c);
    return out;
  }, [board, seats, players]);
  const taken = useMemo(() => new Set(known), [known]);

  const boardCards = board.filter((c): c is Card => c !== null);
  const firstEmpty = board.findIndex((c) => c === null);
  const boardOk = (firstEmpty === -1 || board.slice(firstEmpty).every((c) => c === null)) && boardCards.length !== 1 && boardCards.length !== 2;

  // Seats in the hand: not folded and not holding just one card.
  const inHand = active.map((s, i) => ({ s, i })).filter(({ s }) => !s.folded && (s.cards[0] === null) === (s.cards[1] === null));
  const ready = boardOk && inHand.length >= 2;
  const key = JSON.stringify({ players, seats: active, board });

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const holdings: Holding[] = inHand.map(({ s }) =>
      s.cards[0] !== null && s.cards[1] !== null ? { cards: [s.cards[0], s.cards[1]] } : { range: rangeCombos(ANY_HAND, known) },
    );
    // Cards of folded players and of seats with only one card are out of the deck.
    const dead = active.flatMap((s, i) => (inHand.some((h) => h.i === i) ? [] : s.cards.filter((c): c is Card => c !== null)));
    const order = inHand.map(({ i }) => i);
    runEquity(
      holdings,
      boardCards,
      dead,
      ({ result: value, done, total }) => {
        if (!cancelled) setResult({ key, value, seats: order, done: done >= total });
      },
      () => cancelled,
    ).catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // The key holds everything the result depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const current = result?.key === key && ready ? result : null;
  const equityOf = (seat: number): number | null => {
    if (!current) return null;
    const at = current.seats.indexOf(seat);
    return at < 0 ? null : (current.value.equity[at] ?? null);
  };
  const best = current ? Math.max(...current.value.equity) : 0;

  const allKnown = inHand.every(({ s }) => s.cards[0] !== null);
  const stage: Stage = !active.every((s) => s.folded || s.cards.every((c) => c !== null))
    ? 'hands'
    : boardCards.length < 3
      ? 'flop'
      : boardCards.length < 4
        ? 'turn'
        : boardCards.length < 5
          ? 'river'
          : 'done';

  /** Deals what comes next: missing hole cards, then the flop, the turn, the river. */
  const dealNext = () => {
    const deck = shuffledDeck(rng).filter((c) => !taken.has(c));
    let k = 0;
    if (stage === 'hands') {
      setSeats((ss) =>
        ss.map((s, i) => (i < players && !s.folded ? { ...s, cards: s.cards.map((c) => c ?? deck[k++]!) as [Card, Card] } : s)),
      );
      return;
    }
    if (stage === 'done') {
      setSeats(emptySeats());
      setBoard([null, null, null, null, null]);
      return;
    }
    const count = stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;
    setBoard((b) => b.map((c, i) => (i < count ? (c ?? deck[k++]!) : c)));
  };

  const pick = (card: Card | null) => {
    if (!slot) return;
    if (slot.kind === 'seat') {
      setSeats((ss) =>
        ss.map((s, i) => {
          if (i !== slot.seat) return s;
          const cards: [Card | null, Card | null] = [...s.cards];
          cards[slot.index] = card;
          return { ...s, cards };
        }),
      );
    } else {
      setBoard((b) => b.map((c, i) => (i === slot.index ? card : c)));
    }
    setSlot(null);
  };

  const slotCard = slot ? (slot.kind === 'seat' ? seats[slot.seat]!.cards[slot.index] : board[slot.index]) : null;

  // Seats around the oval drawn by TableFelt, the first one at the bottom.
  const H = FELT_H;
  const positions = Array.from({ length: players }, (_, i) => {
    const angle = Math.PI / 2 + (i * 2 * Math.PI) / players;
    const x = width / 2 + width * 0.4 * Math.cos(angle);
    const y = H * 0.46 + H * 0.33 * Math.sin(angle);
    return {
      left: Math.min(Math.max(x - SEAT_W / 2, 0), Math.max(0, width - SEAT_W)),
      top: Math.min(Math.max(y - SEAT_H / 2, 0), H - SEAT_H),
    };
  });

  const stageLabel = { hands: 'deal', flop: 'flop', turn: 'turn', river: 'river', done: 'again' }[stage];

  return (
    <Screen header={<BackButton label={t('play.title')} fallback="/" />} title={t('odds.title')} subtitle={t('odds.subtitle')}>
      <Chips
        label={t('odds.players')}
        options={Array.from({ length: MAX_SEATS - 1 }, (_, i) => ({ value: i + 2, label: String(i + 2) }))}
        value={players}
        onChange={setPlayers}
      />

      <View style={[styles.table, { height: H }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <TableFelt width={width} height={H} />
        {width > 0 ? (
          <>
            <View style={[styles.center, { top: H * 0.46 - 40 }]} pointerEvents="box-none">
              <View style={styles.cards}>
                {board.map((c, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setSlot({ kind: 'board', index: i })}
                    accessibilityRole="button"
                    accessibilityLabel={c === null ? t('odds.boardCard', { n: i + 1 }) : cardToString(c)}>
                    {c === null ? (
                      <View style={[styles.emptyCard, { borderColor: withAlpha(colors.text, 0.25) }]} />
                    ) : (
                      <PlayingCard card={c} size="sm" />
                    )}
                  </Pressable>
                ))}
              </View>
              <AppText variant="caption" tone="muted" style={styles.centerText}>
                {!boardOk ? t('odds.boardRule') : !ready ? t('odds.needPlayers') : current ? (current.done ? t(`odds.street.${boardCards.length}`) : t('odds.counting')) : t('odds.counting')}
              </AppText>
            </View>

            {positions.map((pos, i) => {
              const s = seats[i]!;
              const eq = equityOf(i);
              const leader = eq !== null && current && eq === best && eq > 0;
              const name =
                boardCards.length >= 3 && s.cards[0] !== null && s.cards[1] !== null && !s.folded
                  ? t(handNameKey(describeHand([s.cards[0], s.cards[1], ...boardCards]).categoryId, [s.cards[0], s.cards[1]]))
                  : null;
              return (
                <View key={i} style={[styles.seat, pos, { opacity: s.folded ? 0.45 : 1 }]}>
                  <View style={styles.cards}>
                    {s.cards.map((c, k) => (
                      <Pressable
                        key={k}
                        onPress={() => setSlot({ kind: 'seat', seat: i, index: k as 0 | 1 })}
                        accessibilityRole="button"
                        accessibilityLabel={c === null ? t('odds.seatCard', { n: i + 1 }) : cardToString(c)}>
                        {c === null ? (
                          <View style={[styles.emptyCard, { borderColor: withAlpha(colors.cyan, 0.5), backgroundColor: withAlpha(colors.bg, 0.6) }]} />
                        ) : (
                          <PlayingCard card={c} size="sm" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => setSeats((ss) => ss.map((x, j) => (j === i ? { ...x, folded: !x.folded } : x)))}
                    accessibilityRole="button"
                    accessibilityHint={t(s.folded ? 'odds.unfoldHint' : 'odds.foldHint')}
                    hitSlop={6}
                    style={[styles.badge, { backgroundColor: withAlpha(colors.bg, 0.85), borderColor: leader ? colors.lime : colors.border }]}>
                    <AppText variant="caption" strong numeric style={{ color: s.folded ? colors.textMuted : leader ? colors.lime : colors.text }}>
                      {s.folded ? t('odds.folded') : eq === null ? t('odds.player', { n: i + 1 }) : `${formatNumber(eq * 100, eq >= 0.995 || eq < 0.005 ? 0 : 1)}%`}
                    </AppText>
                  </Pressable>
                  {name ? (
                    <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.handName}>
                      {name}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}
      </View>

      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button label={t(`odds.next.${stageLabel}`)} onPress={dealNext} />
        </View>
        <View style={styles.flex}>
          <Button
            label={t('odds.clear')}
            kind="secondary"
            onPress={() => {
              setSeats(emptySeats());
              setBoard([null, null, null, null, null]);
            }}
          />
        </View>
      </View>
      <AppText variant="caption" tone="muted">
        {allKnown ? t('odds.help') : t('odds.helpRandom')}
      </AppText>

      <CardPicker
        visible={slot !== null}
        title={slot?.kind === 'board' ? t('odds.boardCard', { n: slot.index + 1 }) : t('odds.seatCard', { n: (slot?.kind === 'seat' ? slot.seat : 0) + 1 })}
        taken={taken}
        onPick={pick}
        onClear={slotCard !== null && slotCard !== undefined ? () => pick(null) : undefined}
        onClose={() => setSlot(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: space.xs,
  },
  centerText: {
    textAlign: 'center',
    maxWidth: 220,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
  },
  emptyCard: {
    width: 30,
    height: 42,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 5,
  },
  seat: {
    position: 'absolute',
    width: SEAT_W,
    height: SEAT_H,
    alignItems: 'center',
    gap: 3,
  },
  badge: {
    minWidth: 56,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  handName: {
    fontSize: 10,
    lineHeight: 12,
    maxWidth: SEAT_W + 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
