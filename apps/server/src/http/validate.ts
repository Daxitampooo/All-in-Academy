import { isErrorCode } from '@pokerall/shared';
import type { z } from 'zod';

import { ApiError } from './errors';

/**
 * Checks input against a schema. A failed check answers 400 with the first problem: its field and, when the
 * schema names an error code as the message (like "age_required"), that code.
 */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue && issue.path.length > 0 ? issue.path.join('.') : undefined;
  if (issue && isErrorCode(issue.message)) throw new ApiError(400, issue.message, field ? { field } : {});
  throw new ApiError(400, 'bad_request', { ...(field ? { field } : {}), ...(issue ? { reason: issue.code } : {}) });
}

/** True for a Postgres "unique constraint" error, optionally on a given index. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = error as { code?: string; constraint?: string; cause?: unknown } | null;
  if (!e) return false;
  if (e.code === '23505') return !constraint || e.constraint === constraint;
  // drizzle wraps driver errors
  return e.cause ? isUniqueViolation(e.cause, constraint) : false;
}
