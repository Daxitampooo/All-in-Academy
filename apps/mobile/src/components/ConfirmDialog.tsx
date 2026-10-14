import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button for actions that can't be undone. */
  danger?: boolean;
  busy?: boolean;
  /** Shown under the text when the action failed. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Asks before an important action (signing out, deleting the account). */
export function ConfirmDialog({ visible, title, body, confirmLabel, cancelLabel, danger, busy, error, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.bg, 0.8) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onCancel} accessibilityLabel={cancelLabel} />
        <View
          style={[styles.dialog, { backgroundColor: colors.surface, borderColor: danger ? colors.magenta : colors.border }]}
          accessibilityViewIsModal>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          <AppText tone="muted">{body}</AppText>
          {error ? <AppText tone="danger">{error}</AppText> : null}
          <View style={styles.buttons}>
            <Button label={confirmLabel} kind={danger ? 'danger' : 'primary'} onPress={onConfirm} disabled={busy} />
            <Button label={cancelLabel} kind="secondary" onPress={onCancel} disabled={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  buttons: {
    gap: space.sm,
    marginTop: space.xs,
  },
});
