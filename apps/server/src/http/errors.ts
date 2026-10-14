import type { ApiErrorBody, ErrorCode } from '@pokerall/shared';

/** An error the player's app should hear about, with an HTTP status and a code it can translate. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly detail: { field?: string; reason?: string } = {},
  ) {
    super(code);
  }

  body(): ApiErrorBody {
    return { error: { code: this.code, ...this.detail } };
  }
}

export const unauthorized = () => new ApiError(401, 'unauthorized');
export const notFound = () => new ApiError(404, 'not_found');
