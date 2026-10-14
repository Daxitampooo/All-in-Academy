# @pokerall/shared

What the app and the server agree on:

- zod schemas for requests (sign-in, profile, privacy, sync) and the types of answers (`Me`, `Tokens`);
- error codes (`ERROR_CODES`): the server answers with a code, the app shows a translated message;
- progress sync rules (`applySync`, `syncView`). Every section merges so that the order of syncs doesn't
  matter and nothing earned on one phone is lost on another: counters per device added up across devices,
  best values kept, the earliest achievement date kept, lessons stay passed, the latest table look wins.
