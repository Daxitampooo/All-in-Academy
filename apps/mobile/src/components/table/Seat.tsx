import type { Card } from '@pokerall/poker-engine';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { PortraitKind } from '@/bots/catalog';
import { AppText } from '@/components/AppText';
import { BotPortrait } from '@/components/BotPortrait';
import { PersonIcon } from '@/components/icons';
import { FlipCard } from '@/components/table/DealtCard';
import type { CardSize } from '@/components/table/PlayingCard';
import { formatChips } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** The little label under a player: their last action, "thinking…", what they won. */
export type SeatStatus = { text: string; tone: 'action' | 'thinking' | 'won' | 'folded' | 'allIn' };

/** Height kept for the status label even when there is none, so the cards below never jump. */
const STATUS_HEIGHT = 22;

function StatusPill({ status }: { status: SeatStatus }) {
  const { colors } = useTheme();
  const tone = {
    action: colors.cyan,
    thinking: colors.amber,
    won: colors.lime,
    folded: colors.textMuted,
    allIn: colors.magenta,
  }[status.tone];
  return (
    <View style={[styles.status, { borderColor: withAlpha(tone, 0.6), backgroundColor: withAlpha(colors.bg, 0.85) }]}>
      <AppText variant="caption" strong numeric numberOfLines={1} style={{ color: tone }}>
        {status.text}
      </AppText>
    </View>
  );
}

function DealerButton({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.dealer, { backgroundColor: colors.amber, borderColor: colors.bg }]} accessibilityLabel={label}>
      <AppText variant="caption" strong style={[styles.dealerText, { color: colors.onAccent }]}>
        D
      </AppText>
    </View>
  );
}

function CardsRow({
  cards,
  size,
  highlight,
  dimLosers,
  dimAll,
  dealtFaceUp,
}: {
  cards: (Card | null)[];
  size: CardSize;
  highlight?: ReadonlySet<Card>;
  dimLosers?: boolean;
  dimAll?: boolean;
  /** The hero's own cards: they slide in and turn over. Other known cards were face down and just turn over. */
  dealtFaceUp?: boolean;
}) {
  return (
    <View style={[styles.cards, size === 'lg' && styles.cardsBig]}>
      {cards.map((c, i) => (
        <Animated.View
          key={`${i}-${c ?? 'x'}`}
          entering={dealtFaceUp || c === null ? FadeInDown.duration(260).delay(i * 90) : undefined}>
          <FlipCard
            card={c}
            size={size}
            delay={dealtFaceUp ? 260 + i * 90 : i * 120}
            highlight={c !== null && !!highlight?.has(c)}
            dim={dimAll || (c !== null && !!dimLosers && !highlight?.has(c))}
          />
        </Animated.View>
      ))}
    </View>
  );
}

export type BotSeatProps = {
  name: string;
  color: string;
  portrait: PortraitKind;
  portraitSize: number;
  /** Name and stack under the portrait, or to its left (seats at the top edge, to save height). */
  textSide: 'below' | 'left';
  stack: number;
  folded: boolean;
  isTurn: boolean;
  isButton: boolean;
  /** null entries are face down; null hides the cards (folded). */
  cards: (Card | null)[] | null;
  cardSize: CardSize;
  highlight?: ReadonlySet<Card>;
  dimLosers?: boolean;
  status: SeatStatus | null;
  dealerLabel: string;
};

/**
 * A bot at the table. The portrait is the anchor: the table places this view so the portrait's center
 * lands on the seat's spot, with everything else stacked under it.
 */
