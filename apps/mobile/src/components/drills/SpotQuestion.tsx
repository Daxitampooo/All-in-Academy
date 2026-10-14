import { RFI_RANGES, cbetPlan, rangeActions, rangeAdvantage, type DailyQuestion, type TextureQuestion } from '@pokerall/content';
import { RANKS, describeHand, rangeShare, type Card } from '@pokerall/poker-engine';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { QuizBlock } from '@/components/academy/QuizBlock';
import { AppText } from '@/components/AppText';
import { hitChance } from '@/components/drills/odds';
import { PlayingCard } from '@/components/table/PlayingCard';
import { formatChips } from '@/lib/format';
import { handNameKey } from '@/table/describe';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

function Cards({ cards, label }: { cards: readonly Card[]; label?: string }) {
  return (
    <View style={styles.group}>
      {label ? (
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
      ) : null}
      <View style={styles.cards}>
        {cards.map((c) => (
          <PlayingCard key={c} card={c} size="md" />
        ))}
      </View>
    </View>
  );
}

/** How the board looks, in words: "dry, rainbow" / "wet, two of a suit, connected". */
export function textureWords(t: TFunction, q: TextureQuestion): string {
  const tx = q.texture;
  const parts = [t(tx.wet ? 'drills.texture.wet' : 'drills.texture.dry'), t(`drills.texture.suits.${tx.suits}`)];
  if (tx.connected) parts.push(t('drills.texture.connected'));
  if (tx.paired) parts.push(t('drills.texture.paired'));
  return parts.join(', ');
}

/** Why the texture question has its answer. */
export function textureExplain(t: TFunction, q: TextureQuestion): string {
  const adv = rangeAdvantage(q.texture);
  const top = RANKS[q.texture.top] === 'T' ? '10' : RANKS[q.texture.top]!;
  return [
    t('drills.texture.board', { words: textureWords(t, q), top }),
    t(`drills.texture.why.${adv}`),
    t(`drills.texture.plan.${cbetPlan(q.texture)}`),
  ].join(' ');
}

export const TEXTURE_OPTIONS = {
  advantage: ['raiser', 'caller', 'even'],
  cbet: ['small', 'big', 'check'],
} as const;

/** The texture question: the board and either "who does it suit" or "which c-bet". */
export function TextureBlock({ q, label, onAnswer }: { q: TextureQuestion; label?: string; onAnswer: (right: boolean) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <>
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText>{t('drills.texture.spot')}</AppText>
        <Cards cards={q.board} label={t('drills.outs.flop')} />
      </View>
      <QuizBlock
        label={label}
        question={t(`drills.texture.question.${q.ask}`)}
        options={TEXTURE_OPTIONS[q.ask].map((o) => t(`drills.texture.options.${q.ask}.${o}`))}
        answer={q.answer}
        explain={textureExplain(t, q)}
        onAnswer={onAnswer}
      />
    </>
  );
}

/**
 * One question of the daily challenge, drawn like its own trainer. `onAnswer` gets whether the answer counts as
 * right (both answers count for a hand the range plays part of the time).
 */
export function SpotQuestion({ question, label, onAnswer }: { question: DailyQuestion; label: string; onAnswer: (right: boolean) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const box = [styles.box, { borderColor: colors.border, backgroundColor: colors.surface }];

  switch (question.kind) {
    case 'preflop': {
      const q = question.q;
      const mixed = q.raise > 0.01 && q.raise < 0.99;
      const share = rangeShare(rangeActions(RFI_RANGES[q.seat]!).raise!);
      return (
        <>
          <View style={box}>
            <AppText>{t('drills.preflop.situation', { seat: q.seat })}</AppText>
            <Cards cards={q.cards} />
          </View>
          <QuizBlock
            label={label}
            question={t('drills.daily.preflopQuestion')}
            options={[t('drills.preflop.raise'), t('drills.preflop.fold')]}
            answer={q.raise >= 0.5 ? 0 : 1}
            explain={[
              mixed ? t('drills.preflop.mixed') + '.' : null,
              t('drills.preflop.explain', { seat: q.seat, share: Math.round(share * 100), hand: q.handClass, pct: Math.round(q.raise * 100) }),
            ]
              .filter(Boolean)
              .join(' ')}
            onAnswer={(right) => onAnswer(right || mixed)}
          />
        </>
      );
    }
    case 'potOdds': {
      const q = question.q;
      return (
        <QuizBlock
          label={label}
          question={t('drills.potOdds.question', { pot: formatChips(q.pot), bet: formatChips(q.bet) })}
          options={q.options.map((o) => `${o}%`)}
          answer={q.answer}
          explain={t('drills.potOdds.explain', { bet: formatChips(q.bet), pot: formatChips(q.pot), total: formatChips(q.pot + 2 * q.bet), need: q.need })}
          onAnswer={onAnswer}
        />
      );
    }
    case 'outs': {
      const q = question.q;
      const outs = q.outs.length;
      return (
        <>
          <View style={box}>
            <Cards cards={q.hole} label={t('drills.outs.hand')} />
            <Cards cards={q.board} label={t('drills.outs.flop')} />
          </View>
          <QuizBlock
            label={label}
            question={t('drills.outs.question')}
            options={q.options.map(String)}
            answer={q.answer}
            explain={t('drills.outs.explain', {
              outs,
              turn: Math.round(hitChance(outs, 1) * 100),
              river: Math.round(hitChance(outs, 2) * 100),
              rule2: outs * 2,
              rule4: outs * 4,
            })}
            onAnswer={onAnswer}
          />
        </>
      );
    }
    case 'showdown': {
      const q = question.q;
      const names = q.hands.map((h) => t(handNameKey(describeHand([...h, ...q.board]).categoryId, h)));
      return (
        <>
          <View style={box}>
            <Cards cards={q.board} label={t('drills.showdown.board')} />
            <View style={styles.hands}>
              {q.hands.map((h, i) => (
                <Cards key={i} cards={h} label={t('drills.showdown.hand', { n: i + 1 })} />
              ))}
            </View>
          </View>
          <QuizBlock
            label={label}
            question={t('drills.showdown.question')}
            options={[t('drills.showdown.hand', { n: 1 }), t('drills.showdown.hand', { n: 2 }), t('drills.showdown.split')]}
            answer={q.winner}
            explain={
              q.winner === 2
                ? t('drills.showdown.explainSplit', { name: names[0] })
                : t('drills.showdown.explain', { n: q.winner + 1, winner: names[q.winner], loser: names[1 - q.winner] })
            }
            onAnswer={onAnswer}
          />
        </>
      );
    }
    case 'texture':
      return <TextureBlock q={question.q} label={label} onAnswer={onAnswer} />;
  }
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.md,
  },
  group: {
    gap: space.xs,
  },
  cards: {
    flexDirection: 'row',
    gap: space.sm,
  },
  hands: {
    flexDirection: 'row',
    gap: space.lg,
  },
});
