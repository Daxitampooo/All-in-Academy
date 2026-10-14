/**
 * Error codes the server answers with. The app turns each code into a translated message, so the server never
 * sends text meant for the player.
 */
export const ERROR_CODES = [
  'bad_request',
  'unauthorized',
  'token_expired',
  'invalid_credentials',
  'age_required',
  'email_taken',
  'nickname_taken',
  'nickname_invalid',
  'about_invalid',
  'identity_in_use',
  'already_linked',
  'last_identity',
  'google_disabled',
  'google_invalid',
  'not_found',
  'rate_limited',
  'payload_too_large',
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Body of every error response. `field` names the input that was wrong; `reason` gives detail for checks. */
export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    field?: string;
    reason?: string;
  };
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}
