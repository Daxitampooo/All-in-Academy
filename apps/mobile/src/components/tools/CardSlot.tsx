import type { Card } from '@pokerall/poker-engine';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { PlayingCard } from '@/components/table/PlayingCard';
import { useTheme } from '@/theme/ThemeProvider';

/** A card place that opens the card picker: the card, or an empty dashed slot. */
export function CardSlot({ card, label, onPress }: { card: Card | null; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
      {card === null ? (
        <AppText style={[styles.empty, { borderColor: colors.border, color: colors.textMuted }]}>+</AppText>
      ) : (
        <PlayingCard card={card} size="md" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: {
    width: 42,
    height: 59,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 6,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 56,
    fontSize: 22,
  },
});
