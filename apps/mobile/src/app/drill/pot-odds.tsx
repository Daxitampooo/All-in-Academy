import { potOddsQuestion, type PotOddsQuestion } from '@pokerall/content';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { QuizBlock } from '@/components/academy/QuizBlock';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { addAnswer, EMPTY_SCORE, ScoreBar } from '@/components/drills/ScoreBar';
import { useDrillRng } from '@/components/drills/useDrillRng';
import { Screen } from '@/components/Screen';
import { formatChips } from '@/lib/format';

export default function PotOddsDrill() {
  const { t } = useTranslation();
  const rng = useDrillRng();
  const [n, setN] = useState(0);
  const [q, setQ] = useState<PotOddsQuestion>(() => potOddsQuestion(rng));
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(EMPTY_SCORE);
  return (
    <Screen header={<BackButton label={t('train.title')} fallback="/train" />} title={t('drills.potOdds.title')} subtitle={t('drills.potOdds.subtitle')}>
      <ScoreBar score={score} />
      <QuizBlock
        key={n}
        question={t('drills.potOdds.question', { pot: formatChips(q.pot), bet: formatChips(q.bet) })}
        options={q.options.map((o) => `${o}%`)}
        answer={q.answer}
        explain={t('drills.potOdds.explain', { bet: formatChips(q.bet), pot: formatChips(q.pot), total: formatChips(q.pot + 2 * q.bet), need: q.need })}
        onAnswer={(right) => {
          setScore((s) => addAnswer(s, right));
          setAnswered(true);
        }}
      />
      {answered ? (
        <Button
          label={t('drills.next')}
          onPress={() => {
            setQ(potOddsQuestion(rng));
            setN((x) => x + 1);
            setAnswered(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
