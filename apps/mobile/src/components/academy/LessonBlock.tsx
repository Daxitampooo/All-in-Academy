import { rangeActions, type BlockMeta, type BlockText } from '@pokerall/content';

import { CardsBlock } from './CardsBlock';
import { HandRankingBlock } from './HandRankingBlock';
import { PositionsTable } from './PositionsTable';
import { PotOddsCalc } from './PotOddsCalc';
import { QuizBlock } from './QuizBlock';
import { RangeMatrix } from './RangeMatrix';
import { RichText } from './RichText';

/** One block of a lesson, drawn by its type with its texts. */
export function LessonBlock({ block, text }: { block: BlockMeta; text: BlockText }) {
  switch (block.type) {
    case 'text':
      return <RichText text={text.text ?? ''} />;
    case 'handRanking':
      return <HandRankingBlock caption={text.caption} />;
    case 'cards':
      return <CardsBlock rows={block.rows} labels={text.labels ?? []} caption={text.caption} />;
    case 'table':
      return <PositionsTable seats={block.seats} highlight={block.highlight} caption={text.caption} />;
    case 'range':
      return <RangeMatrix actions={rangeActions(block.range)} caption={text.caption} />;
    case 'potOdds':
      return <PotOddsCalc initial={block.bet} caption={text.caption} />;
    case 'quiz':
      return <QuizBlock question={text.q ?? ''} options={text.options ?? []} answer={block.answer} explain={text.explain ?? ''} />;
  }
}
