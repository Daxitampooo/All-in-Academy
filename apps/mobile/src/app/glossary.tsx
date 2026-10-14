import { glossary, lessonById } from '@pokerall/content';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lessonText, useContentLocale } from '@/academy/locale';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, maxContentWidth, radius, space } from '@/theme/tokens';

export default function GlossaryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const locale = useContentLocale();
  const other = locale === 'ru' ? 'en' : 'ru';
  const [query, setQuery] = useState('');

  const terms = useMemo(() => {
    const otherTerms = new Map(glossary(other).map((g) => [g.id, g.term]));
    return glossary(locale).map((g) => ({ ...g, otherTerm: otherTerms.get(g.id) ?? '' }));
  }, [locale, other]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter((g) => g.term.toLowerCase().includes(q) || g.otherTerm.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q));
  }, [query, terms]);

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl }]}
      keyboardShouldPersistTaps="handled"
      data={shown}
      keyExtractor={(g) => g.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <BackButton label={t('academy.title')} fallback="/academy" />
          <AppText variant="display" accessibilityRole="header">
            {t('academy.glossary.title')}
          </AppText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('academy.glossary.search')}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            accessibilityLabel={t('academy.glossary.search')}
            style={[styles.search, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontFamily: fonts.body }]}
          />
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      ListEmptyComponent={
        <AppText tone="muted" style={styles.column}>
          {t('academy.glossary.nothing')}
        </AppText>
      }
      renderItem={({ item }) => {
        const lesson = item.lesson ? lessonById(item.lesson) : undefined;
        return (
          <View style={[styles.column, styles.term, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.termHead}>
              <AppText variant="heading" style={styles.flex}>
                {item.term}
              </AppText>
              <AppText variant="caption" tone="muted">
                {item.otherTerm}
              </AppText>
            </View>
            <AppText variant="label">{item.definition}</AppText>
            {lesson ? (
              <Pressable onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })} accessibilityRole="link" hitSlop={8}>
                <AppText variant="caption" strong tone="cyan">
                  {t('academy.glossary.lesson', { title: lessonText(lesson, locale).title })}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
  },
  header: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    gap: space.md,
    marginBottom: space.md,
  },
  column: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    minHeight: 48,
  },
  term: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  termHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
