import { termSegments } from '@pokerall/content';
import { Text, View, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

type OnTerm = ((id: string) => void) | undefined;

/** Text with "[[id|word]]" glossary marks: a marked word opens its glossary entry. */
function Terms({ text, onTerm }: { text: string; onTerm: OnTerm }) {
  const { colors } = useTheme();
  return (
    <>
      {termSegments(text).map((seg, i) =>
        seg.term && onTerm ? (
          <Text
            key={i}
            onPress={() => onTerm(seg.term!)}
            accessibilityRole="link"
            suppressHighlighting={false}
            style={[styles.term, { color: colors.cyan, textDecorationColor: colors.cyan }]}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </>
  );
}

/** "**bold**" inside a line becomes bold. */
function Inline({ text, onTerm }: { text: string; onTerm: OnTerm }) {
  const { colors } = useTheme();
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={i} style={{ fontFamily: fonts.bodySemiBold, color: colors.text }}>
            <Terms text={part.slice(2, -2)} onTerm={onTerm} />
          </Text>
        ) : (
          <Terms key={i} text={part} onTerm={onTerm} />
        ),
      )}
    </>
  );
}

/**
 * Lesson text: paragraphs separated by blank lines, "- " bullets, **bold**, and glossary terms marked as
 * "[[id|word]]" that call `onTerm` when tapped.
 */
export function RichText({ text, onTerm }: { text: string; onTerm?: (id: string) => void }) {
  const { colors } = useTheme();
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <View style={styles.wrap}>
      {paragraphs.map((p, i) => {
        const lines = p.split('\n');
        if (lines.every((l) => l.startsWith('- ') || !l.trim())) {
          return (
            <View key={i} style={styles.list}>
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <View key={j} style={styles.bullet}>
                    <View style={[styles.dot, { backgroundColor: colors.cyan }]} />
                    <AppText style={styles.flex}>
                      <Inline text={l.slice(2)} onTerm={onTerm} />
                    </AppText>
                  </View>
                ))}
            </View>
          );
        }
        // A paragraph that starts with text and then lists items.
        const first = lines.findIndex((l) => l.startsWith('- '));
        if (first > 0) {
          return (
            <View key={i} style={styles.list}>
              <AppText>
                <Inline text={lines.slice(0, first).join('\n')} onTerm={onTerm} />
              </AppText>
              {lines.slice(first).filter((l) => l.trim()).map((l, j) => (
                <View key={j} style={styles.bullet}>
                  <View style={[styles.dot, { backgroundColor: colors.cyan }]} />
                  <AppText style={styles.flex}>
                    <Inline text={l.replace(/^- /, '')} onTerm={onTerm} />
                  </AppText>
                </View>
              ))}
            </View>
          );
        }
        return (
          <AppText key={i}>
            <Inline text={p} onTerm={onTerm} />
          </AppText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md,
  },
  list: {
    gap: space.xs,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  flex: {
    flex: 1,
  },
  term: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
});
