import {
  createSeededRng,
  decisionsOf,
  handEquity,
  type Card,
  type Decision,
  type HandEvent,
  type HandState,
  type Street,
} from '@pokerall/poker-engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { PlayingCard } from '@/components/table/PlayingCard';
import { formatChips } from '@/lib/format';
import { handOutcome, seatName, splitNote } from '@/table/describe';
import type { HandRecord, SeatInfo } from '@/table/useTableGame';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type ActionEvent = Extract<HandEvent, { type: 'action' }>;

type Line = { seat: number; action: ActionEvent; decision?: Decision };
type Block = { street: Street; board: Card[]; lines: Line[] };

/** Actions grouped by street; each of the hero's actions carries the numbers of that decision. */
function blocksOf(hand: HandState, decisions: Decision[], hero: number): Block[] {
  const blocks: Block[] = [{ street: 'preflop', board: [], lines: [] }];
  let next = 0;
  for (const e of hand.events) {
    if (e.type === 'street') blocks.push({ street: e.street, board: e.board, lines: [] });
    else if (e.type === 'action') {
      const decision = e.seat === hero ? decisions[next++] : undefined;
      blocks[blocks.length - 1]!.lines.push({ seat: e.seat, action: e, decision });
    }
  }
  return blocks;
}

/** Share of the pot the hero wins against the opponents' real cards at the moment of the decision. */
function openCardEquity(d: Decision, hero: number, seed: number): number | null {
  const opponents = d.before.players.filter((p) => !p.folded && p.seat !== hero);
  if (opponents.length === 0) return null;
  const dead = d.before.players.filter((p) => p.folded).flatMap((p) => p.holeCards);
  const rng = createSeededRng(new Uint8Array(32).fill(seed % 251));
  const hands = [d.before.players[hero]!.holeCards, ...opponents.map((p) => p.holeCards)];
  return handEquity(hands, d.before.board, { dead, rng, iterations: 4000 }).equity[0]!;
}

function CardRow({ cards }: { cards: readonly Card[] }) {
  return (
    <View style={styles.cardRow}>
      {cards.map((c) => (
        <PlayingCard key={c} card={c} size="sm" />
      ))}
    </View>
  );
}

type Props = {
  record: HandRecord;
  /** Hand number in the match, from 1. */
  number: number;
  seats: SeatInfo[];
  hero: number;
};

/** One hand of the match: a summary line, and on tap every street with the numbers behind each decision. */
export function HandReview({ record, number, seats, hero }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { hand } = record;
  const net = record.net[hero]!;
  const me = hand.players[hero]!;

  const details = useMemo(() => {
    if (!open) return null;
    const decisions = decisionsOf(hand, hero);
    const equities = decisions.map((d, i) => openCardEquity(d, hero, number * 7 + i));
    return { blocks: blocksOf(hand, decisions, hero), equities, decisions };
  }, [open, hand, hero, number]);

  const actionText = (a: ActionEvent) => {
    if (a.allIn && a.action !== 'fold' && a.action !== 'check') return t('analysis.act.allIn', { amount: formatChips(a.streetBet) });
    if (a.action === 'call') return t('analysis.act.call', { amount: formatChips(a.added) });
    if (a.action === 'bet' || a.action === 'raise') return t(`analysis.act.${a.action}`, { amount: formatChips(a.streetBet) });
    return t(`analysis.act.${a.action}`);
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t('analysis.hand', { n: number })}, ${net > 0 ? '+' : ''}${formatChips(net)}`}
        style={styles.summary}>
        <View style={styles.summaryTop}>
          <AppText variant="label" strong>
            {t('analysis.hand', { n: number })}
          </AppText>
          <AppText variant="caption" tone="muted">
            {me.position}
          </AppText>
          {record.split ? (
            <AppText variant="caption" tone="amber">
              {t('analysis.byEquity')}
            </AppText>
          ) : null}
          <View style={styles.flex} />
          <AppText variant="label" strong numeric tone={net > 0 ? 'lime' : net < 0 ? 'magenta' : 'muted'}>
            {`${net > 0 ? '+' : ''}${formatChips(net)}`}
          </AppText>
          {open ? <ChevronUpIcon color={colors.textMuted} size={16} /> : <ChevronDownIcon color={colors.textMuted} size={16} />}
        </View>
        <View style={styles.summaryCards}>
          <CardRow cards={me.holeCards} />
          {hand.board.length > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <CardRow cards={hand.board} />
        </View>
      </Pressable>

      {details ? (
        <View style={styles.details}>
          {hand.players
            .filter((p) => p.seat !== hero)
            .map((p) => (
              <View key={p.seat} style={styles.opponent}>
                <AppText variant="caption" tone="muted" style={styles.opponentName} numberOfLines={1}>
                  {`${seatName(seats[p.seat]!, t)}, ${p.position}`}
                </AppText>
                <CardRow cards={p.holeCards} />
                {p.folded ? (
                  <AppText variant="caption" tone="muted">
                    {t('analysis.act.fold')}
                  </AppText>
                ) : null}
              </View>
            ))}

          {details.blocks.map((block) => (
            <View key={block.street} style={styles.block}>
              <View style={styles.blockHead}>
                <AppText variant="caption" strong tone="cyan">
                  {t(`analysis.streets.${block.street}`)}
                </AppText>
                {block.street === 'preflop' ? (
                  <AppText variant="caption" tone="muted" numeric>
                    {t('analysis.blinds', { sb: formatChips(hand.config.smallBlind), bb: formatChips(hand.config.bigBlind) })}
                  </AppText>
                ) : (
                  <CardRow cards={block.board} />
                )}
              </View>
              {block.lines.map((line, i) => {
                const isHero = line.seat === hero;
                const d = line.decision;
                const eq = d ? details.equities[details.decisions.indexOf(d)] : null;
                return (
                  <View key={i} style={[styles.line, isHero && { borderLeftColor: withAlpha(colors.cyan, 0.6) }]}>
                    <AppText variant="caption" strong={isHero} numeric>
                      {`${seatName(seats[line.seat]!, t)}: ${actionText(line.action)}`}
                    </AppText>
                    {d && d.potOdds !== null ? (
                      <AppText variant="caption" tone="muted" numeric>
                        {t('analysis.potOdds', {
                          call: formatChips(d.toCall),
                          pot: formatChips(d.pot),
                          need: Math.round(d.potOdds * 100),
                        })}
                      </AppText>
                    ) : null}
                    {d && eq !== null && eq !== undefined ? (
                      <AppText
                        variant="caption"
                        numeric
                        tone={d.potOdds === null ? 'muted' : eq >= d.potOdds ? 'lime' : 'magenta'}>
                        {t('analysis.equity', { pct: Math.round(eq * 100) })}
                      </AppText>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.outcome}>
            <AppText variant="label" strong tone="lime" numeric>
              {handOutcome(record, seats, hero, t)}
            </AppText>
            {record.split ? (
              <AppText variant="caption" tone="muted">
                {splitNote(record, hero, t)}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  summary: {
    padding: space.md,
    gap: space.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  summaryCards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  divider: {
    width: 1,
    height: 28,
  },
  flex: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 3,
  },
  details: {
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    gap: space.md,
  },
  opponent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  opponentName: {
    width: 110,
  },
  block: {
    gap: space.xs,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 24,
  },
  outcome: {
    gap: 2,
  },
  line: {
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    paddingLeft: space.sm,
    gap: 1,
  },
});
