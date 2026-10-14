import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAchievements } from '@/achievements/useAchievements';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { GearIcon, ListIcon, PersonIcon, SpadeIcon, StarIcon, TargetIcon } from '@/components/icons';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Screen } from '@/components/Screen';
import { PlayingCard } from '@/components/table/PlayingCard';
import { countryName, flagOf } from '@/profile/countries';
import { showCards } from '@/profile/hands';
import { useHandStats } from '@/hands/stats';
import { useBotProgress } from '@/store/botProgress';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfile();
  const records = useBotProgress((s) => s.records);

  const all = Object.values(records);
  const handStats = useHandStats();
  const achievements = useAchievements();
  const percent = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
  const stats = [
    { label: t('profile.stats.matches'), value: String(all.reduce((n, r) => n + r.wins + r.losses, 0)) },
    { label: t('profile.stats.wins'), value: String(all.reduce((n, r) => n + r.wins, 0)) },
    { label: t('profile.stats.beaten'), value: String(all.filter((r) => r.beaten > 0).length) },
  ];
  const playStats = [
    { label: t('profile.stats.hands'), value: String(handStats.hands) },
    { label: t('analysis.stats.vpip.name'), value: percent(handStats.vpip) },
    { label: t('analysis.stats.pfr.name'), value: percent(handStats.pfr) },
  ];

  const links: { label: string; hint: string; href: Href; icon: React.ReactNode }[] = [
    { label: t('hands.title'), hint: t('hands.linkHint'), href: '/hands', icon: <ListIcon color={colors.text} /> },
    {
      label: t('achievements.title'),
      hint: t('achievements.linkHint', { done: achievements.filter((a) => a.done).length, total: achievements.length }),
      href: '/achievements',
      icon: <StarIcon color={colors.amber} />,
    },
    { label: t('profile.edit'), hint: t('profile.editHint'), href: '/edit-profile', icon: <PersonIcon color={colors.text} size={22} /> },
    { label: t('profile.avatar'), hint: t('profile.avatarHint'), href: '/avatar', icon: <TargetIcon color={colors.text} size={22} /> },
    { label: t('looks.open'), hint: t('looks.openHint'), href: '/looks', icon: <SpadeIcon color={colors.text} size={22} /> },
    { label: t('profile.settings'), hint: t('profile.settingsHint'), href: '/settings', icon: <GearIcon color={colors.text} /> },
  ];

  return (
    <Screen title={t('profile.title')}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.identity}>
          <Pressable onPress={() => router.push('/avatar')} accessibilityRole="button" accessibilityLabel={t('profile.avatar')}>
            <PlayerAvatar avatar={profile.avatar} size={84} />
          </Pressable>
          <View style={styles.identityText}>
            <AppText variant="title" numberOfLines={1}>
              {profile.nickname ?? t('profile.noNickname')}
            </AppText>
            {profile.title ? (
              <AppText variant="label" strong tone="amber" numberOfLines={1}>
                {t(`achievements.list.${profile.title}.name`)}
              </AppText>
            ) : null}
            {profile.country ? (
              <AppText variant="label" tone="muted" numberOfLines={1}>
                {`${flagOf(profile.country)}  ${countryName(profile.country, i18n.language)}`}
              </AppText>
            ) : null}
            {profile.style ? <Badge label={t(`profile.styles.${profile.style}`)} tone="cyan" /> : null}
          </View>
        </View>

        {profile.about ? <AppText>{profile.about}</AppText> : null}

        {profile.favoriteHand ? (
          <View style={styles.hand}>
            <AppText variant="label" tone="muted" style={styles.flex}>
              {t('profile.favoriteHand')}
            </AppText>
            <AppText variant="label" strong>
              {profile.favoriteHand}
            </AppText>
            <View style={styles.cards}>
              {showCards(profile.favoriteHand).map((c) => (
                <PlayingCard key={c} card={c} size="sm" />
              ))}
            </View>
          </View>
        ) : null}

        {!profile.nickname ? (
          <AppText variant="label" tone="cyan" onPress={() => router.push('/edit-profile')}>
            {t('profile.setUp')}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted">
          {t('profile.localHint')}
        </AppText>
      </View>

      {[stats, playStats].map((row, r) => (
        <View key={r} style={styles.stats}>
          {row.map((stat) => (
            <View key={stat.label} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppText variant="title" numeric>
                {stat.value}
              </AppText>
              <AppText variant="caption" tone="muted">
                {stat.label}
              </AppText>
            </View>
          ))}
        </View>
      ))}
      <AppText variant="caption" tone="muted">
        {t('profile.comingStats')}
      </AppText>

      <View style={[styles.links, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {links.map((link, i) => (
          <Pressable
            key={link.label}
            onPress={() => router.push(link.href)}
            accessibilityRole="button"
            accessibilityHint={link.hint}
            style={({ pressed }) => [
              styles.link,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: colors.surfaceRaised },
            ]}>
            {link.icon}
            <View style={styles.flex}>
              <AppText variant="heading">{link.label}</AppText>
              <AppText variant="caption" tone="muted">
                {link.hint}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  identityText: {
    flex: 1,
    gap: space.xs,
  },
  hand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
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
  links: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 60,
  },
});
