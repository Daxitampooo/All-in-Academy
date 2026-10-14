import { HAND_RANKING } from '@pokerall/content';
import { parseCards } from '@pokerall/poker-engine';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PlayingCard } from '@/components/table/PlayingCard';
import { formatSmallPercent } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Every hand category from best to worst, with an example and how often it comes by the river. */
export function HandRankingBlock({ caption }: { caption?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {HAND_RANKING.map((h, i) => (
        <View key={h.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <View style={styles.head}>
            <AppText variant="label" tone="cyan" numeric style={styles.num}>
              {String(i + 1)}
            </AppText>
            <AppText variant="label" strong style={styles.flex}>
              {t(`handNames.${h.id}`)}
            </AppText>
            <AppText variant="caption" tone="muted" numeric>
              {t('academy.blocks.chance', { pct: formatSmallPercent(h.percent) })}
            </AppText>
          </View>
          <View style={styles.cards}>
            {parseCards(h.example).map((c) => (
              <PlayingCard key={c} card={c} size="sm" />
            ))}
          </View>
        </View>
      ))}
      {caption ? (
        <AppText variant="caption" tone="muted" style={styles.caption}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    padding: space.sm,
    gap: space.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  num: {
    width: 18,
  },
  flex: {
    flex: 1,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
    paddingLeft: 26,
  },
  caption: {
    padding: space.sm,
  },
});
