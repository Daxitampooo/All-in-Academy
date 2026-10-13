import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import type { FaceSpec } from '@/components/FacePortrait';
import { LockIcon } from '@/components/icons';
import { OptionTile } from '@/components/OptionTile';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Screen } from '@/components/Screen';
import { isUnlocked } from '@/looks/resolve';
import {
  BACKGROUNDS,
  BADGES,
  FACE_PARTS,
  FACE_PART_ORDER,
  FRAMES,
  OUTLINES,
  type AvatarOption,
  type AvatarSpec,
  type FacePart,
} from '@/profile/avatar';
import { unlockText } from '@/profile/unlockText';
import { beatenById, useBotProgress } from '@/store/botProgress';
import { usePro } from '@/store/pro';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, withAlpha } from '@/theme/tokens';

type Section = 'face' | 'background' | 'frame' | 'outline' | 'badge';
const SECTIONS: Section[] = ['face', 'background', 'frame', 'outline', 'badge'];

type Pickable = 'background' | 'frame' | 'badge';
const OPTIONS: Record<Pickable, AvatarOption[]> = { background: BACKGROUNDS, frame: FRAMES, badge: BADGES };

function withPart(face: FaceSpec, part: FacePart, value: string | null): FaceSpec {
  const next = { ...face } as Record<string, string | undefined>;
  if (value === null) delete next[part];
  else next[part] = value;
  return next as FaceSpec;
}

function withOption(avatar: AvatarSpec, kind: Pickable, id: string): AvatarSpec {
  if (kind === 'badge') return { ...avatar, badge: id === 'none' ? null : id };
  return { ...avatar, [kind]: id };
}

const optionOf = (avatar: AvatarSpec, kind: Pickable) => (kind === 'badge' ? (avatar.badge ?? 'none') : avatar[kind]);

export default function AvatarScreen() {
  const { t } = useTranslation();
  const { colors, hues } = useTheme();
  const saved = useProfile((s) => s.avatar);
  const saveAvatar = useProfile((s) => s.saveAvatar);
  const beaten = beatenById(useBotProgress((s) => s.records));
  const pro = usePro();
  const [draft, setDraft] = useState<AvatarSpec>(saved);
  const [trying, setTrying] = useState<{ kind: Pickable; id: string } | null>(null);
  const [section, setSection] = useState<Section>('face');

  const shown = trying ? withOption(draft, trying.kind, trying.id) : draft;
  const triedOption = trying ? OPTIONS[trying.kind].find((o) => o.id === trying.id) : undefined;

  const pick = (kind: Pickable, option: AvatarOption) => {
    if (isUnlocked(option.unlock, beaten, pro)) {
      setDraft((d) => withOption(d, kind, option.id));
      setTrying(null);
    } else {
      setTrying({ kind, id: option.id });
    }
  };

  const save = () => {
    saveAvatar(draft);
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  return (
    <Screen header={<BackButton label={t('profile.title')} fallback="/profile" />} title={t('avatar.title')}>
      <View style={styles.preview}>
        <PlayerAvatar avatar={shown} size={136} active />
      </View>
      {triedOption ? (
        <View style={[styles.note, { borderColor: withAlpha(colors.amber, 0.5), backgroundColor: withAlpha(colors.amber, 0.08) }]} accessibilityLiveRegion="polite">
          <LockIcon color={colors.amber} size={14} />
          <AppText variant="caption" tone="amber" style={styles.noteText}>
            {t('avatar.trying', { how: unlockText(triedOption.unlock, t) })}
          </AppText>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
        {SECTIONS.map((s) => {
          const active = s === section;
          return (
            <Pressable
              key={s}
              onPress={() => setSection(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, { borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? withAlpha(colors.cyan, 0.12) : colors.surface }]}>
              <AppText variant="label" strong tone={active ? 'cyan' : 'text'}>
                {t(`avatar.sections.${s}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {section === 'face'
        ? FACE_PART_ORDER.map((part) => (
            <View key={part} style={styles.group}>
              <AppText variant="label" tone="muted">
                {t(`avatar.parts.${part}`)}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="radiogroup">
                {(FACE_PARTS[part] as readonly (string | null)[]).map((value) => {
                  const face = withPart(draft.face, part, value);
                  const current = (draft.face[part] ?? null) === value;
                  return (
                    <OptionTile
                      key={value ?? 'none'}
                      label={t(`avatar.options.${part}.${value ?? 'none'}`)}
                      selected={current}
                      onPress={() => setDraft((d) => ({ ...d, face: withPart(d.face, part, value) }))}>
                      <PlayerAvatar avatar={{ ...draft, face, badge: null }} size={58} calm />
                    </OptionTile>
                  );
                })}
              </ScrollView>
            </View>
          ))
        : null}

      {section === 'outline' ? (
        <View style={styles.grid} accessibilityRole="radiogroup">
          {OUTLINES.map((hue) => (
            <OptionTile key={hue} label={t(`avatar.outlines.${hue}`)} selected={draft.outline === hue} onPress={() => setDraft((d) => ({ ...d, outline: hue }))}>
              <View style={[styles.swatch, { backgroundColor: hues[hue], boxShadow: colors.glow > 0 ? `0 0 10px ${withAlpha(hues[hue], 0.7)}` : undefined }]} />
            </OptionTile>
          ))}
        </View>
      ) : null}

      {section === 'background' || section === 'frame' || section === 'badge' ? (
        <View style={styles.grid} accessibilityRole="radiogroup">
          {OPTIONS[section].map((option) => {
            const locked = !isUnlocked(option.unlock, beaten, pro);
            return (
              <OptionTile
                key={option.id}
                label={[t(`avatar.options.${section}.${option.id}`), locked ? unlockText(option.unlock, t) : ''].filter(Boolean).join('. ')}
                selected={optionOf(draft, section) === option.id}
                trying={trying?.kind === section && trying.id === option.id}
                locked={locked}
                pro={option.unlock.kind === 'pro'}
                onPress={() => pick(section, option)}>
                <PlayerAvatar avatar={withOption(draft, section, option.id)} size={64} calm />
              </OptionTile>
            );
          })}
        </View>
      ) : null}

      <Button label={t('avatar.save')} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
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
  group: {
    gap: space.xs,
  },
  row: {
    gap: space.sm,
    paddingRight: space.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
  },
});
