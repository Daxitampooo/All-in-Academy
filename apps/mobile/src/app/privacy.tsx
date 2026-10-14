import { DEFAULT_PRIVACY, type Privacy } from '@pokerall/shared/client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { savePrivacy } from '@/account/actions';
import { AccountError } from '@/account/api';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { ToggleRow } from '@/components/ToggleRow';
import { useAccount } from '@/store/account';

const AUDIENCES = ['everyone', 'friends', 'nobody'] as const;

/** Who can see the profile, write and send friend requests. Saved in the account right away. */
export default function PrivacyScreen() {
  const { t } = useTranslation();
  const me = useAccount((s) => s.me);
  const privacy = me?.privacy ?? DEFAULT_PRIVACY;
  const [error, setError] = useState<string | null>(null);

  const change = (patch: Partial<Privacy>) => {
    setError(null);
    savePrivacy({ ...privacy, ...patch }).catch((e: unknown) => {
      const code = e instanceof AccountError ? e.code : 'internal';
      setError(t(`account.errors.${code}`, { defaultValue: t('account.errors.internal') }));
    });
  };

  return (
    <Screen
      header={<BackButton label={t('account.title')} fallback="/account" />}
      title={t('privacy.title')}
      subtitle={me ? t('privacy.subtitle') : t('privacy.signInFirst')}>
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <OptionGroup
        title={t('privacy.profile')}
        hint={t('privacy.profileHint')}
        options={AUDIENCES.map((value) => ({ value, label: t(`privacy.audience.${value}`) }))}
        selected={privacy.profileVisibility}
        onSelect={(profileVisibility) => change({ profileVisibility })}
        disabled={!me}
      />
      <OptionGroup
        title={t('privacy.messages')}
        options={AUDIENCES.map((value) => ({ value, label: t(`privacy.audience.${value}`) }))}
        selected={privacy.messages}
        onSelect={(messages) => change({ messages })}
        disabled={!me}
      />
      <OptionGroup
        title={t('privacy.friendRequests')}
        options={(['everyone', 'nobody'] as const).map((value) => ({ value, label: t(`privacy.requests.${value}`) }))}
        selected={privacy.friendRequests}
        onSelect={(friendRequests) => change({ friendRequests })}
        disabled={!me}
      />
      <ToggleRow
        title={t('privacy.showOnline')}
        hint={t('privacy.showOnlineHint')}
        value={privacy.showOnline}
        onChange={(showOnline) => (me ? change({ showOnline }) : undefined)}
      />
      <AppText variant="caption" tone="muted">
        {t('privacy.later')}
      </AppText>
    </Screen>
  );
}
