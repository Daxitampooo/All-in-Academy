import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, radius, space, withAlpha } from '@/theme/tokens';

/**
 * The first screen of a fresh install: PokerALL is for adults (18+), and it says plainly that there is no real
 * money. Nothing else opens until the player answers.
 */
export function AgeGate() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const confirmAge = useSettings((s) => s.confirmAge);
  const [underage, setUnderage] = useState(false);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} accessibilityViewIsModal>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.column}>
          <AppText
            variant="display"
            tone="cyan"
            style={[styles.brand, colors.glow > 0 && { textShadowColor: withAlpha(colors.cyan, 0.6), textShadowRadius: 18 }]}>
            {t('play.title')}
          </AppText>

          {underage ? (
            <View style={styles.block}>
              <AppText variant="title" accessibilityRole="header">
                {t('ageGate.underageTitle')}
              </AppText>
              <AppText tone="muted">{t('ageGate.underageBody')}</AppText>
              <Button label={t('ageGate.back')} kind="secondary" onPress={() => setUnderage(false)} />
            </View>
          ) : (
            <View style={styles.block}>
              <AppText variant="title" accessibilityRole="header">
                {t('ageGate.title')}
              </AppText>
              <AppText tone="muted">{t('ageGate.body')}</AppText>
              <View style={[styles.money, { borderColor: withAlpha(colors.lime, 0.6), backgroundColor: withAlpha(colors.lime, 0.08) }]}>
                <AppText strong>{t('common.noRealMoney')}</AppText>
              </View>
              <View style={styles.buttons}>
                <Button label={t('ageGate.yes')} onPress={confirmAge} />
                <Button label={t('ageGate.no')} kind="secondary" onPress={() => setUnderage(true)} />
              </View>
            </View>
          )}
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
    gap: space.xl,
  },
  brand: {
    textAlign: 'center',
  },
  block: {
    gap: space.md,
  },
  money: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  buttons: {
    gap: space.sm,
    marginTop: space.sm,
  },
});
