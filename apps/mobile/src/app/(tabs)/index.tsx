import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { FeatureRow } from '@/components/FeatureRow';
import { NeonTable } from '@/components/NeonTable';
import { Screen } from '@/components/Screen';
import { StreakCard } from '@/components/streak/StreakCard';
import { space } from '@/theme/tokens';

export default function PlayScreen() {
  const { t } = useTranslation();
  const soon = <Badge label={t('common.soon')} />;

  return (
    <Screen>
      <NeonTable />
      <View style={styles.intro}>
        <AppText variant="display" accessibilityRole="header">
          {t('play.title')}
        </AppText>
        <AppText tone="muted">{t('play.subtitle')}</AppText>
      </View>
      <StreakCard />

      <AppText variant="heading" style={styles.section}>
        {t('play.modes')}
      </AppText>
      <Pressable
        onPress={() => router.push('/bots')}
        accessibilityRole="button"
        accessibilityHint={t('play.bots.open')}
        style={({ pressed }) => pressed && styles.pressed}>
        <FeatureRow accent="cyan" title={t('play.bots.title')} body={t('play.bots.body')} badges={<Badge label={t('play.bots.open')} tone="cyan" />} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/odds')}
        accessibilityRole="button"
        accessibilityHint={t('play.odds.open')}
        style={({ pressed }) => pressed && styles.pressed}>
        <FeatureRow accent="amber" title={t('play.odds.title')} body={t('play.odds.body')} badges={<Badge label={t('play.odds.open')} tone="amber" />} />
      </Pressable>
      <FeatureRow accent="magenta" title={t('play.ranked.title')} body={t('play.ranked.body')} badges={soon} />
      <FeatureRow accent="lime" title={t('play.casual.title')} body={t('play.casual.body')} badges={soon} />

      <AppText variant="caption" tone="muted" style={styles.disclaimer}>
        {t('common.noRealMoney')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  intro: {
    gap: space.sm,
  },
  section: {
    marginTop: space.sm,
  },
  disclaimer: {
    marginTop: space.sm,
    textAlign: 'center',
  },
});
