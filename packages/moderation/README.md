# @pokerall/moderation

Checks for what players write, shared by the app and (later) the server:

- `findProfanity(text)` / `hasProfanity(text)`: swear words and slurs in English and Russian, including
  look-alike letters, digits for letters, stretched and spaced-out letters.
- `checkNickname(nick)`: 3–16 letters and digits with `_ - .` between them, no profanity, no staff names.
- `checkAbout(text)`: up to 140 characters, no profanity, no links or contacts.
