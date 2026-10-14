import type { Me } from '@pokerall/shared/client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AccountErrorCode } from '@/account/api';
import { kvStorage } from '@/lib/storage';

type AccountState = {
  /** The signed-in account as last seen; null when signed out. */
  me: Me | null;
  /** Id of this install for progress counters; made on the first sync. */
  deviceId: string | null;
  /**
   * The account whose progress this phone holds. Signing in to another account first clears the phone's
   * progress, so one account's progress never leaks into another.
   */
  boundUserId: string | null;
  /** Counter totals from the account's other phones, as of the last sync. */
  others: Record<string, number>;
  lastSyncAt: number | null;
  /** The server refused the nickname from this phone: someone else has it. */
  nicknameTaken: string | null;
  /** The server ended the session (signed out on the web, account deleted); the player signs in again. */
  sessionExpired: boolean;
  /** Not saved. */
  syncing: boolean;
  syncError: AccountErrorCode | null;
};

export const useAccount = create<AccountState>()(
  persist(
    (): AccountState => ({
      me: null,
      deviceId: null,
      boundUserId: null,
      others: {},
      lastSyncAt: null,
      nicknameTaken: null,
      sessionExpired: false,
      syncing: false,
      syncError: null,
    }),
    {
      name: 'account',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ me, deviceId, boundUserId, others, lastSyncAt, nicknameTaken, sessionExpired }) => ({
        me,
        deviceId,
        boundUserId,
        others,
        lastSyncAt,
        nicknameTaken,
        sessionExpired,
      }),
    },
  ),
);

/** Only an email or Google sign-in can bring the account back on another phone. */
export function isGuestOnly(me: Me | null): boolean {
  return !!me && me.identities.every((i) => i.kind === 'guest');
}
