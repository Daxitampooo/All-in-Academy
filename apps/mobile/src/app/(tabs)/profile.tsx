import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { GearIcon, PersonIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

// Placeholder progress until hands, lessons and drills record real data.
const progress = { level: 1, xp: 0, nextLevelXp: 100, hands: 0, lessons: 0, accuracy: null };

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const xpShare = progress.xp / progress.nextLevelXp;

  const stats = [
    { label: t('profile.stats.hands'), value: String(progress.hands) },
    { label: t('profile.stats.lessons'), value: String(progress.lessons) },
    { label: t('profile.stats.accuracy'), value: progress.accuracy === null ? '—' : `${progress.accuracy}%` },
  ];

  return (
    <Screen title={t('profile.title')}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.identity}>
          <View
            style={[
              styles.avatar,
              {
                borderColor: colors.cyan,
                backgroundColor: withAlpha(colors.cyan, 0.08),
                boxShadow: colors.glow > 0 ? `0 0 18px ${withAlpha(colors.cyan, 0.45)}` : undefined,
              },
            ]}>
            <PersonIcon color={colors.cyan} size={30} />
          </View>
          <View style={styles.identityText}>
            <AppText variant="title">{t('profile.guest')}</AppText>
            <AppText variant="label" tone="cyan">
              {t('profile.level', { level: progress.level })}
            </AppText>
          </View>
        </View>

        <View style={styles.xp}>
          <View
            style={[styles.xpTrack, { backgroundColor: colors.surfaceRaised }]}
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: progress.nextLevelXp, now: progress.xp }}>
            <LinearGradient
              colors={[colors.cyan, colors.magenta]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpFill, { width: `${xpShare * 100}%` }]}
            />
          </View>
          <AppText variant="caption" tone="muted" numeric>
            {t('profile.xp', { current: progress.xp, next: progress.nextLevelXp })}
          </AppText>
        </View>

        <AppText variant="label" tone="muted">
          {t('profile.guestHint')}
        </AppText>
      </View>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="title" numeric>
              {stat.value}
            </AppText>
            <AppText variant="caption" tone="muted">
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.settings,
          { backgroundColor: pressed ? colors.surfaceRaised : colors.surface, borderColor: colors.border },
        ]}>
        <GearIcon color={colors.text} />
        <AppText variant="heading">{t('profile.settings')}</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    gap: space.xxs,
  },
  xp: {
    gap: space.xs,
  },
  xpTrack: {
    height: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  stats: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  settings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
  },
});
