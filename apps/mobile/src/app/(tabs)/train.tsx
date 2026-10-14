import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { FeatureRow, type Accent } from '@/components/FeatureRow';
import { Screen } from '@/components/Screen';
import { useHands } from '@/store/hands';

const drills: { id: string; accent: Accent; href: Href | null }[] = [
  { id: 'preflop', accent: 'cyan', href: '/drill/preflop' },
  { id: 'potOdds', accent: 'lime', href: '/drill/pot-odds' },
  { id: 'outs', accent: 'lime', href: '/drill/outs' },
  { id: 'showdown', accent: 'amber', href: '/drill/showdown' },
  { id: 'daily', accent: 'amber', href: null },
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
      {drills.map((drill) => {
        const row = (
          <FeatureRow
            accent={drill.accent}
            title={t(`train.drills.${drill.id}.title`)}
            body={t(`train.drills.${drill.id}.body`)}
            badges={drill.href ? undefined : <Badge label={t('common.soon')} />}
          />
        );
        return drill.href ? (
          <Pressable key={drill.id} onPress={() => router.push(drill.href!)} accessibilityRole="button" accessibilityLabel={t(`train.drills.${drill.id}.title`)}>
            {row}
          </Pressable>
        ) : (
          <View key={drill.id}>{row}</View>
        );
      })}
    </Screen>
  );
}
