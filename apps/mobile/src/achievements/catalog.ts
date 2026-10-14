import { allLessons, MODULES, type ModuleId } from '@pokerall/content';

import { beatenCount, botsInLeague, type BeatenById, type LeagueId } from '@/bots/catalog';
import type { LessonProgress } from '@/store/academy';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Everything achievements are measured on. */
export type AchievementInputs = {
  beaten: BeatenById;
  botWins: number;
  lessons: Record<string, LessonProgress>;
  pro: boolean;
  hands: number;
  showdownWins: number;
  analyses: number;
  cleanAnalyses: number;
  drillRight: number;
  preflopBestStreak: number;
  /** The table look or the avatar differs from the defaults. */
  customized: boolean;
};

export type Achievement = {
  id: string;
  rarity: Rarity;
  /** Progress towards `target`; the achievement opens when it gets there. */
  progress: (s: AchievementInputs) => number;
  target: number;
};

const passedIn = (s: AchievementInputs, ids: string[]) => ids.filter((id) => s.lessons[id]?.passed).length;
const moduleLessons = (id: ModuleId) => MODULES.find((m) => m.id === id)?.lessons ?? [];
/** Lessons the player can open: free ones, and Pro ones with Pro. */
const openLessons = (s: AchievementInputs) => allLessons().filter((l) => l.free || s.pro).map((l) => l.id);
const openLevelLessons = (s: AchievementInputs, level: string) =>
  allLessons().filter((l) => l.level === level && (l.free || s.pro)).map((l) => l.id);
const league = (s: AchievementInputs, id: LeagueId) => beatenCount(id, s.beaten);
const bot = (s: AchievementInputs, id: string) => ((s.beaten[id] ?? 0) > 0 ? 1 : 0);

/**
 * Every achievement gives a title of the same name. Ordered by rarity, then roughly by how soon a player
 * gets there.
 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-blood', rarity: 'common', target: 1, progress: (s) => s.botWins },
  { id: 'first-lesson', rarity: 'common', target: 1, progress: (s) => passedIn(s, allLessons().map((l) => l.id)) },
  { id: 'warm-up', rarity: 'common', target: 50, progress: (s) => s.drillRight },
  { id: 'self-review', rarity: 'common', target: 1, progress: (s) => s.analyses },
  { id: 'stylist', rarity: 'common', target: 1, progress: (s) => (s.customized ? 1 : 0) },
  { id: 'regular-guest', rarity: 'common', target: 100, progress: (s) => s.hands },

  { id: 'novice-slayer', rarity: 'rare', target: botsInLeague('novices').length, progress: (s) => league(s, 'novices') },
  { id: 'maniac-tamer', rarity: 'rare', target: 1, progress: (s) => bot(s, 'max') },
  { id: 'rules-expert', rarity: 'rare', target: moduleLessons('basics').length, progress: (s) => passedIn(s, moduleLessons('basics')) },
  { id: 'river-master', rarity: 'rare', target: 25, progress: (s) => s.showdownWins },
  { id: 'cool-head', rarity: 'rare', target: 10, progress: (s) => s.cleanAnalyses },
  { id: 'veteran', rarity: 'rare', target: 1000, progress: (s) => s.hands },

  { id: 'regular', rarity: 'epic', target: 5, progress: (s) => league(s, 'regulars') },
  { id: 'pro', rarity: 'epic', target: 3, progress: (s) => league(s, 'pros') },
  // Measured as a share, since Pro opens more lessons: done when every open intermediate lesson is passed.
  {
    id: 'theorist',
    rarity: 'epic',
    target: 1,
    progress: (s) => (passedIn(s, openLevelLessons(s, 'intermediate')) === openLevelLessons(s, 'intermediate').length ? 1 : 0),
  },
  { id: 'iron-nerves', rarity: 'epic', target: 20, progress: (s) => s.preflopBestStreak },
  { id: 'luck-tamer', rarity: 'epic', target: 1, progress: (s) => bot(s, 'lekha') },

  { id: 'master', rarity: 'legendary', target: botsInLeague('masters').length, progress: (s) => league(s, 'masters') },
  { id: 'neon-out', rarity: 'legendary', target: 1, progress: (s) => bot(s, 'neon') },
  { id: 'sees-through', rarity: 'legendary', target: 1, progress: (s) => bot(s, 'danil') },
  { id: 'academic', rarity: 'legendary', target: 1, progress: (s) => (passedIn(s, openLessons(s)) === openLessons(s).length ? 1 : 0) },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
