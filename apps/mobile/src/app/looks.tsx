import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { LockIcon } from '@/components/icons';
import { LookPreview } from '@/components/looks/LookPreview';
import { LookTile } from '@/components/looks/LookTile';
import { Screen } from '@/components/Screen';
import { ToggleRow } from '@/components/ToggleRow';
import { CATALOG, LOOK_CATEGORIES, type LookCategory, type LookItem, type Unlock } from '@/looks/catalog';
import { effectiveSelection, isUnlocked, officialLook, resolveLook, type LookSelection } from '@/looks/resolve';
import { useUnlockProgress } from '@/looks/useUnlockProgress';
import { unlockText as describeUnlock } from '@/profile/unlockText';
import { useLook } from '@/store/look';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Tried = { category: LookCategory; id: string };

export default function LooksScreen() {
  const { t } = useTranslation();
  const { colors, name: paletteName } = useTheme();
  const { selected, fourColor, choose, setFourColor } = useLook();
  const progress = useUnlockProgress();
  const [category, setCategory] = useState<LookCategory>('felt');
  const [tried, setTried] = useState<Tried | null>(null);
  const [official, setOfficial] = useState(false);

  const worn = useMemo(() => effectiveSelection(selected, progress), [progress, selected]);
  const lookFor = (selection: LookSelection) => resolveLook(selection, fourColor, paletteName);
  const shown = tried ? { ...worn, [tried.category]: tried.id } : worn;
  const previewLook = official ? officialLook(fourColor) : lookFor(shown);

  const unlockText = (unlock: Unlock) => describeUnlock(unlock, t);

  const itemName = (item: LookItem) => t(`looks.items.${item.category}.${item.id}`);
  const triedItem = tried ? CATALOG[tried.category].find((i) => i.id === tried.id) : undefined;
  const triedLocked = !!triedItem && !isUnlocked(triedItem.unlock, progress);

  const press = (item: LookItem) => {
    setOfficial(false);
    if (isUnlocked(item.unlock, progress)) {
      choose(item.category, item.id);
      setTried(null);
    } else {
      setTried({ category: item.category, id: item.id });
    }
  };

  let note: { text: string; locked: boolean };
  if (official) note = { text: t('looks.officialHint'), locked: false };
  else if (triedItem && triedLocked) note = { text: t('looks.trying', { name: itemName(triedItem), how: unlockText(triedItem.unlock) }), locked: true };
  else note = { text: t('looks.onlyYou'), locked: false };

  return (
    <Screen header={<BackButton label={t('profile.title')} fallback="/profile" />} title={t('looks.title')}>
      <LookPreview look={previewLook} potLabel={(amount) => t('table.pot', { amount })} />
      <View
        style={[
          styles.note,
          {
            borderColor: note.locked ? withAlpha(colors.amber, 0.5) : colors.border,
            backgroundColor: note.locked ? withAlpha(colors.amber, 0.08) : colors.surface,
          },
        ]}
        accessibilityLiveRegion="polite">
        {note.locked ? <LockIcon color={colors.amber} size={14} /> : null}
        <AppText variant="caption" tone={note.locked ? 'amber' : 'muted'} style={styles.noteText}>
          {note.text}
        </AppText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
        {LOOK_CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.tab,
                {
                  borderColor: active ? colors.cyan : colors.border,
                  backgroundColor: active ? withAlpha(colors.cyan, 0.12) : colors.surface,
                },
              ]}>
              <AppText variant="label" strong tone={active ? 'cyan' : 'text'}>
                {t(`looks.categories.${c}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.grid}>
        {CATALOG[category].map((item) => {
          const unlocked = isUnlocked(item.unlock, progress);
          const isWorn = worn[category] === item.id;
          const status = isWorn ? t('looks.worn') : unlocked ? null : item.unlock.kind === 'pro' ? t('looks.proShort') : unlockText(item.unlock);
          return (
            <LookTile
              key={item.id}
              category={category}
              name={itemName(item)}
              look={lookFor({ ...worn, [category]: item.id })}
              status={status}
              locked={!unlocked}
              pro={item.unlock.kind === 'pro'}
              worn={isWorn}
              previewing={!official && (tried ? tried.category === category && tried.id === item.id : isWorn)}
              onPress={() => press(item)}
            />
          );
        })}
      </View>

      {category === 'deck' ? (
        <ToggleRow title={t('looks.fourColor')} hint={t('looks.fourColorHint')} value={fourColor} onChange={setFourColor} />
      ) : null}
      <ToggleRow
        title={t('looks.official')}
        hint={t('looks.officialToggleHint')}
        value={official}
        onChange={(on) => {
          setOfficial(on);
          if (on) setTried(null);
        }}
      />
      <AppText variant="caption" tone="muted">
        {t('looks.progressNote')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginTop: -space.xs,
  },
  noteText: {
    flex: 1,
  },
  tabs: {
    gap: space.sm,
    paddingRight: space.lg,
  },
  tab: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
