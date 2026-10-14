import type { Me, Privacy } from '@pokerall/shared/client';

import { AccountError, api, setSessionLostHandler, type AuthResponse } from '@/account/api';
import { applySyncState, collectPush, resetProgress } from '@/account/progress';
import { newDeviceId, newGuestSecret } from '@/account/random';
import { secureStorage } from '@/account/secure';
import { loadSession, saveSession } from '@/account/session';
import i18n from '@/i18n';
import { useAccount } from '@/store/account';
import { useProfile } from '@/store/profile';

/**
 * Everything the app does with the account: signing in and out, linking an email, syncing progress and the
 * profile, deleting the account. Screens call these and show the AccountError codes they throw.
 */

const GUEST_KEY = 'pokerall.guest';

function locale(): 'en' | 'ru' {
  return i18n.language?.startsWith('ru') ? 'ru' : 'en';
}

setSessionLostHandler(() => {
  useAccount.setState({ me: null, sessionExpired: true, syncing: false });
});

async function afterSignIn({ tokens, me }: AuthResponse): Promise<void> {
  await saveSession(tokens);
  const { boundUserId } = useAccount.getState();
  // This phone holds another account's progress: clear it so it doesn't end up in this one.
  if (boundUserId && boundUserId !== me.id) resetProgress({ hands: false, others: true });
  useAccount.setState({ me, boundUserId: me.id, sessionExpired: false, nicknameTaken: null, syncError: null });
  try {
    await syncProfile(me);
    await syncNow();
  } catch {
    // Signed in all the same; the account screen shows the sync problem and the next sync tries again.
  }
}

/** Signs in to this phone's guest account, making it on the first time. */
export async function continueAsGuest(): Promise<void> {
  let secret = await secureStorage.get(GUEST_KEY);
  if (!secret) {
    secret = newGuestSecret();
    await secureStorage.set(GUEST_KEY, secret);
  }
  await afterSignIn(await api.guest(secret, locale()));
}

export async function register(email: string, password: string): Promise<void> {
  await afterSignIn(await api.register(email, password, locale()));
}

export async function login(email: string, password: string): Promise<void> {
  await afterSignIn(await api.login(email, password));
}

/** Adds email and password to the signed-in (guest) account. */
export async function linkEmail(email: string, password: string): Promise<void> {
  const { me } = await api.linkEmail(email, password);
  useAccount.setState({ me });
}

/**
 * Signs out. The progress stays in the account; the phone's copy is cleared so the next account starts clean.
 * The guest key stays, so "Continue as guest" opens the same guest account again.
 */
export async function signOut(): Promise<void> {
  const session = await loadSession();
  // Last chance to save what was played since the last sync.
  await syncNow().catch(() => undefined);
  if (session) await api.logout(session.refreshToken).catch(() => undefined);
  await saveSession(null);
  resetProgress({ hands: false, others: true });
  useAccount.setState({ me: null, boundUserId: null, lastSyncAt: null, nicknameTaken: null, sessionExpired: false });
}

/** Deletes the account on the server and everything of it on this phone, including the hand history. */
export async function deleteAccount(): Promise<void> {
  await api.deleteAccount();
  await saveSession(null);
  await secureStorage.remove(GUEST_KEY);
  resetProgress({ hands: true, others: true });
  useAccount.setState({ me: null, boundUserId: null, lastSyncAt: null, nicknameTaken: null, sessionExpired: false });
}

export async function refreshMe(): Promise<void> {
  const { me } = await api.me();
  useAccount.setState({ me });
}

export async function savePrivacy(privacy: Privacy): Promise<void> {
  const { me } = useAccount.getState();
  if (me) useAccount.setState({ me: { ...me, privacy } });
  try {
    await api.putPrivacy(privacy);
  } catch (error) {
    if (me) useAccount.setState({ me });
    throw error;
  }
}

/** Sends the profile from this phone. A nickname someone else has is reported, not overwritten. */
export async function pushProfile(): Promise<void> {
  const p = useProfile.getState();
  if (p.updatedAt === 0) return;
  try {
    const { profile, applied } = await api.putProfile(
      {
        nickname: p.nickname,
        about: p.about,
        country: p.country,
        favoriteHand: p.favoriteHand,
        style: p.style,
        avatar: p.avatar,
        title: p.title,
        showTitle: p.showTitle,
      },
      p.updatedAt,
    );
    if (!applied) useProfile.getState().applyRemote(profile);
    const { me } = useAccount.getState();
    useAccount.setState({ nicknameTaken: null, ...(me ? { me: { ...me, profile } } : {}) });
  } catch (error) {
    if (error instanceof AccountError && error.code === 'nickname_taken') {
      useAccount.setState({ nicknameTaken: p.nickname });
      return;
    }
    throw error;
  }
}

/** On sign-in the later of the two profiles wins: the one in the account or the one on this phone. */
async function syncProfile(me: Me): Promise<void> {
  const local = useProfile.getState();
  if (me.profile && me.profile.updatedAt >= local.updatedAt) {
    if (me.profile.updatedAt > local.updatedAt) local.applyRemote(me.profile);
    return;
  }
  try {
    await pushProfile();
  } catch (error) {
    useAccount.setState({ syncError: error instanceof AccountError ? error.code : 'internal' });
    throw error;
  }
}

let running: Promise<void> | null = null;
let again = false;

/** Merges this phone's progress with the account. Calls made during a sync run once more after it. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncOnce();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function syncOnce(): Promise<void> {
  const account = useAccount.getState();
  if (!account.me || !(await loadSession())) return;
  const deviceId = account.deviceId ?? newDeviceId();
  if (!account.deviceId) useAccount.setState({ deviceId });
  useAccount.setState({ syncing: true, syncError: null });
  try {
    const { state } = await api.sync(collectPush(deviceId));
    applySyncState(state);
    useAccount.setState({ lastSyncAt: Date.now() });
  } catch (error) {
    useAccount.setState({ syncError: error instanceof AccountError ? error.code : 'internal' });
    throw error;
  } finally {
    useAccount.setState({ syncing: false });
  }
}
