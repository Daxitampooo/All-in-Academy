import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, typeScale, type ColorKey } from '@/theme/tokens';

type Variant = keyof typeof typeScale;
type Tone = 'text' | 'muted' | 'cyan' | 'magenta' | 'lime' | 'amber' | 'danger' | 'onAccent';

const toneToColor: Record<Tone, ColorKey> = {
  text: 'text',
  muted: 'textMuted',
  cyan: 'cyan',
  magenta: 'magenta',
  lime: 'lime',
  amber: 'amber',
  danger: 'danger',
  onAccent: 'onAccent',
};

const familyFor: Record<Variant, string> = {
  display: fonts.display,
  title: fonts.display,
  heading: fonts.displayMedium,
  body: fonts.body,
  label: fonts.bodyMedium,
  caption: fonts.body,
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Stronger weight for body-sized text. */
  strong?: boolean;
  /** Equal-width digits for stacks, pots and stats. */
  numeric?: boolean;
};

export function AppText({
  variant = 'body',
  tone = 'text',
  strong = false,
  numeric = false,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const [fontSize, lineHeight] = typeScale[variant];
  const isBodyFamily = variant === 'body' || variant === 'label' || variant === 'caption';
  const base: TextStyle = {
    color: colors[toneToColor[tone]],
    fontFamily: strong && isBodyFamily ? fonts.bodySemiBold : familyFor[variant],
    fontSize,
    lineHeight,
  };

  return (
    <Text
      style={[base, numeric && styles.numeric, variant === 'display' && styles.tight, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  numeric: { fontVariant: ['tabular-nums'] },
  tight: { letterSpacing: -0.6 },
});
