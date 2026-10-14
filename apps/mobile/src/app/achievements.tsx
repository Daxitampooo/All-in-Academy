import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { RARITIES } from '@/achievements/catalog';
import { RARITY_COLOR } from '@/achievements/rarity';
import { useAchievements } from '@/achievements/useAchievements';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { CheckIcon, LockIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { ToggleRow } from '@/components/ToggleRow';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const statuses = useAchievements();
  const title = useProfile((s) => s.title);
  const setTitle = useProfile((s) => s.setTitle);
  const showTitle = useProfile((s) => s.showTitle);
  const setShowTitle = useProfile((s) => s.setShowTitle);
  const done = statuses.filter((s) => s.done).length;

  return (
    <Screen header={<BackButton label={t('profile.title')} fallback="/profile" />} title={t('achievements.title')} subtitle={t('achievements.subtitle')}>
      <View style={[styles.summary, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="label" tone="muted" numeric>
          {t('achievements.count', { done, total: statuses.length })}
        </AppText>
        <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.fill, { width: `${(done / statuses.length) * 100}%`, backgroundColor: colors.amber }]} />
        </View>
        <AppText variant="label">
          {title ? t('achievements.currentTitle', { title: t(`achievements.list.${title}.name`) }) : t('achievements.noTitle')}
        </AppText>
      </View>
      <ToggleRow title={t('achievements.showTitle')} hint={t('achievements.showTitleHint')} value={showTitle} onChange={setShowTitle} />

      {RARITIES.map((rarity) => {
        const color = colors[RARITY_COLOR[rarity]];
        return (
          <View key={rarity} style={styles.group}>
            <AppText variant="title" style={{ color }}>
              {t(`achievements.rarityPlural.${rarity}`)}
            </AppText>
            {statuses
              .filter((s) => s.achievement.rarity === rarity)
              .map(({ achievement: a, value, done: isDone }) => {
                const chosen = title === a.id;
                return (
                  <View
                    key={a.id}
                    style={[
                      styles.card,
                      {
                        borderColor: isDone ? withAlpha(color, chosen ? 1 : 0.6) : colors.border,
                        backgroundColor: isDone ? withAlpha(color, 0.06) : colors.surface,
                        boxShadow: chosen && colors.glow > 0 ? `0 0 14px ${withAlpha(color, 0.4)}` : undefined,
                      },
                    ]}>
                    <View style={[styles.badge, { borderColor: isDone ? color : colors.border, backgroundColor: isDone ? withAlpha(color, 0.18) : colors.surfaceRaised }]}>
                      {isDone ? <CheckIcon color={color} size={18} /> : <LockIcon color={colors.textMuted} size={16} />}
                    </View>
                    <View style={styles.body}>
                      <AppText variant="heading">{t(`achievements.list.${a.id}.name`)}</AppText>
                      <AppText variant="label" tone="muted">
                        {t(`achievements.list.${a.id}.desc`)}
                      </AppText>
                      {a.target > 1 ? (
                        <View style={styles.progress}>
                          <View style={[styles.track, styles.flex, { backgroundColor: colors.surfaceRaised }]}>
                            <View style={[styles.fill, { width: `${(value / a.target) * 100}%`, backgroundColor: color }]} />
                          </View>
                          <AppText variant="caption" tone="muted" numeric>
                            {`${value} / ${a.target}`}
                          </AppText>
                        </View>
                      ) : null}
                      {isDone ? (
                        <Pressable
                          onPress={() => setTitle(chosen ? null : a.id)}
                          accessibilityRole="button"
                          style={({ pressed }) => [styles.titleButton, { borderColor: color, backgroundColor: chosen ? color : pressed ? withAlpha(color, 0.15) : 'transparent' }]}>
                          <AppText variant="caption" strong style={{ color: chosen ? colors.onAccent : color }}>
                            {chosen ? t('achievements.titleChosen') : t('achievements.chooseTitle')}
                          </AppText>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  group: {
    gap: space.sm,
  },
  card: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: space.xs,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  titleButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    marginTop: space.xxs,
  },
});
