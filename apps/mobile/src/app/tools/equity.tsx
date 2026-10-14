import { cardToString, comboCount, rangeCombos, type Card, type EquityResult, type Holding } from '@pokerall/poker-engine';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ProLock } from '@/components/ProLock';
import { Screen } from '@/components/Screen';
import { CardPicker } from '@/components/tools/CardPicker';
import { CardSlot } from '@/components/tools/CardSlot';
import { Chips } from '@/components/tools/Chips';
import { RangeEditor } from '@/components/tools/RangeEditor';
import { formatNumber } from '@/lib/format';
import { usePro } from '@/store/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha, type HueName } from '@/theme/tokens';
import { runEquity } from '@/tools/equityRunner';
import { readRange } from '@/tools/ranges';

type Player = { mode: 'cards'; cards: [Card | null, Card | null] } | { mode: 'range'; text: string };
type Slot = { kind: 'player'; player: number; index: 0 | 1 } | { kind: 'board'; index: number } | { kind: 'dead'; index: number };

const PLAYER_COLORS: HueName[] = ['cyan', 'magenta', 'lime', 'amber', 'violet', 'orange'];
const MAX_PLAYERS = 6;
const MAX_DEAD = 6;

const emptyPlayer = (): Player => ({ mode: 'cards', cards: [null, null] });

export default function EquityScreen() {
  const { t } = useTranslation();
  const pro = usePro();
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('tools.equity.title')} subtitle={t('tools.equity.subtitle')}>
      {pro ? <EquityCalculator /> : <ProLock what={t('tools.equity.pro')} />}
    </Screen>
  );
}

