import { textureQuestion, type TextureQuestion } from '@pokerall/content';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { addAnswer, EMPTY_SCORE, ScoreBar } from '@/components/drills/ScoreBar';
import { TextureBlock } from '@/components/drills/SpotQuestion';
import { useDrillRng } from '@/components/drills/useDrillRng';
import { ProLock } from '@/components/ProLock';
import { Screen } from '@/components/Screen';
import { useLifetime } from '@/store/lifetime';
import { usePro } from '@/store/pro';

export default function TextureDrillScreen() {
  const { t } = useTranslation();
  const pro = usePro();
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('drills.texture.title')} subtitle={t('drills.texture.subtitle')}>
      {pro ? <Drill /> : <ProLock what={t('drills.texture.pro')} />}
    </Screen>
  );
}

function Drill() {
  const { t } = useTranslation();
  const rng = useDrillRng();
  const [n, setN] = useState(0);
  const [q, setQ] = useState<TextureQuestion>(() => textureQuestion(rng));
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(EMPTY_SCORE);
  return (
    <>
      <ScoreBar score={score} />
      <TextureBlock
        key={n}
        q={q}
        onAnswer={(right) => {
          useLifetime.getState().addDrillAnswer(right);
          setScore((s) => addAnswer(s, right));
          setAnswered(true);
        }}
      />
      {answered ? (
        <Button
          label={t('drills.next')}
          onPress={() => {
            setQ(textureQuestion(rng));
            setN((x) => x + 1);
            setAnswered(false);
          }}
        />
      ) : null}
    </>
  );
}
