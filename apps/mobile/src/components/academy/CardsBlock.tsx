import { parseCards } from '@pokerall/poker-engine';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PlayingCard } from '@/components/table/PlayingCard';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Rows of cards: "As Kd" a hand, "| Qh Jh 2c" a board, "As Kd | Qh Jh 2c" both; one label per row. */
export function CardsBlock({ rows, labels, caption }: { rows: string[]; labels: string[]; caption?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {rows.map((row, i) => {
        const [hand = '', board = ''] = row.split('|').map((s) => s.trim());
        return (
          <View key={i} style={styles.row}>
            <AppText variant="label" strong>
              {labels[i]}
            </AppText>
            <View style={styles.cards}>
              {hand
                ? parseCards(hand).map((c) => <PlayingCard key={c} card={c} size="sm" />)
                : null}
              {hand && board ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
              {board ? parseCards(board).map((c) => <PlayingCard key={c} card={c} size="sm" />) : null}
            </View>
          </View>
        );
      })}
      {caption ? (
        <AppText variant="caption" tone="muted">
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
    padding: space.md,
    gap: space.md,
  },
  row: {
    gap: space.xs,
  },
  cards: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: space.xs,
  },
});