export function BotSeat(props: BotSeatProps) {
  const { name, color, portrait, portraitSize: p, textSide, stack, folded, isTurn, isButton, status } = props;
  const texts = (
    <>
      <AppText variant="caption" strong numberOfLines={1} style={styles.name}>
        {name}
      </AppText>
      <AppText variant="caption" tone="muted" numeric numberOfLines={1}>
        {formatChips(stack)}
      </AppText>
    </>
  );

  return (
    <View
      style={[styles.seat, folded && styles.folded]}
      accessible
      accessibilityLabel={`${name}, ${formatChips(stack)}${status ? `, ${status.text}` : ''}`}>
      <View style={{ width: p, height: p }}>
        <BotPortrait kind={portrait} color={color} size={p} active={isTurn} />
        {isButton ? <DealerButton label={props.dealerLabel} /> : null}
        {textSide === 'left' ? <View style={[styles.sideTexts, { right: p + space.sm, height: p }]}>{texts}</View> : null}
      </View>
      {textSide === 'below' ? <View style={styles.belowTexts}>{texts}</View> : null}
      <View style={styles.statusSlot}>{status ? <StatusPill status={status} /> : null}</View>
      {props.cards ? (
        <CardsRow cards={props.cards} size={props.cardSize} highlight={props.highlight} dimLosers={props.dimLosers} />
      ) : null}
    </View>
  );
}

export type HeroSeatProps = {
  name: string;
  stack: number;
  cards: Card[];
  folded: boolean;
  isTurn: boolean;
  isButton: boolean;
  highlight?: ReadonlySet<Card>;
  dimLosers?: boolean;
  status: SeatStatus | null;
  /** What the hero holds right now, e.g. "You have: Two pair". */
  hint: string | null;
  dealerLabel: string;
};

/** The hero's seat at the bottom of the table: big cards, then the avatar, name, stack and status. */
export function HeroSeat(props: HeroSeatProps) {
  const { colors } = useTheme();
  const { name, stack, folded, isTurn, isButton, status, hint } = props;
  const size = 40;
  return (
    <View style={styles.hero} accessible accessibilityLabel={`${name}, ${formatChips(stack)}${status ? `, ${status.text}` : ''}`}>
      <CardsRow cards={props.cards} size="lg" highlight={props.highlight} dimLosers={props.dimLosers} dimAll={folded} dealtFaceUp />
      <View style={styles.heroRow}>
        <View>
          <View
            style={[
              styles.heroRing,
              {
                width: size,
                height: size,
                borderColor: isTurn ? colors.cyan : withAlpha(colors.cyan, 0.5),
                backgroundColor: colors.surfaceRaised,
                boxShadow: isTurn && colors.glow > 0 ? `0 0 16px ${withAlpha(colors.cyan, 0.7)}` : undefined,
              },
            ]}>
            <PersonIcon color={colors.cyan} size={size * 0.55} />
          </View>
          {isButton ? <DealerButton label={props.dealerLabel} /> : null}
        </View>
        <View style={styles.heroTexts}>
          <AppText variant="caption" strong numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" tone="muted" numeric numberOfLines={1}>
            {formatChips(stack)}
          </AppText>
          {hint ? (
            <AppText variant="caption" tone="cyan" numberOfLines={1}>
              {hint}
            </AppText>
          ) : null}
        </View>
        {status ? <StatusPill status={status} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    alignItems: 'center',
  },
  folded: {
    opacity: 0.55,
  },
  name: {
    maxWidth: 110,
  },
  sideTexts: {
    position: 'absolute',
    top: 0,
    width: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  belowTexts: {
    alignItems: 'center',
    marginTop: 2,
  },
  statusSlot: {
    height: STATUS_HEIGHT,
    marginTop: space.xxs,
    marginBottom: space.xxs,
    justifyContent: 'center',
  },
  status: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 1,
    maxWidth: 150,
  },
  dealer: {
    position: 'absolute',
    left: -4,
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerText: {
    fontSize: 10,
    lineHeight: 12,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
  },
  cardsBig: {
    gap: space.xs,
  },
  hero: {
    alignItems: 'center',
    gap: space.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  heroRing: {
    borderRadius: radius.pill,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexts: {
    maxWidth: 170,
  },
});
