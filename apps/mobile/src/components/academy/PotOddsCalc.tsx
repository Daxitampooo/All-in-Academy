import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** Bet sizes as shares of the pot, with how players say them. */
const SIZES: { bet: number; key: string }[] = [
  { bet: 0.25, key: 'quarter' },
  { bet: 1 / 3, key: 'third' },
  { bet: 0.5, key: 'half' },
  { bet: 2 / 3, key: 'twoThirds' },
  { bet: 0.75, key: 'threeQuarters' },
  { bet: 1, key: 'pot' },
  { bet: 1.5, key: 'overbet' },
  { bet: 2, key: 'double' },
];

/** Pick a bet size and see the equity a call needs: bet / (pot + 2 × bet). */
export function PotOddsCalc({ initial, caption }: { initial: number; caption?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const start = SIZES.reduce((best, s) => (Math.abs(s.bet - initial) < Math.abs(best.bet - initial) ? s : best), SIZES[0]!);
  const [size, setSize] = useState(start);
  const pot = 100;
  const bet = Math.round(pot * size.bet);
  const need = size.bet / (1 + 2 * size.bet);
  const total = pot + 2 * bet;
  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {caption ? <AppText variant="label">{caption}</AppText> : null}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {SIZES.map((s) => {
          const on = s.key === size.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSize(s)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.chip, { borderColor: on ? colors.cyan : colors.border, backgroundColor: on ? withAlpha(colors.cyan, 0.15) : colors.surfaceRaised }]}>
              <AppText variant="caption" strong tone={on ? 'cyan' : 'text'}>
                {t(`academy.potOdds.sizes.${s.key}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.bar} accessibilityLabel={t('academy.potOdds.result', { need: Math.round(need * 100) })}>
        <View style={{ flex: pot, backgroundColor: withAlpha(colors.amber, 0.35) }} />
        <View style={{ flex: bet, backgroundColor: withAlpha(colors.magenta, 0.55) }} />
        <View style={{ flex: bet, backgroundColor: colors.cyan }} />
      </View>
      <View style={styles.legend}>
        <AppText variant="caption" tone="muted" numeric>
          {t('academy.potOdds.legend', { pot, bet, total })}
        </AppText>
      </View>
      <AppText variant="title" tone="cyan" numeric>
        {t('academy.potOdds.result', { need: Math.round(need * 100) })}
      </AppText>
      <AppText variant="caption" tone="muted" numeric>
        {t('academy.potOdds.formula', { bet, total })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
  },
  bar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: space.xs,
  },
  legend: {
    flexDirection: 'row',
  },
});
