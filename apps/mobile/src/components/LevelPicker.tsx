import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PLAYER_LEVELS, useSettings, type PlayerLevel } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, radius, space, withAlpha, type ColorKey } from '@/theme/tokens';

/** Where each level starts: the Academy from scratch, a bot table, or the trainers. */
// Group paths: "/academy" alone also matches the academy/[module] screens' folder and doesn't open the tab.
export const START_SCREEN: Record<PlayerLevel, Href> = {
  beginner: '/(tabs)/academy',
  casual: '/(tabs)',
  regular: '/(tabs)/train',
  pro: '/(tabs)',
};

const ACCENT: Record<PlayerLevel, ColorKey> = { beginner: 'lime', casual: 'cyan', regular: 'amber', pro: 'magenta' };

/**
 * The second question of the first launch: how much the player already knows. It picks the start screen and
 * whether hints and the coach are on; all of it can be changed in the settings.
 */
export function LevelPicker() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const setLevel = useSettings((s) => s.setLevel);

  const pick = (level: PlayerLevel) => {
    setLevel(level, true);
    // After this overlay is gone and the tabs are interactive again.
    setTimeout(() => router.navigate(START_SCREEN[level]), 0);
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} accessibilityViewIsModal>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.column}>
          <AppText variant="title" accessibilityRole="header">
            {t('levelPicker.title')}
          </AppText>
          <AppText tone="muted">{t('levelPicker.body')}</AppText>
          {PLAYER_LEVELS.map((level) => {
            const accent = colors[ACCENT[level]];
            return (
              <Pressable
                key={level}
                onPress={() => pick(level)}
                accessibilityRole="button"
                accessibilityLabel={t(`levelPicker.levels.${level}.title`)}
                accessibilityHint={t(`levelPicker.levels.${level}.body`)}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: withAlpha(accent, 0.6), backgroundColor: pressed ? withAlpha(accent, 0.12) : colors.surface },
                ]}>
                <View style={[styles.strip, { backgroundColor: accent }]} />
                <View style={styles.texts}>
                  <AppText variant="heading">{t(`levelPicker.levels.${level}.title`)}</AppText>
                  <AppText tone="muted">{t(`levelPicker.levels.${level}.body`)}</AppText>
                </View>
              </Pressable>
            );
          })}
          <AppText variant="caption" tone="muted">
            {t('levelPicker.later')}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    width: '100%',
    maxWidth: maxContentWidth,
    gap: space.md,
  },
  option: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    minHeight: 72,
  },
  strip: {
    width: 4,
  },
  texts: {
    flex: 1,
    padding: space.md,
    gap: space.xxs,
  },
});
