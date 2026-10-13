import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { LockIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Props = {
  label: string;
  selected: boolean;
  /** Shown in the preview right now without being chosen (a locked item being tried on). */
  trying?: boolean;
  locked?: boolean;
  pro?: boolean;
  onPress: () => void;
  children: ReactNode;
};

/** A square choice with a picture: a face part, a frame, a background. */
export function OptionTile({ label, selected, trying = false, locked = false, pro = false, onPress, children }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const border = selected || trying ? colors.cyan : colors.border;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: border,
          borderStyle: trying && !selected ? 'dashed' : 'solid',
          backgroundColor: selected ? withAlpha(colors.cyan, 0.1) : pressed ? colors.surfaceRaised : colors.surface,
        },
      ]}>
      <View style={locked ? styles.locked : undefined}>{children}</View>
      {locked ? (
        <View style={[styles.corner, { backgroundColor: pro ? colors.amber : colors.surfaceRaised }]}>
          {pro ? (
            <AppText variant="caption" strong style={[styles.pro, { color: colors.onAccent }]}>
              {t('looks.proBadge')}
            </AppText>
          ) : (
            <LockIcon color={colors.textMuted} size={10} />
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: {
    opacity: 0.55,
  },
  corner: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 18,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pro: {
    fontSize: 8,
    lineHeight: 10,
  },
});