function EquityCalculator() {
  const { t } = useTranslation();
  const { colors, hues } = useTheme();
  const [players, setPlayers] = useState<Player[]>([emptyPlayer(), emptyPlayer()]);
  const [board, setBoard] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [dead, setDead] = useState<Card[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [result, setResult] = useState<{ value: EquityResult; progress: number; running: boolean } | null>(null);
  const run = useRef(0);

  const known = useMemo(() => {
    const cards: Card[] = [...board.filter((c): c is Card => c !== null), ...dead];
    for (const p of players) if (p.mode === 'cards') for (const c of p.cards) if (c !== null) cards.push(c);
    return cards;
  }, [board, dead, players]);
  const taken = useMemo(() => new Set(known), [known]);

  const boardCards = board.filter((c): c is Card => c !== null);
  const boardOk = board.findIndex((c) => c === null) === -1 ? true : board.slice(board.findIndex((c) => c === null)).every((c) => c === null);
  const boardLengthOk = [0, 3, 4, 5].includes(boardCards.length) && boardOk;

  /** What is wrong with a player's input, or null. */
  const problem = (p: Player): string | null => {
    if (p.mode === 'cards') return p.cards.every((c) => c !== null) ? null : t('tools.equity.needCards');
    const range = readRange(p.text);
    if (!range) return t('tools.equity.needRange');
    return comboCount(range, known) > 0 ? null : t('tools.equity.rangeBlocked');
  };
  const problems = players.map(problem);
  const ready = problems.every((p) => p === null) && boardLengthOk;

  /** Any change makes the old result wrong. */
  const reset = () => {
    run.current++;
    setResult(null);
  };

  const updatePlayer = (i: number, p: Player) => {
    setPlayers((ps) => ps.map((x, j) => (j === i ? p : x)));
    reset();
  };

  const pick = (card: Card | null) => {
    if (!slot) return;
    if (slot.kind === 'player') {
      const p = players[slot.player]!;
      if (p.mode === 'cards') {
        const cards: [Card | null, Card | null] = [...p.cards];
        cards[slot.index] = card;
        updatePlayer(slot.player, { mode: 'cards', cards });
      }
    } else if (slot.kind === 'board') {
      setBoard((b) => b.map((c, i) => (i === slot.index ? card : c)));
      reset();
    } else {
      setDead((d) => (card === null ? d.filter((_, i) => i !== slot.index) : slot.index < d.length ? d.map((c, i) => (i === slot.index ? card : c)) : [...d, card]));
      reset();
    }
    setSlot(null);
  };

  const calculate = async () => {
    const id = ++run.current;
    const holdings: Holding[] = players.map((p) => {
      if (p.mode === 'cards') return { cards: [p.cards[0]!, p.cards[1]!] };
      return { range: rangeCombos(readRange(p.text)!, known) };
    });
    setResult(null);
    try {
      const final = await runEquity(
        holdings,
        boardCards,
        dead,
        ({ result: value, done, total }) => {
          if (run.current === id) setResult({ value, progress: done / total, running: done < total });
        },
        () => run.current !== id,
      );
      if (final && run.current === id) setResult({ value: final, progress: 1, running: false });
    } catch {
      if (run.current === id) setResult(null);
    }
  };

  return (
    <>
      {players.map((p, i) => {
        const color = hues[PLAYER_COLORS[i]!];
        const issue = problems[i];
        return (
          <View key={i} style={[styles.card, { borderColor: withAlpha(color, 0.5), backgroundColor: colors.surface }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <AppText variant="heading" style={styles.flex}>
                {t('tools.equity.player', { n: i + 1 })}
              </AppText>
              {players.length > 2 ? (
                <AppText
                  variant="label"
                  tone="magenta"
                  onPress={() => {
                    setPlayers((ps) => ps.filter((_, j) => j !== i));
                    reset();
                  }}>
                  {t('tools.equity.remove')}
                </AppText>
              ) : null}
            </View>
            <Chips
              options={[
                { value: 'cards', label: t('tools.equity.cards') },
                { value: 'range', label: t('tools.equity.range') },
              ]}
              value={p.mode}
              onChange={(mode) => updatePlayer(i, mode === 'cards' ? emptyPlayer() : { mode: 'range', text: '' })}
            />
            {p.mode === 'cards' ? (
              <View style={styles.cards}>
                {p.cards.map((c, k) => (
                  <CardSlot
                    key={k}
                    card={c}
                    label={c === null ? t('tools.equity.pickCard') : cardToString(c)}
                    onPress={() => setSlot({ kind: 'player', player: i, index: k as 0 | 1 })}
                  />
                ))}
              </View>
            ) : (
              <Pressable
                onPress={() => setEditing(i)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.rangeBox, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.bg }]}>
                <AppText numberOfLines={3} tone={p.text ? 'text' : 'muted'}>
                  {p.text || t('tools.equity.tapRange')}
                </AppText>
              </Pressable>
            )}
            {issue ? (
              <AppText variant="caption" tone="muted">
                {issue}
              </AppText>
            ) : null}
            {result ? <ResultBar color={color} result={result.value} index={i} /> : null}
          </View>
        );
      })}

      {players.length < MAX_PLAYERS ? (
        <Button
          label={t('tools.equity.addPlayer')}
          kind="secondary"
          onPress={() => {
            setPlayers((ps) => [...ps, emptyPlayer()]);
            reset();
          }}
        />
      ) : null}

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="heading">{t('tools.equity.board')}</AppText>
        <View style={styles.cards}>
          {board.map((c, k) => (
            <CardSlot key={k} card={c} label={c === null ? t('tools.equity.pickBoard') : cardToString(c)} onPress={() => setSlot({ kind: 'board', index: k })} />
          ))}
        </View>
        {!boardLengthOk ? (
          <AppText variant="caption" tone="muted">
            {t('tools.equity.boardRule')}
          </AppText>
        ) : null}
        <AppText variant="heading">{t('tools.equity.dead')}</AppText>
        <View style={styles.cards}>
          {dead.map((c, k) => (
            <CardSlot key={k} card={c} label={cardToString(c)} onPress={() => setSlot({ kind: 'dead', index: k })} />
          ))}
          {dead.length < MAX_DEAD ? <CardSlot card={null} label={t('tools.equity.addDead')} onPress={() => setSlot({ kind: 'dead', index: dead.length })} /> : null}
        </View>
      </View>

      <Button label={result?.running ? t('tools.equity.counting') : t('tools.equity.calculate')} onPress={calculate} disabled={!ready || !!result?.running} />
      {result ? (
        <View style={styles.progressWrap}>
          <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
            <View style={[styles.fill, { width: `${result.progress * 100}%`, backgroundColor: colors.cyan }]} />
          </View>
          <AppText variant="caption" tone="muted" numeric>
            {result.value.exact
              ? t('tools.equity.exact', { n: formatNumber(result.value.samples, 0) })
              : t('tools.equity.sampled', { n: formatNumber(result.value.samples, 0) })}
          </AppText>
        </View>
      ) : null}
      <AppText variant="caption" tone="muted">
        {t('tools.equity.note')}
      </AppText>

      <CardPicker
        visible={slot !== null}
        title={slot?.kind === 'board' ? t('tools.equity.pickBoard') : slot?.kind === 'dead' ? t('tools.equity.addDead') : t('tools.equity.pickCard')}
        taken={taken}
        onPick={pick}
        onClear={slot && slotHasCard(slot, players, board, dead) ? () => pick(null) : undefined}
        onClose={() => setSlot(null)}
      />
      {editing !== null && players[editing]?.mode === 'range' ? (
        <RangeEditor
          key={editing}
          visible
          initial={(players[editing] as { text: string }).text}
          onDone={(text) => {
            updatePlayer(editing, { mode: 'range', text });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function slotHasCard(slot: Slot, players: Player[], board: (Card | null)[], dead: Card[]): boolean {
  if (slot.kind === 'board') return board[slot.index] !== null;
  if (slot.kind === 'dead') return slot.index < dead.length;
  const p = players[slot.player]!;
  return p.mode === 'cards' && p.cards[slot.index] !== null;
}

function ResultBar({ color, result, index }: { color: string; result: EquityResult; index: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const eq = result.equity[index] ?? 0;
  return (
    <View style={styles.result} accessibilityLiveRegion="polite">
      <View style={styles.resultHead}>
        <AppText variant="title" numeric style={{ color }}>
          {formatNumber(eq * 100, 1)}%
        </AppText>
        <AppText variant="caption" tone="muted" numeric>
          {t('tools.equity.winTie', { win: formatNumber((result.win[index] ?? 0) * 100, 1), tie: formatNumber((result.tie[index] ?? 0) * 100, 1) })}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
        <View style={[styles.fill, { width: `${eq * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  flex: {
    flex: 1,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  rangeBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 48,
  },
  result: {
    gap: space.xs,
  },
  resultHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  progressWrap: {
    gap: space.xs,
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
