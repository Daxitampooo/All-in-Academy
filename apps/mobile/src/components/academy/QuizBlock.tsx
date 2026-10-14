import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Props = {
  question: string;
  options: string[];
  answer: number;
  explain: string;
  /** Shown above the question, e.g. "Question 2 of 3". */
  label?: string;
  /** Called once, when the player picks an option. */
  onAnswer?: (right: boolean) => void;
};

/** A multiple-choice question: tap an option, see whether it's right and why. */
export function QuizBlock({ question, options, answer, explain, label, onAnswer }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <AppText variant="caption" strong tone="amber">
        {label ?? t('academy.quiz')}
      </AppText>
      <AppText variant="heading">{question}</AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((o, i) => {
          const right = i === answer;
          const chosen = i === picked;
          const color = done && right ? colors.lime : done && chosen ? colors.magenta : colors.border;
          return (
            <Pressable
              key={i}
              disabled={done}
              onPress={() => {
                setPicked(i);
                onAnswer?.(i === answer);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen, disabled: done }}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: color,
                  backgroundColor: done && (right || chosen) ? withAlpha(color, 0.12) : pressed ? colors.surfaceRaised : colors.bg,
                },
              ]}>
              <AppText style={styles.flex}>{o}</AppText>
              {done && right ? <CheckIcon color={colors.lime} /> : done && chosen ? <CloseIcon color={colors.magenta} size={18} /> : null}
            </Pressable>
          );
        })}
      </View>
      {done ? (
        <View style={styles.explain} accessibilityLiveRegion="polite">
          <AppText variant="label" strong tone={picked === answer ? 'lime' : 'magenta'}>
            {picked === answer ? t('academy.right') : t('academy.wrong')}
          </AppText>
          <AppText variant="label">{explain}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  options: {
    gap: space.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 46,
  },
  flex: {
    flex: 1,
  },
  explain: {
    gap: 2,
  },
});
