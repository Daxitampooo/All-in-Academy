import { classWeight, gridClass, rangeShare, type Range } from '@pokerall/poker-engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha, type ColorKey } from '@/theme/tokens';

const INDEX = Array.from({ length: 13 }, (_, i) => i);

/** Colors of actions in every range; anything not in an action is a fold. */
export const ACTION_COLOR: Record<string, ColorKey> = {
  raise: 'magenta',
  '3bet': 'magenta',
  allin: 'amber',
  call: 'cyan',
  limp: 'lime',
};

type Props = {
  /** Range per action, e.g. { raise, call }. */
  actions: Record<string, Range>;
  caption?: string;
  /** A hand class to outline, e.g. the trainer's hand. */
  mark?: string;
  /** Called with the class of a tapped cell. */
  onCell?: (cls: string) => void;
};

/** The 13×13 grid: pairs on the diagonal, suited above, offsuit below. Mixed hands show split cells. */
export function RangeMatrix({ actions, caption, mark, onCell }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const names = useMemo(() => Object.keys(actions), [actions]);
  const grid = useMemo(
    () =>
      INDEX.map((row) =>
        INDEX.map((col) => {
          const cls = gridClass(row, col);
          return { cls, weights: names.map((n) => classWeight(actions[n]!, cls)) };
        }),
      ),
    [actions, names],
  );
  const cell = width > 0 ? (width - 12) / 13 : 0;
  const info = picked ? grid.flat().find((c) => c.cls === picked) : null;

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.grid} accessibilityLabel={caption}>
        {cell > 0
          ? grid.map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map(({ cls, weights }) => {
                  const outlined = cls === mark || cls === picked;
                  return (
                    <Pressable
                      key={cls}
                      onPress={() => {
                        setPicked(cls === picked ? null : cls);
                        onCell?.(cls);
                      }}
                      accessibilityLabel={cls}
                      style={[
                        styles.cell,
                        {
                          width: cell,
                          height: cell,
                          backgroundColor: colors.surfaceRaised,
                          borderColor: outlined ? colors.text : 'transparent',
                        },
                      ]}>
                      <View style={styles.fill}>
                        {weights.map((w, i) =>
                          w > 0 ? <View key={i} style={{ flex: w, backgroundColor: colors[ACTION_COLOR[names[i]!] ?? 'cyan'] }} /> : null,
                        )}
                        {weights.reduce((a, b) => a + b, 0) < 0.999 ? (
                          <View style={{ flex: Math.max(0, 1 - weights.reduce((a, b) => a + b, 0)) }} />
                        ) : null}
                      </View>
                      <AppText
                        style={[
                          styles.label,
                          { fontSize: Math.max(7, cell * 0.27), lineHeight: cell * 0.4, color: weights.some((w) => w > 0) ? colors.onAccent : colors.textMuted },
                        ]}
                        numberOfLines={1}>
                        {cls}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))
          : null}
      </View>
      <View style={styles.legend}>
        {names.map((n) => (
          <View key={n} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors[ACTION_COLOR[n] ?? 'cyan'] }]} />
            <AppText variant="caption" numeric>
              {t('academy.range.share', { action: t(`academy.actions.${n}`), pct: formatNumber(rangeShare(actions[n]!) * 100, 1) })}
            </AppText>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }]} />
          <AppText variant="caption">{t('academy.actions.fold')}</AppText>
        </View>
      </View>
      {info ? (
        <View style={[styles.info, { backgroundColor: withAlpha(colors.cyan, 0.08), borderColor: withAlpha(colors.cyan, 0.4) }]}>
          <AppText variant="label" strong>
            {info.cls}
          </AppText>
          <AppText variant="caption" numeric>
            {info.weights.some((w) => w > 0)
              ? names
                  .map((n, i) => (info.weights[i]! > 0 ? t('academy.range.cell', { action: t(`academy.actions.${n}`), pct: Math.round(info.weights[i]! * 100) }) : null))
                  .filter(Boolean)
                  .join(' · ')
              : t('academy.actions.fold')}
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" tone="muted">
          {t('academy.range.tapHint')}
        </AppText>
      )}
      {caption ? (
        <AppText variant="caption" tone="muted">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.sm,
    gap: space.sm,
  },
  grid: {
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 1,
  },
  cell: {
    borderRadius: 2,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  label: {
    letterSpacing: -0.4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  info: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.sm,
    gap: 2,
  },
});
