import { parseCards } from '@pokerall/poker-engine';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { CheckIcon, LockIcon } from '@/components/icons';
import { ChipIcon } from '@/components/table/BetChip';
import { PlayingCard } from '@/components/table/PlayingCard';
import { RoomBackdrop } from '@/components/table/RoomBackdrop';
import { TableFelt } from '@/components/table/TableFelt';
import type { LookCategory } from '@/looks/catalog';
import { LookScope, useTableLook } from '@/looks/LookProvider';
import type { TableLook } from '@/looks/resolve';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

const DECK_SAMPLE = parseCards('Ad Kc');

const SWATCH_W = 96;
const SWATCH_H = 68;

/** A small picture of one item, drawn with a look where only that item changed. */
function Swatch({ category }: { category: LookCategory }) {
  const { room } = useTableLook();
  switch (category) {
    case 'felt':
    case 'neon':
      return (
        <View style={styles.felt}>
          <TableFelt width={SWATCH_W} height={SWATCH_H * 1.15} />
        </View>
      );
    case 'room':
      return <RoomBackdrop room={room} />;
    case 'back':
      return <PlayingCard card={null} size="md" />;
    case 'deck':
      return (
        <View style={styles.pair}>
          {DECK_SAMPLE.map((c) => (
            <PlayingCard key={c} card={c} size="sm" />
          ))}
        </View>
      );
    case 'chips':
      return (
        <View style={styles.pair}>
          <ChipIcon size={30} />
          <ChipIcon size={30} />
        </View>
      );
  }
}

type Props = {
  category: LookCategory;
  name: string;
  look: TableLook;
  /** Shown under the name: why it's locked, or that it's worn. */
  status: string | null;
  locked: boolean;
  pro: boolean;
  worn: boolean;
  /** Being shown in the preview right now. */
  previewing: boolean;
  onPress: () => void;
};

export function LookTile({ category, name, look, status, locked, pro, worn, previewing, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const accent = previewing ? colors.cyan : worn ? withAlpha(colors.cyan, 0.5) : colors.border;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, status].filter(Boolean).join('. ')}
      accessibilityState={{ selected: worn }}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: accent,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          boxShadow: previewing && colors.glow > 0 ? `0 0 12px ${withAlpha(colors.cyan, 0.45)}` : undefined,
        },
      ]}>
      <View style={[styles.swatch, { backgroundColor: colors.bg }]}>
        <LookScope look={look}>
          <View style={[styles.swatchInner, locked && styles.lockedArt]}>
            <Swatch category={category} />
          </View>
        </LookScope>
        {worn ? (
          <View style={[styles.corner, { backgroundColor: colors.cyan }]}>
            <CheckIcon color={colors.onAccent} size={12} />
          </View>
        ) : locked ? (
          <View style={[styles.corner, { backgroundColor: pro ? colors.amber : colors.surfaceRaised }]}>
            {pro ? (
              <AppText variant="caption" strong style={{ color: colors.onAccent, fontSize: 9, lineHeight: 11 }}>
                {t('looks.proBadge')}
              </AppText>
            ) : (
              <LockIcon color={colors.textMuted} size={11} />
            )}
          </View>
        ) : null}
      </View>
      <AppText variant="caption" strong numberOfLines={2}>
        {name}
      </AppText>
      {status ? (
        <AppText variant="caption" tone={worn ? 'cyan' : 'muted'} numberOfLines={3} style={styles.status}>
          {status}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.xs,
    gap: space.xxs,
  },
  swatch: {
    height: SWATCH_H,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: space.xxs,
  },
  swatchInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedArt: {
    opacity: 0.6,
  },
  felt: {
    width: SWATCH_W,
    height: SWATCH_H * 1.15,
    marginTop: -SWATCH_H * 0.06,
  },
  pair: {
    flexDirection: 'row',
    gap: 3,
  },
  corner: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 20,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontSize: 11,
    lineHeight: 14,
  },
});
