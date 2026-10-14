import { useEffect } from 'react';
import { AppState } from 'react-native';

import { pushProfile, refreshMe, syncNow } from '@/account/actions';
import { API_URL } from '@/account/config';
import { useAcademy } from '@/store/academy';
import { useAccount } from '@/store/account';
import { useAchievementLog } from '@/store/achievements';
import { useBotProgress } from '@/store/botProgress';
import { useLifetime } from '@/store/lifetime';
import { useLook } from '@/store/look';
import { useProfile } from '@/store/profile';

/** Progress changes are sent in one batch this long after the last one (a hand, a lesson, a choice). */
const PROGRESS_DELAY_MS = 8_000;
const PROFILE_DELAY_MS = 2_000;

const quiet = () => undefined;

/**
 * Keeps the account in step with the phone: syncs on start, when the app comes back to the screen, and a few
 * seconds after progress or the profile changes. Does nothing without a server or when signed out.
 * Lives once, in the root layout.
 */
export function SyncManager() {
  const signedIn = useAccount((s) => !!s.me);

  useEffect(() => {
    if (!API_URL || !signedIn) return;
    refreshMe().catch(quiet);
    syncNow().catch(quiet);

    let progressTimer: ReturnType<typeof setTimeout> | undefined;
    let profileTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleSync = () => {
      clearTimeout(progressTimer);
      progressTimer = setTimeout(() => syncNow().catch(quiet), PROGRESS_DELAY_MS);
    };
    const onProgress = () => {
      // Applying a sync answer changes the stores too; that must not start another sync.
      if (!useAccount.getState().syncing) scheduleSync();
    };
    const unsubs = [
      useLifetime.subscribe(onProgress),
      useBotProgress.subscribe(onProgress),
      useAchievementLog.subscribe(onProgress),
      useAcademy.subscribe(onProgress),
      useLook.subscribe(onProgress),
      useProfile.subscribe((next, prev) => {
        if (next.updatedAt === prev.updatedAt) return;
        clearTimeout(profileTimer);
        profileTimer = setTimeout(() => pushProfile().catch(quiet), PROFILE_DELAY_MS);
      }),
    ];
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow().catch(quiet);
      // Leaving the app: send what was played right away.
      if (state === 'background') {
        clearTimeout(progressTimer);
        syncNow().catch(quiet);
      }
    });
    return () => {
      clearTimeout(progressTimer);
      clearTimeout(profileTimer);
      unsubs.forEach((u) => u());
      appState.remove();
    };
  }, [signedIn]);

  return null;
}
