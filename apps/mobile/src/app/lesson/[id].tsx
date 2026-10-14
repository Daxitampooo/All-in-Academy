import { lessonById, linkTerms, nextLesson } from '@pokerall/content';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { lessonText, useContentLocale } from '@/academy/locale';
import { LessonBlock } from '@/components/academy/LessonBlock';
import { LessonTest } from '@/components/academy/LessonTest';
import { TermSheet } from '@/components/academy/TermSheet';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/Badge';
import { LockIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { useAcademy } from '@/store/academy';
import { usePro } from '@/store/pro';
import { useSettings } from '@/store/settings';
import { useStreak } from '@/store/streak';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useContentLocale();
  const pro = usePro();
  const recordTest = useAcademy((s) => s.recordTest);
  const progress = useAcademy((s) => (id ? s.lessons[id] : undefined));
  const lesson = lessonById(id ?? '');
  const termsOn = useSettings((s) => s.lessonTerms);
  const [term, setTerm] = useState<string | null>(null);

  if (!lesson) {
    return (
      <Screen header={<BackButton label={t('academy.title')} fallback="/academy" />} title={t('academy.title')}>
        <AppText tone="muted">{t('academy.notFound')}</AppText>
      </Screen>
    );
  }

  const text = lessonText(lesson, locale);
  const next = nextLesson(lesson.id);
  const locked = !lesson.free && !pro;
  // The first use of each glossary term in the lesson's text becomes a link to its definition.
  const textBlocks = lesson.blocks.filter((b) => b.type === 'text');
  const linked = termsOn ? linkTerms(textBlocks.map((b) => text.blocks[b.id]?.text ?? ''), locale) : [];
  const blockText = (blockId: string) => {
    const i = textBlocks.findIndex((b) => b.id === blockId);
    const own = text.blocks[blockId] ?? {};
    return i >= 0 && termsOn ? { ...own, text: linked[i] } : own;
  };
  const onTerm = termsOn ? setTerm : undefined;
  const header = <BackButton label={t(`academy.modules.${lesson.module}.title`)} fallback={`/academy/${lesson.module}`} />;

  return (
    <Screen header={header} title={text.title} subtitle={text.summary}>
      <View style={styles.badges}>
        <Badge label={t(`levels.${lesson.level}`)} tone="cyan" />
        <Badge label={t('academy.minutes', { count: lesson.minutes })} />
        {progress?.passed ? <Badge label={t('academy.passedBadge')} tone="lime" /> : null}
        {!lesson.free ? <Badge label={t('academy.pro')} tone="amber" /> : null}
      </View>

      {locked ? (
        <>
          {lesson.blocks[0] ? <LessonBlock block={lesson.blocks[0]} text={blockText(lesson.blocks[0].id)} onTerm={onTerm} /> : null}
          <View style={[styles.locked, { borderColor: withAlpha(colors.amber, 0.5), backgroundColor: withAlpha(colors.amber, 0.08) }]}>
            <LockIcon color={colors.amber} size={20} />
            <AppText variant="heading" tone="amber">
              {t('academy.proLesson')}
            </AppText>
            <AppText tone="muted">{t('academy.proLessonBody')}</AppText>
          </View>
        </>
      ) : (
        <>
          {lesson.blocks.map((block) => (
            <LessonBlock key={block.id} block={block} text={blockText(block.id)} onTerm={onTerm} />
          ))}
          <View style={styles.testHead}>
            <AppText variant="title">{t('academy.test.title')}</AppText>
            <AppText variant="label" tone="muted">
              {t('academy.test.intro', { count: lesson.test.length, pct: Math.round(lesson.pass * 100) })}
            </AppText>
          </View>
          <LessonTest
            lesson={lesson}
            text={text}
            onFinish={(score, passed) => {
              recordTest(lesson.id, score, passed);
              useStreak.getState().addLessonTest();
            }}
            nextTitle={next ? lessonText(next, locale).title : null}
            onNext={() => next && router.replace({ pathname: '/lesson/[id]', params: { id: next.id } })}
          />
        </>
      )}
      <TermSheet term={term} locale={locale} lessonId={lesson.id} onClose={() => setTerm(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: -space.sm,
  },
  locked: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  testHead: {
    gap: space.xs,
    marginTop: space.md,
  },
});
