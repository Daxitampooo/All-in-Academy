import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { beatenById, useBotProgress } from '@/store/botProgress';
import { useLook } from '@/store/look';
import { usePro } from '@/store/pro';
import { PaletteOverride, useTheme } from '@/theme/ThemeProvider';

import { effectiveSelection, resolveLook, type TableLook } from './resolve';

const LookContext = createContext<TableLook | null>(null);

/** The player's own look, with locked choices replaced by defaults. */
export function usePersonalLook(): TableLook {
  const { name } = useTheme();
  const selected = useLook((s) => s.selected);
  const fourColor = useLook((s) => s.fourColor);
  const records = useBotProgress((s) => s.records);
  const pro = usePro();
  return useMemo(
    () => resolveLook(effectiveSelection(selected, beatenById(records), pro), fourColor, name),
    [fourColor, name, pro, records, selected],
  );
}

/** The look cards, chips and the table are drawn with here: a provided one, or the player's own. */
export function useTableLook(): TableLook {
  const provided = useContext(LookContext);
  const personal = usePersonalLook();
  return provided ?? personal;
}

/**
 * Draws its children with a given look (a preview, or the official style of ranked play) and the
 * palette that look needs.
 */
export function LookScope({ look, children }: { look: TableLook; children: ReactNode }) {
  return (
    <LookContext.Provider value={look}>
      <PaletteOverride name={look.paletteName}>{children}</PaletteOverride>
    </LookContext.Provider>
  );
}
