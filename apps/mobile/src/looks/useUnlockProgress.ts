import { useMemo } from 'react';

import { useAchievementLog } from '@/store/achievements';
import { beatenById, useBotProgress } from '@/store/botProgress';
import { usePro } from '@/store/pro';

import type { UnlockProgress } from './resolve';

/** The player's progress that opens cosmetics: bots beaten, achievements earned, Pro. */
export function useUnlockProgress(): UnlockProgress {
  const records = useBotProgress((s) => s.records);
  const achieved = useAchievementLog((s) => s.unlockedAt);
  const pro = usePro();
  return useMemo(() => ({ beaten: beatenById(records), achieved, pro }), [achieved, pro, records]);
}
