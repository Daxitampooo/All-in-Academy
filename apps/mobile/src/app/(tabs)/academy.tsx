import { LEVELS, MODULES, allLessons, lessonById, type ModuleId } from '@pokerall/content';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { lessonText, useContentLocale } from '@/academy/locale';
import { AppText } from '@/components/AppText';
import { Badge, type BadgeTone } from '@/components/Badge';
import { BookIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { useAcademy } from '@/store/academy';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha, type ColorKey } from '@/theme/tokens';

const LEVEL_TONE: Record<string, BadgeTone> = { beginner: 'lime', intermediate: 'cyan', advanced: 'magenta' };
const LEVEL_COLOR: Record<string, ColorKey> = { beginner: 'lime', intermediate: 'cyan', advanced: 'magenta' };

export default function AcademyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useContentLocale();
  const progress = useAcademy((s) => s.lessons);
  const lessons = allLessons();
  const passed = lessons.filter((l) => progress[l.id]?.passed).length;
  const next = lessons.find((l) => !progress[l.id]?.passed);

  const moduleProgress = (id: ModuleId) => {
    const m = MODULES.find((x) => x.id === id)!;
    return { done: m.lessons.filter((l) => progress[l]?.passed).length, total: m.lessons.length };
  };

  return (
    <Screen title={t('academy.title')} subtitle={t('academy.subtitle')}>
      <View style={[styles.overall, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText variant="label" tone="muted" numeric>
          {t('academy.overall', { done: passed, total: lessons.length })}
        </AppText>
        <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.fill, { width: `${(passed / lessons.length) * 100}%`, backgroundColor: colors.lime }]} />
        </View>
        {next ? (
          <Pressable
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: next.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.next, { borderColor: colors.cyan, backgroundColor: pressed ? withAlpha(colors.cyan, 0.15) : withAlpha(colors.cyan, 0.06) }]}>
            <AppText variant="caption" tone="cyan">
              {passed === 0 ? t('academy.start') : t('academy.continue')}
            </AppText>
            <AppText variant="heading">{lessonText(next, locale).title}</AppText>
          </Pressable>
        ) : (
          <AppText variant="label" tone="lime">
            {t('academy.allDone')}
          </AppText>
        )}
      </View>

      {LEVELS.map((level) => (
        <View key={level.id} style={styles.level}>
          <View style={styles.levelHead}>
            <AppText variant="title">{t(`levels.${level.id}`)}</AppText>
            <Badge label={t(`academy.levelHint.${level.id}`)} tone={LEVEL_TONE[level.id]} />
          </View>
          {level.modules.map((id) => {
            const { done, total } = moduleProgress(id);
            const ready = total > 0;
            const accent = colors[LEVEL_COLOR[level.id]!];
            const moduleLessons = MODULES.find((m) => m.id === id)!.lessons.map((l) => lessonById(l)!);
            const anyPro = ready && moduleLessons.some((l) => !l.free);
            const allPro = ready && moduleLessons.every((l) => !l.free);
            return (
              <Pressable
                key={id}
                disabled={!ready}
                onPress={() => router.push({ pathname: '/academy/[module]', params: { module: id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.module, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface, opacity: ready ? 1 : 0.6 }]}>
                <View style={[styles.strip, { backgroundColor: accent }]} />
                <View style={styles.moduleBody}>
                  <AppText variant="heading">{t(`academy.modules.${id}.title`)}</AppText>
                  <AppText tone="muted">{t(`academy.modules.${id}.body`)}</AppText>
                  <View style={styles.badges}>
                    {ready ? (
                      <Badge label={t('academy.lessonsDone', { done, total })} tone={done === total ? 'lime' : 'muted'} />
                    ) : (
                      <Badge label={t('common.soon')} />
                    )}
                    {anyPro ? <Badge label={t(allPro ? 'academy.allPro' : 'academy.partPro')} tone="amber" /> : null}
                  </View>
                  {ready ? (
                    <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
                      <View style={[styles.fill, { width: `${(done / total) * 100}%`, backgroundColor: accent }]} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable
        onPress={() => router.push('/glossary')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.module, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface }]}>
        <View style={[styles.strip, { backgroundColor: colors.amber }]} />
        <View style={[styles.moduleBody, styles.row]}>
          <BookIcon color={colors.amber} />
          <View style={styles.flex}>
            <AppText variant="heading">{t('academy.glossary.title')}</AppText>
            <AppText tone="muted">{t('academy.glossary.body')}</AppText>
          </View>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  overall: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  next: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
    marginTop: space.xs,
  },
  level: {
    gap: space.sm,
  },
  levelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  module: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
  },
  moduleBody: {
    flex: 1,
    padding: space.lg,
    gap: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
});
