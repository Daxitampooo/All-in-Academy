import { ABOUT_MAX, NICKNAME_MAX, checkAbout, checkNickname } from '@pokerall/moderation';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { api } from '@/account/api';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { CountryPicker } from '@/components/profile/CountryPicker';
import { HandPicker } from '@/components/profile/HandPicker';
import { Screen } from '@/components/Screen';
import { PlayingCard } from '@/components/table/PlayingCard';
import { PLAY_STYLES, type PlayStyle } from '@/profile/avatar';
import { countryName, flagOf } from '@/profile/countries';
import { showCards } from '@/profile/hands';
import { useAccount } from '@/store/account';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, withAlpha } from '@/theme/tokens';

export default function EditProfileScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfile();
  const [nickname, setNickname] = useState(profile.nickname ?? '');
  const [about, setAbout] = useState(profile.about);
  const [country, setCountry] = useState(profile.country);
  const [hand, setHand] = useState(profile.favoriteHand);
  const [style, setStyle] = useState<PlayStyle | null>(profile.style);
  const [picker, setPicker] = useState<'country' | 'hand' | null>(null);
  const me = useAccount((s) => s.me);
  const [checking, setChecking] = useState(false);
  /** The nickname the server said someone else has. */
  const [takenNick, setTakenNick] = useState<string | null>(null);

  const nick = nickname.trim();
  // An empty nickname is allowed: the player simply stays "You".
  const nickProblem = nick ? (checkNickname(nick) ?? (takenNick === nick ? 'taken' : null)) : null;
  const aboutProblem = checkAbout(about);
  const canSave = !nickProblem && !aboutProblem;

  const save = async () => {
    if (!canSave || checking) return;
    // With an account the nickname must be free; without a connection it is saved and checked on the next sync.
    if (me && nick && nick !== profile.nickname) {
      setChecking(true);
      const answer = await api.checkNickname(nick).catch(() => null);
      setChecking(false);
      if (answer && !answer.available) {
        setTakenNick(nick);
        return;
      }
    }
    profile.saveFields({ nickname: nick || null, about: about.trim(), country, favoriteHand: hand, style });
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const input = { color: colors.text, backgroundColor: colors.surface, fontFamily: fonts.body };

  return (
    <Screen header={<BackButton label={t('profile.title')} fallback="/profile" />} title={t('editProfile.title')}>
      <View style={styles.field}>
        <AppText variant="heading">{t('editProfile.nickname')}</AppText>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('editProfile.nicknamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={NICKNAME_MAX + 4}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('editProfile.nickname')}
          style={[styles.input, input, { borderColor: nickProblem ? colors.danger : colors.border }]}
        />
        <AppText variant="caption" tone={nickProblem ? 'danger' : 'muted'}>
          {nickProblem ? t(`editProfile.nickProblem.${nickProblem}`) : t('editProfile.nicknameHint')}
        </AppText>
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <AppText variant="heading" style={styles.flex}>
            {t('editProfile.about')}
          </AppText>
          <AppText variant="caption" tone={about.trim().length > ABOUT_MAX ? 'danger' : 'muted'} numeric>
            {about.trim().length}/{ABOUT_MAX}
          </AppText>
        </View>
        <TextInput
          value={about}
          onChangeText={setAbout}
          placeholder={t('editProfile.aboutPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={ABOUT_MAX + 20}
          accessibilityLabel={t('editProfile.about')}
          style={[styles.input, styles.multiline, input, { borderColor: aboutProblem ? colors.danger : colors.border }]}
        />
        {aboutProblem ? (
          <AppText variant="caption" tone="danger">
            {t(`editProfile.aboutProblem.${aboutProblem}`)}
          </AppText>
        ) : null}
      </View>

      <Pressable
        onPress={() => setPicker('country')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.pickRow, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface }]}>
        <View style={styles.flex}>
          <AppText variant="heading">{t('editProfile.country')}</AppText>
          <AppText tone="muted">
            {country ? `${flagOf(country)}  ${countryName(country, i18n.language)}` : t('editProfile.notSet')}
          </AppText>
        </View>
        <AppText variant="label" tone="cyan">
          {t('editProfile.change')}
        </AppText>
      </Pressable>

      <Pressable
        onPress={() => setPicker('hand')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.pickRow, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface }]}>
        <View style={styles.flex}>
          <AppText variant="heading">{t('editProfile.hand')}</AppText>
          <AppText tone="muted">{hand ?? t('editProfile.notSet')}</AppText>
        </View>
        {hand ? (
          <View style={styles.cards}>
            {showCards(hand).map((c) => (
              <PlayingCard key={c} card={c} size="sm" />
            ))}
          </View>
        ) : (
          <AppText variant="label" tone="cyan">
            {t('editProfile.change')}
          </AppText>
        )}
      </Pressable>

      <View style={styles.field}>
        <AppText variant="heading">{t('editProfile.style')}</AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {PLAY_STYLES.map((s) => {
            const active = s === style;
            return (
              <Pressable
                key={s}
                onPress={() => setStyle(active ? null : s)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.chip, { borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? withAlpha(colors.cyan, 0.12) : colors.surface }]}>
                <AppText variant="label" strong={active} tone={active ? 'cyan' : 'text'}>
                  {t(`profile.styles.${s}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button label={checking ? t('account.wait') : t('editProfile.save')} onPress={save} disabled={!canSave || checking} />

      <CountryPicker
        visible={picker === 'country'}
        value={country}
        onPick={(code) => {
          setCountry(code);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <HandPicker
        visible={picker === 'hand'}
        value={hand}
        onPick={(h) => {
          setHand(h);
          if (h === null) setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    minHeight: 48,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
