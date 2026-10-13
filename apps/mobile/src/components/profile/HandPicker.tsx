import { gridClass } from '@pokerall/poker-engine';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

const ROWS = Array.from({ length: 13 }, (_, i) => i);

/** The 13×13 grid of starting hands: pairs on the diagonal, suited above it, offsuit below. */
export function HandPicker({ visible, value, onPick, onClose }: { visible: boolean; value: string | null; onPick: (hand: string | null) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.bg, 0.8) }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + space.lg }]}>
          <AppText variant="title">{t('editProfile.handTitle')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('editProfile.handHint')}
          </AppText>
          <View style={styles.grid} accessibilityRole="radiogroup">
            {ROWS.map((row) => (
              <View key={row} style={styles.gridRow}>
                {ROWS.map((col) => {
                  const cls = gridClass(row, col);
                  const tint = row === col ? colors.amber : row < col ? colors.cyan : colors.magenta;
                  const selected = cls === value;
                  return (
                    <Pressable
                      key={cls}
                      onPress={() => onPick(cls)}
                      accessibilityRole="radio"
                      accessibilityLabel={cls}
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: selected ? tint : withAlpha(tint, 0.12),
                          borderColor: selected ? tint : withAlpha(tint, 0.25),
                        },
                      ]}>
                      <AppText variant="caption" strong style={[styles.cellText, { color: selected ? colors.onAccent : colors.text }]} numberOfLines={1}>
                        {cls}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <Button label={t('editProfile.done')} onPress={onClose} />
            {value ? <Button label={t('editProfile.clear')} kind="secondary" onPress={() => onPick(null)} /> : null}
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
    gap: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 2,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: -0.3,
  },
  actions: {
    gap: space.sm,
  },
});
