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
  setTitle: (id: string | null) => void;
  setShowTitle: (on: boolean) => void;
  saveFields: (fields: ProfileFields) => void;
  saveAvatar: (avatar: AvatarSpec) => void;
};

/**
 * The player's profile, kept on the device for now. With accounts (stage 7) it syncs to the server, which
 * checks nicknames for uniqueness and runs the same text checks again.
 */
export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      nickname: null,
      about: '',
      country: null,
      favoriteHand: null,
      style: null,
      avatar: DEFAULT_AVATAR,
      title: null,
      showTitle: true,
      setTitle: (title) => set({ title }),
      setShowTitle: (showTitle) => set({ showTitle }),
      saveFields: (fields) => set(fields),
      saveAvatar: (avatar) => set({ avatar }),
    }),
    {
      name: 'profile',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ nickname, about, country, favoriteHand, style, avatar, title, showTitle }) => ({
        nickname,
        about,
        country,
        favoriteHand,
        style,
        avatar,
        title,
        showTitle,
      }),
    },
  ),
);
