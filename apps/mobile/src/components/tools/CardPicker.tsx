import { RANKS, makeCard, type Card } from '@pokerall/poker-engine';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { SuitShape } from '@/components/table/PlayingCard';
import { useTableLook } from '@/looks/LookProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

// Ace first, as players read the deck; suits spades, hearts, diamonds, clubs.
const RANK_ORDER = Array.from({ length: 13 }, (_, i) => 12 - i);
const SUIT_ORDER = [3, 2, 1, 0];

type Props = {
  visible: boolean;
  title: string;
  /** Cards already used elsewhere: shown dimmed and not pickable. */
  taken: ReadonlySet<Card>;
  onPick: (card: Card) => void;
  /** Clears the slot that opened the picker. */
  onClear?: () => void;
  onClose: () => void;
};

/** The whole deck, one row per suit, to pick a card for a hand, the board or dead cards. */
export function CardPicker({ visible, title, taken, onPick, onClear, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const look = useTableLook();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.bg, 0.8) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('tools.close')} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + space.lg }]}>
          <AppText variant="title">{title}</AppText>
          <View style={styles.grid}>
            {SUIT_ORDER.map((suit) => (
              <View key={suit} style={styles.row}>
                {RANK_ORDER.map((rank) => {
                  const card = makeCard(rank, suit);
                  const used = taken.has(card);
                  const ink = look.suits[suit]!;
                  const name = RANKS[rank] === 'T' ? '10' : RANKS[rank]!;
                  return (
                    <Pressable
                      key={card}
                      disabled={used}
                      onPress={() => onPick(card)}
                      accessibilityRole="button"
                      accessibilityLabel={`${name} ${t(`tools.suits.${suit}`)}`}
                      accessibilityState={{ disabled: used }}
                      style={[styles.card, { backgroundColor: look.deck.face, borderColor: look.deck.border, opacity: used ? 0.25 : 1 }]}>
                      <AppText strong style={[styles.rank, { color: ink }]} numberOfLines={1}>
                        {name}
                      </AppText>
                      <SuitShape suit={suit} color={ink} size={11} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            {onClear ? <Button label={t('tools.clearCard')} kind="secondary" onPress={onClear} /> : null}
            <Button label={t('tools.close')} kind="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grid: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 3,
  },
  card: {
    flex: 1,
    aspectRatio: 0.68,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  rank: {
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: -0.5,
  },
  actions: {
    gap: space.sm,
  },
});
