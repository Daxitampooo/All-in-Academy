import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { FeatureRow, type Accent } from '@/components/FeatureRow';
import { Screen } from '@/components/Screen';
import { useHands } from '@/store/hands';
import { usePro } from '@/store/pro';

type Row = { id: string; accent: Accent; href: Href | null; pro?: boolean };

const drills: Row[] = [
  { id: 'preflop', accent: 'cyan', href: '/drill/preflop' },
  { id: 'potOdds', accent: 'lime', href: '/drill/pot-odds' },
  { id: 'outs', accent: 'lime', href: '/drill/outs' },
  { id: 'showdown', accent: 'amber', href: '/drill/showdown' },
  { id: 'pushfold', accent: 'magenta', href: '/drill/pushfold', pro: true },
  { id: 'daily', accent: 'amber', href: null },
];

/** Analysis tools: Pro, and closed while a ranked match is on (ranked play comes with the server). */
const tools: Row[] = [
  { id: 'equity', accent: 'cyan', href: '/tools/equity', pro: true },
  { id: 'icm', accent: 'amber', href: '/tools/icm', pro: true },
  { id: 'pushfold', accent: 'magenta', href: '/tools/pushfold', pro: true },
];

export default function TrainScreen() {
  const { t } = useTranslation();
  const pro = usePro();
  const handCount = useHands((s) => s.hands.length);

  const row = (item: Row, group: 'drills' | 'tools') => {
    const title = t(`train.${group}.${item.id}.title`);
    const card = (
      <FeatureRow
        accent={item.accent}
        title={title}
        body={t(`train.${group}.${item.id}.body`)}
        badges={
          !item.href ? <Badge label={t('common.soon')} /> : item.pro && !pro ? <Badge label={t('looks.proBadge')} tone="amber" /> : undefined
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
