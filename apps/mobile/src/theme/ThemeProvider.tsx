import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';
import { hues, palettes, type HueName, type Palette, type PaletteName } from '@/theme/tokens';

type Theme = {
  name: PaletteName;
  colors: Palette;
  hues: Record<HueName, string>;
  dark: boolean;
};

const ThemeContext = createContext<Theme>({
  name: 'neon',
  colors: palettes.neon,
  hues: hues.neon,
  dark: true,
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  const name: PaletteName =
    preference === 'system' ? (system === 'light' ? 'daylight' : 'neon') : preference;

  return (
    <ThemeContext.Provider value={{ name, colors: palettes[name], hues: hues[name], dark: name === 'neon' }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Draws a part of the screen with another palette, e.g. a dark table inside the light theme. */
export function PaletteOverride({ name, children }: { name: PaletteName; children: ReactNode }) {
  const current = useContext(ThemeContext);
  if (current.name === name) return <>{children}</>;
  return (
    <ThemeContext.Provider value={{ name, colors: palettes[name], hues: hues[name], dark: name === 'neon' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
