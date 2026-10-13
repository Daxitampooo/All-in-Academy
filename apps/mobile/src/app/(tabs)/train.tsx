import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Badge } from '@/components/Badge';
import { FeatureRow, type Accent } from '@/components/FeatureRow';
import { Screen } from '@/components/Screen';
import { useHands } from '@/store/hands';

const drills: { id: string; accent: Accent }[] = [
  { id: 'preflop', accent: 'cyan' },
  { id: 'potOdds', accent: 'lime' },
  { id: 'daily', accent: 'amber' },
];

export default function TrainScreen() {
  const { t } = useTranslation();
  const handCount = useHands((s) => s.hands.length);

  return (
    <Screen title={t('train.title')} subtitle={t('train.subtitle')}>
      <Pressable onPress={() => router.push('/hands')} accessibilityRole="button" accessibilityLabel={t('hands.title')}>
        <FeatureRow
          accent="magenta"
          title={t('hands.title')}
          body={t('hands.trainBody')}
          badges={<Badge label={t('hands.count', { count: handCount })} tone="magenta" />}
        />
      </Pressable>
      {drills.map((drill) => (
        <FeatureRow
          key={drill.id}
          accent={drill.accent}
          title={t(`train.drills.${drill.id}.title`)}
          body={t(`train.drills.${drill.id}.body`)}
          badges={<Badge label={t('common.soon')} />}
        />
      ))}
    </Screen>
  );
}
