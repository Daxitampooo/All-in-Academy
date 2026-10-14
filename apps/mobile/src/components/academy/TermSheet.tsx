import { glossary, lessonById, type Locale } from '@pokerall/content';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lessonText } from '@/academy/locale';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, radius, space, withAlpha } from '@/theme/tokens';

type Props = {
  /** Glossary id of the tapped term; null hides the sheet. */
  term: string | null;
  locale: Locale;
  /** The lesson being read: its own link isn't offered. */
  lessonId?: string;
  onClose: () => void;
};

/** A glossary entry over the lesson, opened by tapping a term in the text. */
export function TermSheet({ term, locale, lessonId, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entry = term ? glossary(locale).find((g) => g.id === term) : undefined;
  const otherTerm = term ? glossary(locale === 'ru' ? 'en' : 'ru').find((g) => g.id === term)?.term : undefined;
  const lesson = entry?.lesson && entry.lesson !== lessonId ? lessonById(entry.lesson) : undefined;

  const go = (to: () => void) => {
    onClose();
    to();
  };

  return (
    <Modal visible={!!entry} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.bg, 0.7) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('academy.term.close')} />
        {entry ? (
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: withAlpha(colors.cyan, 0.5),
                paddingBottom: insets.bottom + space.lg,
                boxShadow: colors.glow > 0 ? `0 -6px 24px ${withAlpha(colors.cyan, 0.18)}` : undefined,
              },
            ]}>
            <View style={[styles.grip, { backgroundColor: colors.border }]} />
            <View style={styles.head}>
              <AppText variant="title" accessibilityRole="header" style={styles.flex}>
                {entry.term}
              </AppText>
              {otherTerm ? (
                <AppText variant="label" tone="muted">
                  {otherTerm}
                </AppText>
              ) : null}
            </View>
            <AppText>{entry.definition}</AppText>
            {lesson ? (
              <Button
                label={t('academy.glossary.lesson', { title: lessonText(lesson, locale).title })}
                kind="secondary"
                onPress={() => go(() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } }))}
              />
            ) : null}
            <View style={styles.row}>
              <Pressable onPress={() => go(() => router.push('/glossary'))} accessibilityRole="link" hitSlop={8} style={styles.flex}>
                <AppText variant="label" strong tone="cyan">
                  {t('academy.term.all')}
                </AppText>
              </Pressable>
              <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
                <AppText variant="label" strong>
                  {t('academy.term.close')}
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: maxContentWidth,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: space.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xs,
  },
  flex: {
    flex: 1,
  },
});
