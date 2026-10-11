import { potSize, type HandState, type LegalActions, type PlayerAction } from '@pokerall/poker-engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { BetSlider } from '@/components/table/BetSlider';
import { formatChips, formatDecimal } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { sizingFor } from '@/table/sizing';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/**
 * Height of the action area's content with the sizing tab open or folded. The table keeps the area this tall
 * even when it isn't your turn, so the seats don't move around between decisions.
 */
export const ACTION_AREA_HEIGHT = { open: 198, closed: 108 } as const;

/** Render with a `key` that changes for every decision, so the bet size resets to the usual one for the spot. */
type Props = {
  hand: HandState;
  legal: LegalActions;
  heroStack: number;
  onAct: (action: PlayerAction) => void;
};

export function ActionBar({ hand, legal, heroStack, onAct }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const open = useSettings((s) => s.sizingOpen);
  const setOpen = useSettings((s) => s.setSizingOpen);
  const sizing = useMemo(() => sizingFor(hand, legal), [hand, legal]);
  const raise = legal.raise;
  const [amount, setAmount] = useState(() => sizing?.recommended ?? 0);

  const bb = hand.config.bigBlind;
  const step = Math.max(1, bb / 2);
  const callIsAllIn = legal.callAmount > 0 && legal.callAmount >= heroStack;
  const raiseIsAllIn = !!raise && amount >= raise.max;
  // With a single possible size (all-in) there is nothing to choose.
  const canSize = !!sizing && !!raise && raise.max > raise.min;

  const pot = potSize(hand);
  const readout =
    raise?.type === 'bet' && pot > 0
      ? t('table.sizing.readoutPot', { bb: formatDecimal(amount / bb), pct: Math.round((amount / pot) * 100) })
      : t('table.sizing.readoutBB', { bb: formatDecimal(amount / bb) });

  const callButton = legal.canCheck
    ? { title: t('table.actions.check'), amount: null }
    : { title: t(callIsAllIn ? 'table.actions.allIn' : 'table.actions.call'), amount: formatChips(legal.callAmount) };
  // The raise button names the move: "3-bet to 750", "Squeeze to 1,100", "Bet 300".
  const raiseTitle =
    raise?.type === 'bet' ? t('table.actions.bet') : t(`table.raiseAs.${sizing && sizing.spot !== 'bet' ? sizing.spot : 'raise'}`);
  const raiseButton = !raise
    ? null
    : raiseIsAllIn
      ? { title: t('table.actions.allIn'), amount: formatChips(raise.max) }
      : { title: raiseTitle, amount: formatChips(amount) };

  return (
    <View style={styles.bar}>
      {canSize ? (
        <View style={[styles.panel, { borderColor: withAlpha(colors.cyan, 0.35), backgroundColor: colors.bg }]}>
          <Pressable
            onPress={() => setOpen(!open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={t(open ? 'table.sizing.hide' : 'table.sizing.show')}
            hitSlop={6}
            style={styles.panelHeader}>
            <AppText variant="caption" strong tone="cyan">
              {t('table.sizing.title')}
            </AppText>
            {open ? <ChevronDownIcon color={colors.cyan} size={16} /> : <ChevronUpIcon color={colors.cyan} size={16} />}
            <View style={[styles.spot, { borderColor: withAlpha(colors.amber, 0.6) }]}>
              <AppText variant="caption" strong tone="amber" numberOfLines={1}>
                {t(`table.spot.${sizing.spot}`)}
              </AppText>
            </View>
            <View style={styles.flex} />
            <AppText variant="caption" tone="muted" numeric numberOfLines={1}>
              {readout}
            </AppText>
          </Pressable>
          {open ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chips}>
                {sizing.presets.map((p) => {
                  const selected = p.amount === amount;
                  const label = t(p.label, { n: p.n === undefined ? '' : formatDecimal(p.n) });
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => setAmount(p.amount)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${label}, ${formatChips(p.amount)}`}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? colors.cyan : colors.border,
                          backgroundColor: selected ? withAlpha(colors.cyan, 0.14) : colors.surface,
                        },
                      ]}>
                      <AppText variant="caption" strong tone={selected ? 'cyan' : 'text'} numeric numberOfLines={1}>
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <BetSlider
                min={raise.min}
                max={raise.max}
                step={step}
                value={amount}
                onChange={setAmount}
                label={t('table.amount')}
                lessLabel={t('table.less')}
                moreLabel={t('table.more')}
              />
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.buttons}>
        {legal.canFold ? (
          <ActionButton title={t('table.actions.fold')} color={colors.magenta} onPress={() => onAct({ type: 'fold' })} />
        ) : null}
        <ActionButton
          {...callButton}
          color={colors.cyan}
          onPress={() => onAct(legal.canCheck ? { type: 'check' } : { type: 'call' })}
        />
        {raise && raiseButton ? (
          <ActionButton
            {...raiseButton}
            color={colors.cyan}
            filled
            onPress={() => onAct({ type: raise.type, amount: raiseIsAllIn ? raise.max : amount })}
          />
        ) : null}
      </View>
    </View>
  );
}

type ActionButtonProps = {
  title: string;
  /** Chips this action puts in, shown on a second line. */
  amount?: string | null;
  color: string;
  filled?: boolean;
  onPress: () => void;
};

function ActionButton({ title, amount, color, filled, onPress }: ActionButtonProps) {
  const { colors } = useTheme();
  const ink = filled ? colors.onAccent : color;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={amount ? `${title} ${amount}` : title}
      style={({ pressed }) => [
        styles.action,
        filled
          ? {
              backgroundColor: color,
              borderColor: color,
              boxShadow: colors.glow > 0 ? `0 0 16px ${withAlpha(color, 0.5)}` : undefined,
            }
          : { borderColor: withAlpha(color, 0.8), backgroundColor: pressed ? withAlpha(color, 0.15) : colors.surface },
        pressed && filled && { opacity: 0.85 },
      ]}>
      <AppText variant="label" strong numberOfLines={1} style={{ color: ink }}>
        {title}
      </AppText>
      {amount ? (
        <AppText variant="caption" strong numeric numberOfLines={1} style={{ color: ink }}>
          {amount}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: space.sm + 2,
  },
  flex: {
    flex: 1,
  },
  panel: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    gap: space.sm,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    minHeight: 28,
    paddingHorizontal: space.xxs,
  },
  spot: {
    marginLeft: space.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 1,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chips: {
    flexGrow: 1,
    gap: 5,
  },
  chip: {
    flexGrow: 1,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  buttons: {
    flexDirection: 'row',
    gap: space.sm,
  },
  action: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
});
