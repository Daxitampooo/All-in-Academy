import { useTranslation } from 'react-i18next';

import { Badge, type BadgeTone } from '@/components/Badge';
import { FeatureRow, type Accent } from '@/components/FeatureRow';
import { Screen } from '@/components/Screen';

type Level = 'beginner' | 'intermediate' | 'advanced';

const levelTone: Record<Level, BadgeTone> = {
  beginner: 'lime',
  intermediate: 'cyan',
  advanced: 'magenta',
};

const tracks: { id: string; level: Level | null; accent: Accent }[] = [
  { id: 'basics', level: 'beginner', accent: 'lime' },
  { id: 'positions', level: 'beginner', accent: 'lime' },
  { id: 'ranges', level: 'intermediate', accent: 'cyan' },
  { id: 'sizing', level: 'intermediate', accent: 'cyan' },
  { id: 'math', level: 'intermediate', accent: 'cyan' },
  { id: 'strategy', level: 'advanced', accent: 'magenta' },
  { id: 'glossary', level: null, accent: 'amber' },
];

export default function AcademyScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('academy.title')} subtitle={t('academy.subtitle')}>
      {tracks.map((track) => (
        <FeatureRow
          key={track.id}
          accent={track.accent}
          title={t(`academy.tracks.${track.id}.title`)}
          body={t(`academy.tracks.${track.id}.body`)}
          badges={
            <>
              {track.level ? (
                <Badge label={t(`levels.${track.level}`)} tone={levelTone[track.level]} />
              ) : null}
              <Badge label={t('common.soon')} />
            </>
          }
        />
      ))}
    </Screen>
  );
}
