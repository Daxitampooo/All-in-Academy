# @pokerall/content

Academy content as data, with typed accessors and no UI:

- `lessons/<id>/meta.json` — level, module, free or Pro, reading time, the blocks in order and the test.
  `en.json` / `ru.json` — every text of the lesson under the block ids.
- Block types: `text` (paragraphs, "- " bullets, **bold**), `handRanking`, `cards`, `table` (positions),
  `range` (a 13×13 matrix from `ranges/`), `potOdds` (an interactive calculator), `quiz`.
- `ranges/*.json` — ranges by spot in the notation of popular poker tools (`22+, A2s+, ATo+, A9o:0.5`).
  Simplified teaching ranges, not solver output.
- `glossary/en.json`, `ru.json` — terms with shared ids; `links.json` points terms to lessons.
- `src/academy.ts` — levels → modules → lessons, `lessonById`, `nextLesson`, `rangeActions`, `glossary`,
  and `COACH_LESSONS`, which maps hand-analysis lesson ids to real lessons.

Adding a lesson: create the folder with the three files, run `pnpm gen` (it rewrites `src/lessonFiles.ts`
and `src/rangeFiles.ts`: Metro needs static imports) and add the id to `LESSON_ORDER` in `src/academy.ts`. `pnpm test` checks the structure
with zod, that both languages have every text, that card rows are real cards and every range parses.
