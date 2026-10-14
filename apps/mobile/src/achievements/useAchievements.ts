import { useMemo } from 'react';

import { DEFAULT_LOOK, LOOK_CATEGORIES } from '@/looks/catalog';
import { DEFAULT_AVATAR } from '@/profile/avatar';
import { useAcademy } from '@/store/academy';
import { beatenById, useBotProgress } from '@/store/botProgress';
import { useLifetime } from '@/store/lifetime';
import { useLook } from '@/store/look';
import { usePro } from '@/store/pro';
import { useProfile } from '@/store/profile';

import { ACHIEVEMENTS, type Achievement, type AchievementInputs } from './catalog';

export type AchievementStatus = { achievement: Achievement; value: number; done: boolean };

/** Every achievement with the player's progress. */
export function useAchievements(): AchievementStatus[] {
  const records = useBotProgress((s) => s.records);
  const lessons = useAcademy((s) => s.lessons);
  const lifetime = useLifetime();
  const selected = useLook((s) => s.selected);
  const avatar = useProfile((s) => s.avatar);
  const pro = usePro();
  return useMemo(() => {
    const inputs: AchievementInputs = {
      beaten: beatenById(records),
      botWins: Object.values(records).reduce((n, r) => n + r.wins, 0),
      lessons,
      pro,
      hands: lifetime.hands,
      showdownWins: lifetime.showdownWins,
      analyses: lifetime.analyses,
      cleanAnalyses: lifetime.cleanAnalyses,
      drillRight: lifetime.drillRight,
      preflopBestStreak: lifetime.preflopBestStreak,
      customized:
        LOOK_CATEGORIES.some((c) => selected[c] !== DEFAULT_LOOK[c]) || JSON.stringify(avatar) !== JSON.stringify(DEFAULT_AVATAR),
    };
    return ACHIEVEMENTS.map((achievement) => {
      const value = Math.min(achievement.target, achievement.progress(inputs));
      return { achievement, value, done: value >= achievement.target };
    });
  }, [avatar, lessons, lifetime, pro, records, selected]);
}
