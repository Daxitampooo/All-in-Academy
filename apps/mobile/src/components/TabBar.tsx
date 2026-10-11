import { forwardRef, type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import type { IconProps } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** Bottom bar that holds the tab buttons. */
export function TabBar({ children, style, ...rest }: TabListProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...rest}
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, space.sm),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  Icon: ComponentType<IconProps>;
};

/**
 * One tab. Receives `isFocused` and press handlers from `TabTrigger asChild`.
 * The trigger merges styles by object spread, so this component passes a single
 * plain style object and ignores the incoming `style` (a row layout by default).
 */
export const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { label, Icon, isFocused, style, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const color = isFocused ? colors.cyan : colors.textMuted;

  return (
    <Pressable
      ref={ref}
      {...rest}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      android_ripple={{ color: withAlpha(colors.cyan, 0.15), borderless: true }}
      style={styles.button}>
      {/* Lit strip above the active tab. */}
      <View
        style={[
          styles.indicator,
          isFocused && {
            backgroundColor: colors.cyan,
            boxShadow:
              colors.glow > 0 ? `0 0 12px 1px ${withAlpha(colors.cyan, 0.8)}` : undefined,
          },
        ]}
      />
      <Icon color={color} filled={isFocused} />
      <AppText variant="caption" strong={isFocused} style={{ color }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.xs,
    paddingHorizontal: space.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: space.xxs,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    minHeight: 56,
  },
  indicator: {
    position: 'absolute',
    top: -space.xs,
    width: 28,
    height: 3,
    borderRadius: radius.pill,
  },
});
