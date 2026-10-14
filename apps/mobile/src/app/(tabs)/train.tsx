import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { FeatureRow, type Accent } from '@/components/FeatureRow';
import { Screen } from '@/components/Screen';
import { localDay } from '@/store/analysisQuota';
import { useDaily } from '@/store/daily';
import { useHands } from '@/store/hands';
import { usePro } from '@/store/pro';

type Row = { id: string; accent: Accent; href: Href | null; pro?: boolean };

const drills: Row[] = [
  { id: 'daily', accent: 'amber', href: '/drill/daily' },
  { id: 'preflop', accent: 'cyan', href: '/drill/preflop' },
  { id: 'potOdds', accent: 'lime', href: '/drill/pot-odds' },
  { id: 'outs', accent: 'lime', href: '/drill/outs' },
  { id: 'showdown', accent: 'amber', href: '/drill/showdown' },
  { id: 'texture', accent: 'cyan', href: '/drill/texture', pro: true },
  { id: 'pushfold', accent: 'magenta', href: '/drill/pushfold', pro: true },
];

/** Analysis tools: the poker calculator is free, the rest is Pro and closes while a ranked match is on. */
const tools: Row[] = [
  { id: 'odds', accent: 'amber', href: '/odds' },
  { id: 'equity', accent: 'cyan', href: '/tools/equity', pro: true },
  { id: 'icm', accent: 'amber', href: '/tools/icm', pro: true },
  { id: 'pushfold', accent: 'magenta', href: '/tools/pushfold', pro: true },
];

export default function TrainScreen() {
  const { t } = useTranslation();
  const pro = usePro();
  const handCount = useHands((s) => s.hands.length);
  const today = useDaily((s) => s.results[localDay()]);

  const row = (item: Row, group: 'drills' | 'tools') => {
    const title = t(`train.${group}.${item.id}.title`);
    const card = (
      <FeatureRow
        accent={item.accent}
        title={title}
        body={t(`train.${group}.${item.id}.body`)}
        badges={
          !item.href ? (
            <Badge label={t('common.soon')} />
          ) : item.pro && !pro ? (
            <Badge label={t('looks.proBadge')} tone="amber" />
          ) : item.id === 'daily' ? (
            <Badge label={today ? t('train.dailyDone', { right: today.right, total: today.total }) : t('train.dailyNew')} tone={today ? 'lime' : 'amber'} />
          ) : undefined
        }
      />
    );
    return item.href ? (
      <Pressable key={item.id} onPress={() => router.push(item.href!)} accessibilityRole="button" accessibilityLabel={title}>
        {card}
      </Pressable>
    ) : (
      <View key={item.id}>{card}</View>
    );
  };

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
      {drills.map((d) => row(d, 'drills'))}
      <AppText variant="title" accessibilityRole="header" style={{ marginTop: 8 }}>
        {t('train.toolsTitle')}
      </AppText>
      <AppText tone="muted">{t('train.toolsHint')}</AppText>
      {tools.map((d) => row(d, 'tools'))}
    </Screen>
  );
}
