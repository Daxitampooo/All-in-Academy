import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { COUNTRIES, flagOf } from '@/profile/countries';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, withAlpha } from '@/theme/tokens';

/** A searchable list of countries; picking one closes it. */
export function CountryPicker({ visible, value, onPick, onClose }: { visible: boolean; value: string | null; onPick: (code: string | null) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const ru = i18n.language.startsWith('ru');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const named = COUNTRIES.map(([code, en, rus]) => ({ code, name: ru ? rus : en, other: ru ? en : rus }));
    named.sort((a, b) => a.name.localeCompare(b.name, ru ? 'ru' : 'en'));
    if (!q) return named;
    return named.filter((c) => c.name.toLowerCase().includes(q) || c.other.toLowerCase().includes(q) || c.code.toLowerCase() === q);
  }, [query, ru]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + space.md }]}>
        <View style={styles.header}>
          <AppText variant="title" style={styles.title}>
            {t('editProfile.countryTitle')}
          </AppText>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('editProfile.close')} hitSlop={12}>
            <CloseIcon color={colors.text} />
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('editProfile.countrySearch')}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          style={[styles.search, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontFamily: fonts.body }]}
          accessibilityLabel={t('editProfile.countrySearch')}
        />
        <FlatList
          data={[{ code: '', name: t('editProfile.noCountry'), other: '' }, ...list]}
          keyExtractor={(c) => c.code || 'none'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
          renderItem={({ item }) => {
            const selected = (item.code || null) === value;
            return (
              <Pressable
                onPress={() => onPick(item.code || null)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceRaised }, selected && { backgroundColor: withAlpha(colors.cyan, 0.08) }]}>
                <AppText style={styles.flag}>{item.code ? flagOf(item.code) : ''}</AppText>
                <AppText tone={selected ? 'cyan' : 'text'} strong={selected} style={styles.name}>
                  {item.name}
                </AppText>
                {selected ? <CheckIcon color={colors.cyan} /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.xs,
  },
  flag: {
    width: 28,
    fontSize: 20,
    lineHeight: 26,
  },
  name: {
    flex: 1,
  },
});
