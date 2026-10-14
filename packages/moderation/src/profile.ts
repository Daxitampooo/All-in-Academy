import { hasProfanity } from './profanity';

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;
export const ABOUT_MAX = 140;

export type NicknameProblem = 'short' | 'long' | 'chars' | 'profanity' | 'reserved';
export type AboutProblem = 'long' | 'profanity' | 'link';

/** Names that would look official or impersonate the staff. */
const RESERVED = /^(admin|administrator|moderator|mod|support|pokerall|system|админ|администратор|модератор|поддержка)$/;

/** Letters (Latin and Cyrillic), digits, and _ - . between them. */
const NICKNAME_CHARS = /^[a-zA-Zа-яА-ЯёЁ0-9]+([_.-][a-zA-Zа-яА-ЯёЁ0-9]+)*$/;

/** What is wrong with a nickname, or null when it can be used. */
export function checkNickname(nickname: string): NicknameProblem | null {
  const nick = nickname.trim();
  if (nick.length < NICKNAME_MIN) return 'short';
  if (nick.length > NICKNAME_MAX) return 'long';
  if (!NICKNAME_CHARS.test(nick)) return 'chars';
  if (hasProfanity(nick) || hasProfanity(nick.replace(/[_.-]/g, ''))) return 'profanity';
  if (RESERVED.test(nick.toLowerCase().replace(/[_.-]/g, ''))) return 'reserved';
  return null;
}

/** Links and handles: profiles are not a place to advertise other sites or chats. */
const LINK = /(https?:\/\/|www\.|t\.me\/|\b[a-z0-9-]+\.(com|ru|net|org|io|gg|me|bet|xyz|info|рф)\b|@[a-z0-9_]{3,})/i;

/** What is wrong with the "About me" text, or null when it can be saved. */
export function checkAbout(text: string): AboutProblem | null {
  if (text.trim().length > ABOUT_MAX) return 'long';
  if (hasProfanity(text)) return 'profanity';
  if (LINK.test(text)) return 'link';
  return null;
}

/** Cyrillic letters that look like Latin ones, so "Nеon" written with a Cyrillic е can't pose as "Neon". */
const LOOKALIKES: Record<string, string> = {
  а: 'a',
  в: 'b',
  е: 'e',
  ё: 'e',
  к: 'k',
  м: 'm',
  н: 'h',
  о: 'o',
  р: 'p',
  с: 'c',
  т: 't',
  у: 'y',
  х: 'x',
};

/**
 * The form nicknames are compared in for uniqueness: no case, no separators, Cyrillic lookalikes as Latin.
 * "Neon_Fox", "neonfox" and "NЕОN.fox" are the same nickname.
 */
export function nicknameKey(nickname: string): string {
  return [...nickname.trim().toLowerCase()]
    .filter((ch) => !'_.-'.includes(ch))
    .map((ch) => LOOKALIKES[ch] ?? ch)
    .join('');
}
