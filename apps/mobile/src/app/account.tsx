import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { continueAsGuest, deleteAccount, linkEmail, login, register, signOut, syncNow } from '@/account/actions';
import { AccountError, type AccountErrorCode } from '@/account/api';
import { API_URL } from '@/account/config';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ShieldIcon } from '@/components/icons';
import { NavRow } from '@/components/NavRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { isGuestOnly, useAccount } from '@/store/account';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

const PASSWORD_MIN = 8;

type Failure = { code: AccountErrorCode; field?: string };

function failureOf(error: unknown): Failure {
  return error instanceof AccountError ? { code: error.code, field: error.field } : { code: 'internal' };
}

/** A message for a failed request, in the player's words. */
function errorText(t: TFunction, failure: Failure | null): string | null {
  if (!failure) return null;
  if (failure.code === 'bad_request' && failure.field === 'email') return t('account.errors.badEmail');
  if (failure.code === 'bad_request' && failure.field === 'password') return t('account.errors.badPassword');
  return t(`account.errors.${failure.code}`, { defaultValue: t('account.errors.internal') });
}

const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function AccountScreen() {
  const { t } = useTranslation();
  const me = useAccount((s) => s.me);
  const sessionExpired = useAccount((s) => s.sessionExpired);
  const [deleted, setDeleted] = useState(false);

  return (
    <Screen
      header={<BackButton label={t('settings.back')} fallback="/settings" />}
      title={t('account.title')}
      subtitle={t('account.subtitle')}>
      {!API_URL ? <Notice tone="amber" text={t('account.noServer')} /> : null}
      {deleted ? <Notice tone="lime" text={t('account.deleted')} /> : null}
      {sessionExpired && !me ? <Notice tone="amber" text={t('account.sessionExpired')} /> : null}
      {me ? <SignedIn onDeleted={() => setDeleted(true)} /> : <SignedOut onSignedIn={() => setDeleted(false)} />}
    </Screen>
  );
}

function Notice({ text, tone }: { text: string; tone: 'amber' | 'lime' | 'magenta' }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.notice, { borderColor: withAlpha(colors[tone], 0.7), backgroundColor: withAlpha(colors[tone], 0.08) }]}
      accessibilityRole="alert">
      <AppText>{text}</AppText>
    </View>
  );
}

