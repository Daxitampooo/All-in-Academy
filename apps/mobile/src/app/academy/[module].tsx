import { lessonById, moduleById } from '@pokerall/content';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { lessonText, useContentLocale } from '@/academy/locale';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/Badge';
import { CheckIcon, LockIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { useAcademy } from '@/store/academy';
import { usePro } from '@/store/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function ModuleScreen() {
  const { module: id } = useLocalSearchParams<{ module: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useContentLocale();
  const progress = useAcademy((s) => s.lessons);
  const pro = usePro();
  const mod = moduleById(id ?? '');
  const header = <BackButton label={t('academy.title')} fallback="/academy" />;
  if (!mod) {
    return (
      <Screen header={header} title={t('academy.title')}>
        <AppText tone="muted">{t('academy.notFound')}</AppText>
      </Screen>
    );
  }
  return (
    <Screen header={header} title={t(`academy.modules.${mod.id}.title`)} subtitle={t(`academy.modules.${mod.id}.body`)}>
      <Badge label={t(`levels.${mod.level}`)} tone="cyan" />
      {mod.lessons.map((lessonId, i) => {
        const lesson = lessonById(lessonId)!;
        const text = lessonText(lesson, locale);
        const p = progress[lesson.id];
        const locked = !lesson.free && !pro;
        return (
          <Pressable
            key={lesson.id}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, { borderColor: p?.passed ? colors.lime : colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface }]}>
            <View style={[styles.num, { borderColor: p?.passed ? colors.lime : colors.border, backgroundColor: p?.passed ? colors.lime : 'transparent' }]}>
              {p?.passed ? (
                <CheckIcon color={colors.onAccent} size={16} />
              ) : (
                <AppText variant="label" strong numeric tone="muted">
                  {String(i + 1)}
                </AppText>
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="heading">{text.title}</AppText>
              <AppText variant="label" tone="muted">
                {text.summary}
              </AppText>
              <View style={styles.meta}>
                <AppText variant="caption" tone="muted" numeric>
                  {t('academy.minutes', { count: lesson.minutes })}
                </AppText>
                {p ? (
                  <AppText variant="caption" tone={p.passed ? 'lime' : 'amber'} numeric>
                    {t('academy.best', { pct: Math.round(p.best * 100) })}
                  </AppText>
                ) : null}
                {locked ? (
                  <View style={styles.lock}>
                    <LockIcon color={colors.amber} size={12} />
                    <AppText variant="caption" strong tone="amber">
                      {t('academy.pro')}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  num: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xs,
  },
  lock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
