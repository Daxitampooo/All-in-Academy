import { parseCards } from '@pokerall/poker-engine';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BetChip } from '@/components/table/BetChip';
import { PlayingCard } from '@/components/table/PlayingCard';
import { RoomBackdrop } from '@/components/table/RoomBackdrop';
import { TableFelt } from '@/components/table/TableFelt';
import { formatChips } from '@/lib/format';
import { LookScope, useTableLook } from '@/looks/LookProvider';
import type { TableLook } from '@/looks/resolve';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** One card of each suit, so the four-color deck shows. */
const BOARD = parseCards('As Kh Qd Jc');

/** A small table in the given look: room, felt, board, a face-down hand and chips. */
export function LookPreview({ look, potLabel }: { look: TableLook; potLabel: (amount: string) => string }) {
  return (
    <LookScope look={look}>
      <PreviewBody potLabel={potLabel} />
    </LookScope>
  );
}

function PreviewBody({ potLabel }: { potLabel: (amount: string) => string }) {
  const { colors } = useTheme();
  const { room } = useTableLook();
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={[styles.box, { borderColor: colors.border, backgroundColor: colors.bg }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <RoomBackdrop room={room} />
      <TableFelt width={size.w} height={size.h} />
      <View style={styles.center}>
        <AppText variant="caption" strong tone="amber" numeric>
          {potLabel(formatChips(1250))}
        </AppText>
        <View style={styles.row}>
          {BOARD.map((c) => (
            <PlayingCard key={c} card={c} size="md" />
          ))}
        </View>
        <View style={styles.hand}>
          <PlayingCard card={null} size="sm" />
          <PlayingCard card={null} size="sm" />
          <BetChip amount={400} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 230,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    gap: space.xs,
  },
  hand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
