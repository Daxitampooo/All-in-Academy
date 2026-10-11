import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { CheckIcon, ChevronLeftIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { useSettings, type LanguagePreference, type ThemePreference } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const languageOptions: LanguagePreference[] = ['system', 'en', 'ru'];
const themeOptions: ThemePreference[] = ['neon', 'daylight', 'system'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { language, theme, setLanguage, setTheme } = useSettings();

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

type OptionGroupProps<T extends string> = {
  title: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
};

function OptionGroup<T extends string>({ title, options, selected, onSelect }: OptionGroupProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={title}>
      <AppText variant="heading">{title}</AppText>
      <View style={[styles.options, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {options.map((option, i) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [
                styles.option,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                pressed && { backgroundColor: colors.surfaceRaised },
              ]}>
              <AppText tone={isSelected ? 'cyan' : 'text'} strong={isSelected} style={styles.optionLabel}>
                {option.label}
              </AppText>
              {isSelected ? <CheckIcon color={colors.cyan} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
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
  options: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space.lg,
  },
  optionLabel: {
    flex: 1,
  },
});
