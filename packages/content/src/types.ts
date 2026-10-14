export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Locale = 'en' | 'ru';

export type ModuleId =
  | 'basics'
  | 'positions'
  | 'preflop'
  | 'math'
  | 'postflop'
  | 'reads'
  | 'mindset'
  | 'theory'
  | 'tournaments'
  | 'cash'
  | 'shorthanded';

/**
 * One block of a lesson. The structure lives in the lesson's meta.json; every text it shows lives in
 * en.json and ru.json under the block's id.
 */
export type BlockMeta =
  /** Paragraphs; "- " starts a bullet, **bold** works. Text: `text`. */
  | { id: string; type: 'text' }
  /** All hand categories from best to worst, with an example and how often each comes. Text: optional `caption`. */
  | { id: string; type: 'handRanking' }
  /**
   * Rows of cards: "As Kd" for a hand, "| Qh Jh 2c" for a board, "As Kd | Qh Jh 2c" for both.
   * Text: `labels` (one per row), optional `caption`.
   */
  | { id: string; type: 'cards'; rows: string[] }
  /** A table with seat names by position, some highlighted. Text: `caption`. */
  | { id: string; type: 'table'; seats: 2 | 6 | 9; highlight: string[] }
  /** A 13×13 range from `ranges/`. Text: `caption`. */
  | { id: string; type: 'range'; range: string }
  /** Pot odds calculator: the player picks a bet size and sees the equity a call needs. Text: `caption`. */
  | { id: string; type: 'potOdds'; bet: number }
  /** A question inside the lesson. Text: `q`, `options`, `explain`. */
  | { id: string; type: 'quiz'; answer: number; options: number };

export type BlockType = BlockMeta['type'];

export type Question = { id: string; answer: number; options: number };

export type LessonMeta = {
  id: string;
  module: ModuleId;
  level: Level;
  /** Free for everyone; otherwise Pro. */
  free: boolean;
  /** Reading time. */
  minutes: number;
  blocks: BlockMeta[];
  /** The test at the end. */
  test: Question[];
  /** Share of the test to answer right to complete the lesson. */
  pass: number;
};

export type BlockText = {
  text?: string;
  caption?: string;
  labels?: string[];
  q?: string;
  options?: string[];
  explain?: string;
};

export type QuestionText = { q: string; options: string[]; explain: string };

export type LessonText = {
  title: string;
  summary: string;
  blocks: Record<string, BlockText>;
  test: Record<string, QuestionText>;
};

export type Lesson = LessonMeta & { text: Record<Locale, LessonText> };

export type ModuleMeta = {
  id: ModuleId;
  level: Level;
  /** Lesson ids in order; empty for modules still being written. */
  lessons: string[];
};

/** A range for a spot, in the notation of popular poker tools; weights after ":" mean mixed frequencies. */
export type RangeSpec = {
  id: string;
  format: '6max' | 'hu';
  stackBb: number;
  spot: { type: string; hero: string; villain?: string };
  actions: Record<string, { range: string; sizeBb?: number }>;
  free: boolean;
  source: 'simplified-educational';
};

export type GlossaryTerm = { term: string; definition: string; lesson?: string };
