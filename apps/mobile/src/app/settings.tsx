import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { accountLine } from '@/account/status';
import { AppText } from '@/components/AppText';
import { ChevronLeftIcon, CloudIcon } from '@/components/icons';
import { NavRow } from '@/components/NavRow';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { useAccount } from '@/store/account';
import { useSettings, type LanguagePreference, type ThemePreference } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const languageOptions: LanguagePreference[] = ['system', 'en', 'ru'];
const themeOptions: ThemePreference[] = ['neon', 'daylight', 'system'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { language, theme, haptics, setLanguage, setTheme, setHaptics } = useSettings();
  const me = useAccount((s) => s.me);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  return (
    <Screen
      title={t('settings.title')}
      header={
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
          <ChevronLeftIcon color={colors.cyan} />
          <AppText variant="label" tone="cyan">
            {t('settings.back')}
          </AppText>
        </Pressable>
      }>
      <NavRow
        icon={<CloudIcon color={colors.cyan} />}
        title={t('account.title')}
        hint={accountLine(t, me)}
        onPress={() => router.push('/account')}
      />
      <OptionGroup
        title={t('settings.language')}
        options={languageOptions.map((value) => ({ value, label: t(`settings.languages.${value}`) }))}
        selected={language}
        onSelect={setLanguage}
      />
      <OptionGroup
        title={t('settings.theme')}
        options={themeOptions.map((value) => ({ value, label: t(`settings.themes.${value}`) }))}
        selected={theme}
        onSelect={setTheme}
      />
      <OptionGroup
        title={t('settings.haptics')}
        options={[
          { value: 'on', label: t('settings.hapticsOn') },
          { value: 'off', label: t('settings.hapticsOff') },
        ]}
        selected={haptics ? 'on' : 'off'}
        onSelect={(v) => setHaptics(v === 'on')}
      />
      <View style={styles.group}>
        <AppText variant="heading">{t('settings.about')}</AppText>
        <AppText tone="muted">
          {t('settings.version', { version: Constants.expoConfig?.version ?? '—' })}
        </AppText>
        <AppText variant="caption" tone="muted">
          {t('common.noRealMoney')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xxs,
    marginLeft: -space.xs,
  },
  group: {
    gap: space.sm,
  },
});
