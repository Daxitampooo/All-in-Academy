import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge';
import { FeatureRow, type Accent } from '@/components/FeatureRow';
import { Screen } from '@/components/Screen';

const drills: { id: string; accent: Accent }[] = [
  { id: 'preflop', accent: 'cyan' },
  { id: 'potOdds', accent: 'lime' },
  { id: 'daily', accent: 'amber' },
];

export default function TrainScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('train.title')} subtitle={t('train.subtitle')}>
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
