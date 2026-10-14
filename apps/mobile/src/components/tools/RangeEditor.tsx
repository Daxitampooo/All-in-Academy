import { classWeight, classCombos, comboCount, comboIndex, formatRange, emptyRange, type Range } from '@pokerall/poker-engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RangeMatrix } from '@/components/academy/RangeMatrix';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chips } from '@/components/tools/Chips';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, withAlpha } from '@/theme/tokens';
import { RANGE_PRESETS, readRange } from '@/tools/ranges';

type Props = {
  visible: boolean;
  initial: string;
  onDone: (text: string) => void;
  onClose: () => void;
};

/** Edits a range: type it in notation, tap cells on the 13×13 grid or start from a ready range. */
export function RangeEditor({ visible, initial, onDone, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initial);
  const range = useMemo(() => readRange(text), [text]);
  const shown = useMemo(() => ({ range: range ?? emptyRange() }), [range]);

  const toggle = (cls: string) => {
    const next: Range = range ? Float32Array.from(range) : emptyRange();
    const w = classWeight(next, cls) > 0 ? 0 : 1;
    for (const [a, b] of classCombos(cls)) next[comboIndex(a, b)] = w;
    setText(formatRange(next));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.bg, 0.8) }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + space.lg }]}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppText variant="title">{t('tools.range.title')}</AppText>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('tools.range.placeholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              accessibilityLabel={t('tools.range.title')}
              style={[styles.input, { color: colors.text, backgroundColor: colors.bg, borderColor: range || !text.trim() ? colors.border : colors.danger, fontFamily: fonts.body }]}
            />
            <AppText variant="caption" tone={range || !text.trim() ? 'muted' : 'danger'} numeric>
              {range
                ? t('tools.range.size', { combos: formatNumber(comboCount(range), 0), pct: formatNumber((comboCount(range) / 1326) * 100, 1) })
                : text.trim()
                  ? t('tools.range.bad')
                  : t('tools.range.hint')}
            </AppText>
            <RangeMatrix actions={shown} editing onCell={toggle} emptyLabel={t('tools.range.out')} />
            <Chips
              label={t('tools.range.presets')}
              options={RANGE_PRESETS.map((p) => ({ value: p.id, label: t(`tools.range.preset.${p.id}`) }))}
              value=""
              onChange={(id) => setText(RANGE_PRESETS.find((p) => p.id === id)!.text())}
            />
            <View style={styles.actions}>
              <Button label={t('tools.range.done')} onPress={() => onDone(text)} disabled={!range} />
              <Button label={t('tools.range.clear')} kind="secondary" onPress={() => setText('')} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  content: {
    padding: space.lg,
    gap: space.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  actions: {
    gap: space.sm,
  },
});
