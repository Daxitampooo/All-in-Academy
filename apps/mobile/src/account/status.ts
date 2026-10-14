import type { Me } from '@pokerall/shared/client';
import type { TFunction } from 'i18next';

import { API_URL } from '@/account/config';

/** One line about the account for settings and the profile: who is signed in, or why not. */
export function accountLine(t: TFunction, me: Me | null): string {
  if (!API_URL) return t('account.status.noServer');
  if (!me) return t('account.status.signedOut');
  const email = me.identities.find((i) => i.email)?.email;
  return email ? t('account.status.email', { email }) : t('account.status.guest');
}
