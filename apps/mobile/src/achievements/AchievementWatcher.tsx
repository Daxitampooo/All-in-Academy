import { router } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useAcademy } from '@/store/academy';
import { useAchievementLog } from '@/store/achievements';
import { useBotProgress } from '@/store/botProgress';
import { useLifetime } from '@/store/lifetime';
import { useLook } from '@/store/look';
import { useProfile } from '@/store/profile';
import { useStreak } from '@/store/streak';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

import { achievementById } from './catalog';
import { RARITY_COLOR } from './rarity';
import { useAchievements } from './useAchievements';

const STORES = [useBotProgress, useAcademy, useLifetime, useLook, useProfile, useStreak, useAchievementLog];

function subscribe(onChange: () => void) {
  const unsubs = STORES.map((s) => s.persist.onFinishHydration(onChange));
  return () => unsubs.forEach((u) => u());
}
const allHydrated = () => STORES.every((s) => s.persist.hasHydrated());

/** Watches progress and shows a banner when an achievement opens. Lives once, in the root layout. */
export function AchievementWatcher() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hydrated = useSyncExternalStore(subscribe, allHydrated);
  const statuses = useAchievements();
  const unlockedAt = useAchievementLog((s) => s.unlockedAt);
  const initialized = useAchievementLog((s) => s.initialized);
  const record = useAchievementLog((s) => s.record);
  const dismiss = useAchievementLog((s) => s.dismiss);
  const current = useAchievementLog((s) => s.pending[0]);

  useEffect(() => {
    if (!hydrated) return;
    const fresh = statuses.filter((s) => s.done && !unlockedAt[s.achievement.id]).map((s) => s.achievement.id);
    if (fresh.length === 0 && initialized) return;
    // The first check only takes stock: achievements earned before this version don't pop up.
    record(fresh, initialized);
  }, [hydrated, initialized, record, statuses, unlockedAt]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismiss, 3500);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  const achievement = current ? achievementById(current) : undefined;
  if (!achievement) return null;
  const color = colors[RARITY_COLOR[achievement.rarity]];
  return (
    <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + space.sm }]}>
      <Animated.View key={current} entering={FadeInUp.duration(250)} exiting={FadeOutUp.duration(200)}>
        <Pressable
          onPress={() => {
            dismiss();
            router.push('/achievements');
          }}
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              borderColor: color,
              backgroundColor: colors.surface,
              boxShadow: colors.glow > 0 ? `0 0 18px ${withAlpha(color, 0.5)}` : undefined,
            },
          ]}>
          <AppText variant="caption" strong style={{ color }}>
            {t('achievements.unlocked', { rarity: t(`achievements.rarity.${achievement.rarity}`) })}
          </AppText>
          <AppText variant="heading">{t(`achievements.list.${achievement.id}.name`)}</AppText>
          <AppText variant="caption" tone="muted">
            {t('achievements.titleGained')}
          </AppText>
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
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: 2,
    minWidth: 260,
    maxWidth: 420,
  },
});
