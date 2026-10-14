import type { StoredProfile } from '@pokerall/shared/client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';
import { DEFAULT_AVATAR, type AvatarSpec, type PlayStyle } from '@/profile/avatar';

export type ProfileFields = {
  /** Null until the player picks one; the table then says "You". */
  nickname: string | null;
  about: string;
  /** ISO 3166-1 alpha-2 code, shown as a flag; optional. */
  country: string | null;
  /** In range notation: "AKs", "QJo", "77". */
  favoriteHand: string | null;
  style: PlayStyle | null;
};

type ProfileState = ProfileFields & {
  avatar: AvatarSpec;
  /** Id of the achievement whose title is shown under the nickname. */
  title: string | null;
  /** Show the title at the table. */
  showTitle: boolean;
  /** Time of the last edit, ms since 1970; 0 for a profile never edited. The later edit wins between phones. */
  updatedAt: number;
  setTitle: (id: string | null) => void;
  setShowTitle: (on: boolean) => void;
  saveFields: (fields: ProfileFields) => void;
  saveAvatar: (avatar: AvatarSpec) => void;
  /** Takes the profile saved in the account (it was edited later on another phone). */
  applyRemote: (profile: StoredProfile) => void;
  /** Back to an empty profile (after signing out or deleting the account). */
  reset: () => void;
};

const EMPTY: ProfileFields & { avatar: AvatarSpec; title: string | null; showTitle: boolean; updatedAt: number } = {
  nickname: null,
  about: '',
  country: null,
  favoriteHand: null,
  style: null,
  avatar: DEFAULT_AVATAR,
  title: null,
  showTitle: true,
  updatedAt: 0,
};

/**
 * The player's profile. With an account it syncs to the server, which checks nicknames for uniqueness and runs
 * the same text checks again.
 */
export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      ...EMPTY,
      setTitle: (title) => set({ title, updatedAt: Date.now() }),
      setShowTitle: (showTitle) => set({ showTitle, updatedAt: Date.now() }),
      saveFields: (fields) => set({ ...fields, updatedAt: Date.now() }),
      saveAvatar: (avatar) => set({ avatar, updatedAt: Date.now() }),
      applyRemote: (p) =>
        set({
          nickname: p.nickname,
          about: p.about,
          country: p.country,
          favoriteHand: p.favoriteHand,
          style: p.style,
          avatar: { ...DEFAULT_AVATAR, ...(p.avatar as Partial<AvatarSpec>), face: { ...DEFAULT_AVATAR.face, ...(p.avatar.face as Partial<AvatarSpec['face']>) } },
          title: p.title,
          showTitle: p.showTitle,
          updatedAt: p.updatedAt,
        }),
      reset: () => set(EMPTY),
    }),
    {
      name: 'profile',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ nickname, about, country, favoriteHand, style, avatar, title, showTitle, updatedAt }) => ({
        nickname,
        about,
        country,
        favoriteHand,
        style,
        avatar,
        title,
        showTitle,
        updatedAt,
      }),
    },
  ),
);
