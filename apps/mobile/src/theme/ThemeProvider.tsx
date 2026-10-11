import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';
import { palettes, type Palette, type PaletteName } from '@/theme/tokens';

type Theme = {
  name: PaletteName;
  colors: Palette;
  dark: boolean;
};

const ThemeContext = createContext<Theme>({
  name: 'neon',
  colors: palettes.neon,
  dark: true,
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  const name: PaletteName =
    preference === 'system' ? (system === 'light' ? 'daylight' : 'neon') : preference;

  return (
    <ThemeContext.Provider value={{ name, colors: palettes[name], dark: name === 'neon' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
