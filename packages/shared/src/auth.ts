import { z } from 'zod';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const LocaleSchema = z.enum(['en', 'ru']);
export type Locale = z.infer<typeof LocaleSchema>;

/** Emails are compared without case and surrounding spaces. */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

export const PasswordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

/**
 * A guest account is tied to a random secret the app makes on first sign-in and keeps on the phone. Only its
 * hash is stored on the server. Losing the phone loses the guest account, so the app suggests adding an email.
 */
export const GuestSecretSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

/** New accounts need the 18+ confirmation from the first launch. */
const AgeConfirmed = z.literal(true, { error: 'age_required' });

export const GuestCreateSchema = z.object({
  guestSecret: GuestSecretSchema,
  ageConfirmed: AgeConfirmed,
  locale: LocaleSchema,
});

export const GuestLoginSchema = z.object({
  guestSecret: GuestSecretSchema,
});

export const EmailRegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  ageConfirmed: AgeConfirmed,
  locale: LocaleSchema,
});

export const EmailLoginSchema = z.object({
  email: EmailSchema,
  // Any length here: the length rules are for new passwords only.
  password: z.string().min(1).max(PASSWORD_MAX),
});

/** Adds an email and password to the signed-in account (usually a guest one). */
export const LinkEmailSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const GoogleLoginSchema = z.object({
  idToken: z.string().min(10).max(4096),
  /** Needed only when the Google account is new to PokerALL. */
  ageConfirmed: z.literal(true).optional(),
  locale: LocaleSchema,
});

export const LinkGoogleSchema = z.object({
  idToken: z.string().min(10).max(4096),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(20).max(256),
});

export const DeleteRequestSchema = z.object({
  /** Contact for the team to confirm the request; for accounts without a password. */
  email: EmailSchema,
  nickname: z.string().trim().max(32).optional(),
  message: z.string().trim().max(1000).optional(),
  locale: LocaleSchema,
});

export type GuestCreate = z.infer<typeof GuestCreateSchema>;
export type GuestLogin = z.infer<typeof GuestLoginSchema>;
export type EmailRegister = z.infer<typeof EmailRegisterSchema>;
export type EmailLogin = z.infer<typeof EmailLoginSchema>;
export type LinkEmail = z.infer<typeof LinkEmailSchema>;
export type GoogleLogin = z.infer<typeof GoogleLoginSchema>;
export type LinkGoogle = z.infer<typeof LinkGoogleSchema>;
export type Refresh = z.infer<typeof RefreshSchema>;
export type DeleteRequest = z.infer<typeof DeleteRequestSchema>;

/** Ways to sign in that can be attached to one account. */
export type IdentityKind = 'guest' | 'email' | 'google';

export type Tokens = {
  accessToken: string;
  /** ms since 1970. */
  accessExpiresAt: number;
  refreshToken: string;
};