function SignedOut({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'guest' | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const off = !API_URL;

  const emailProblem = email.length > 0 && !looksLikeEmail(email);
  const passwordShort = mode === 'register' && password.length > 0 && password.length < PASSWORD_MIN;
  const canSubmit = !off && !busy && looksLikeEmail(email) && password.length >= (mode === 'register' ? PASSWORD_MIN : 1);

  const run = async (kind: 'email' | 'guest', action: () => Promise<void>) => {
    setBusy(kind);
    setFailure(null);
    try {
      await action();
      onSignedIn();
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setBusy(null);
    }
  };

  const submit = () =>
    run('email', () => (mode === 'login' ? login(email.trim(), password) : register(email.trim(), password)));

  return (
    <>
      <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityRole="tablist">
        {(['login', 'register'] as const).map((m) => {
          const active = m === mode;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setFailure(null);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && { backgroundColor: withAlpha(colors.cyan, 0.16) }]}>
              <AppText variant="label" strong={active} tone={active ? 'cyan' : 'muted'}>
                {t(`account.${m}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        <TextField
          label={t('account.email')}
          value={email}
          onChangeText={setEmail}
          editable={!off}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={emailProblem ? t('account.errors.badEmail') : null}
        />
        <TextField
          label={t('account.password')}
          value={password}
          onChangeText={setPassword}
          editable={!off}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          textContentType={mode === 'login' ? 'password' : 'newPassword'}
          hint={mode === 'register' ? t('account.passwordHint', { count: PASSWORD_MIN }) : undefined}
          error={passwordShort ? t('account.passwordHint', { count: PASSWORD_MIN }) : null}
          onSubmitEditing={canSubmit ? submit : undefined}
        />
        {failure && busy === null ? (
          <AppText tone="danger" accessibilityRole="alert">
            {errorText(t, failure)}
          </AppText>
        ) : null}
        <Button
          label={busy === 'email' ? t('account.wait') : t(mode === 'login' ? 'account.loginButton' : 'account.registerButton')}
          onPress={submit}
          disabled={!canSubmit}
        />
      </View>

      <View style={styles.or}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <AppText variant="caption" tone="muted">
          {t('account.or')}
        </AppText>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      <Button
        label={busy === 'guest' ? t('account.wait') : t('account.guest')}
        hint={t('account.guestHint')}
        kind="secondary"
        onPress={() => run('guest', continueAsGuest)}
        disabled={off || !!busy}
      />
    </>
  );
}

function syncLine(t: TFunction, syncing: boolean, lastSyncAt: number | null, error: AccountErrorCode | null): string {
  if (syncing) return t('account.syncing');
  if (error) return errorText(t, { code: error }) ?? '';
  if (!lastSyncAt) return t('account.notSynced');
  const minutes = Math.floor((Date.now() - lastSyncAt) / 60_000);
  if (minutes < 1) return t('account.syncedNow');
  if (minutes < 60) return t('account.syncedMinutes', { count: minutes });
  return t('account.syncedAt', {
    time: new Date(lastSyncAt).toLocaleString(t('account.dateLocale'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  });
}

function SignedIn({ onDeleted }: { onDeleted: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const me = useAccount((s) => s.me)!;
  const syncing = useAccount((s) => s.syncing);
  const lastSyncAt = useAccount((s) => s.lastSyncAt);
  const syncError = useAccount((s) => s.syncError);
  const nicknameTaken = useAccount((s) => s.nicknameTaken);
  const guestOnly = isGuestOnly(me);
  const email = me.identities.find((i) => i.email)?.email;

  const [dialog, setDialog] = useState<'signOut' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogFailure, setDialogFailure] = useState<Failure | null>(null);

  const confirm = async () => {
    setBusy(true);
    setDialogFailure(null);
    try {
      if (dialog === 'delete') {
        await deleteAccount();
        onDeleted();
      } else {
        await signOut();
      }
      setDialog(null);
    } catch (error) {
      setDialogFailure(failureOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText variant="caption" tone="muted">
          {t('account.signedInAs')}
        </AppText>
        <AppText variant="title">{email ?? t('account.guestAccount')}</AppText>
        <AppText variant="caption" tone={syncError ? 'danger' : 'muted'}>
          {syncLine(t, syncing, lastSyncAt, syncError)}
        </AppText>
        <Button label={t('account.syncNow')} kind="secondary" onPress={() => syncNow().catch(() => undefined)} disabled={syncing} />
      </View>

      {nicknameTaken ? (
        <View style={styles.form}>
          <Notice tone="magenta" text={t('account.nicknameTaken', { nickname: nicknameTaken })} />
          <Button label={t('account.changeNickname')} kind="secondary" onPress={() => router.push('/edit-profile')} />
        </View>
      ) : null}

      {guestOnly ? <AddEmail /> : null}

      <NavRow
        icon={<ShieldIcon color={colors.cyan} />}
        title={t('privacy.title')}
        hint={t('privacy.linkHint')}
        onPress={() => router.push('/privacy')}
      />

      <Button label={t('account.signOut')} kind="secondary" onPress={() => setDialog('signOut')} />

      <View style={[styles.danger, { borderColor: withAlpha(colors.magenta, 0.5) }]}>
        <AppText variant="heading">{t('account.deleteTitle')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('account.deleteHint')}
        </AppText>
        <Button label={t('account.delete')} kind="danger" onPress={() => setDialog('delete')} />
      </View>

      <ConfirmDialog
        visible={dialog !== null}
        title={t(dialog === 'delete' ? 'account.deleteConfirmTitle' : 'account.signOutConfirmTitle')}
        body={
          dialog === 'delete'
            ? t('account.deleteConfirmBody')
            : guestOnly
              ? t('account.signOutGuestBody')
              : t('account.signOutBody')
        }
        confirmLabel={t(dialog === 'delete' ? 'account.deleteConfirm' : 'account.signOut')}
        cancelLabel={t('account.cancel')}
        danger={dialog === 'delete'}
        busy={busy}
        error={errorText(t, dialogFailure)}
        onConfirm={confirm}
        onCancel={() => {
          setDialog(null);
          setDialogFailure(null);
        }}
      />
    </>
  );
}

/** A guest account lives only on this phone; an email lets the player sign in anywhere. */
function AddEmail() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const canSubmit = !busy && looksLikeEmail(email) && password.length >= PASSWORD_MIN;

  const submit = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await linkEmail(email.trim(), password);
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: withAlpha(colors.amber, 0.6) }]}>
      <AppText variant="heading">{t('account.addEmailTitle')}</AppText>
      <AppText variant="caption" tone="muted">
        {t('account.addEmailHint')}
      </AppText>
      <TextField
        label={t('account.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        error={email.length > 0 && !looksLikeEmail(email) ? t('account.errors.badEmail') : null}
      />
      <TextField
        label={t('account.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        hint={t('account.passwordHint', { count: PASSWORD_MIN })}
      />
      {failure ? <AppText tone="danger">{errorText(t, failure)}</AppText> : null}
      <Button label={busy ? t('account.wait') : t('account.addEmail')} onPress={submit} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.xxs,
    gap: space.xxs,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: space.md,
  },
  or: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  danger: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.md,
  },
});
