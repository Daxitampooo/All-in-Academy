import { currentStreak } from '@pokerall/shared/client';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { FlameIcon } from '@/components/icons';
import { useAchievementLog } from '@/store/achievements';
import { useStreak } from '@/store/streak';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

/** "Day counted" banner when today's tasks reach the goal. Waits for an achievement banner to go first. */
export function StreakToast() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const justDone = useStreak((s) => s.justDone);
  const days = useStreak((s) => s.days);
  const dismiss = useStreak((s) => s.dismissDone);
  const achievementShown = useAchievementLog((s) => s.pending.length > 0);
  const visible = justDone !== null && !achievementShown;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 3500);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  if (!visible) return null;
  const [y, m, d] = justDone.split('-').map(Number) as [number, number, number];
  const streak = currentStreak(days, new Date(y, m - 1, d));
  return (
    <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + space.sm }]}>
      <Animated.View entering={FadeInUp.duration(250)} exiting={FadeOutUp.duration(200)}>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              borderColor: colors.amber,
              backgroundColor: colors.surface,
              boxShadow: colors.glow > 0 ? `0 0 18px ${withAlpha(colors.amber, 0.5)}` : undefined,
            },
          ]}>
          <FlameIcon color={colors.amber} size={30} filled />
          <View style={styles.text}>
            <AppText variant="heading">{t('streak.toast.title')}</AppText>
            <AppText variant="caption" tone="muted">
              {t('streak.toast.body', { count: streak })}
            </AppText>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minWidth: 260,
    maxWidth: 420,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
