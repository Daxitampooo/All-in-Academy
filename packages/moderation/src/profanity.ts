/**
 * Finds swear words and slurs in English and Russian, including the usual disguises: Latin letters that
 * look Cyrillic (xyй), digits for letters (6ля, sh1t), stretched letters (хууууй, fuuuck) and letters
 * spaced out (х у й, f.u.c.k).
 *
 * Patterns are written for words after normalization: lower case, ё as е, repeated letters collapsed.
 * Short or common roots are anchored to the start or the whole word so that ordinary words don't trip
 * the filter (рубля, хлеба, застрахуйте, сукно, cocktail, Niger).
 */

const RU_PATTERNS: RegExp[] = [
  /^(?!.*страху).*ху[йяеюи]/, // the most common root; "застрахуйте" is a word about insurance
  /пизд/,
  /^(за|на|по|вы|у|до|от|про|раз|рас|съ|под|при|пере|об|изъ|въ|недо)?еб(а|у|л|н|ись|ош|ыр|ет|ут)/,
  /долбоеб/,
  /^(вы|раз|по|на|за)?бля/,
  /^сук(а|и|у|ой|ам|ами)?$/,
  /^сучк/,
  /^сучар/,
  /^сукин/,
  /муда[кч]/,
  /мудил/,
  /залуп/,
  /г[ао]ндон/,
  /шлюх/,
  /^дроч/,
  /^(от|за)?п[ие]д[ао]р/,
  /пидр/,
  /педераст/,
  /нигер/,
  /^жид(ы|ов|овск|овка|ок|ня)?$/,
];

const EN_PATTERNS: RegExp[] = [
  /fuck/,
  /^fuk/,
  /^fck/,
  /shit/,
  /bitch/,
  /cunt/,
  /^dick(s|head|hed)?$/,
  /^cock(s|suck)/,
  /^cock$/,
  /ashole/,
  /^bastard/,
  /^whore/,
  /^slut/,
  /^fag(s|ot|ots)?$/,
  /^niga/,
  /^retard/,
  /^twat/,
  /^wank/,
  // Russian swearing typed in Latin letters.
  /blya/,
  /pizd/,
  /^(na)?k?huy/,
  /^(za|na|vy|u)?eba(t|l|n)/,
  /^suka$/,
];

/** Patterns that need the doubled letters kept: collapsing would turn them into innocent words. */
const EN_RAW_PATTERNS: RegExp[] = [/nigg/, /^ass$/, /asshole/];

const TO_CYRILLIC: Record<string, string> = {
  a: 'а',
  b: 'в',
  c: 'с',
  e: 'е',
  h: 'н',
  k: 'к',
  m: 'м',
  o: 'о',
  p: 'р',
  t: 'т',
  x: 'х',
  y: 'у',
  u: 'и',
  '0': 'о',
  '3': 'з',
  '4': 'ч',
  '6': 'б',
  '@': 'а',
};

const TO_LATIN: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

const LETTER = /[a-zа-я0-9@$!]/;

function mapChars(word: string, table: Record<string, string>): string {
  let out = '';
  for (const ch of word) out += table[ch] ?? ch;
  return out;
}

function collapse(word: string): string {
  return word.replace(/(.)\1+/g, '$1');
}

/** Lower case, ё as е, and only letters, digits and the few symbols used to disguise letters. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е');
}

/** Words of a text, plus runs of spaced-out single letters glued together ("х у й" → "хуй"). */
function wordsOf(text: string): string[] {
  const tokens = normalize(text)
    .split(/[^a-zа-я0-9@$!]+/)
    .filter(Boolean);
  const words = [...tokens];
  let run = '';
  let runLength = 0;
  const flush = () => {
    if (runLength >= 3) words.push(run);
    run = '';
    runLength = 0;
  };
  for (const token of tokens) {
    if (token.length === 1 && LETTER.test(token)) {
      run += token;
      runLength += 1;
    } else flush();
  }
  flush();
  return words;
}

function matchWord(word: string): boolean {
  const hasCyrillic = /[а-я]/.test(word);
  const hasLatin = /[a-z]/.test(word);
  // Cyrillic reading: a word in Cyrillic, or a mix with look-alike Latin letters and digits.
  if (hasCyrillic || !hasLatin) {
    const ru = collapse(mapChars(word, TO_CYRILLIC));
    if (RU_PATTERNS.some((re) => re.test(ru))) return true;
  }
  if (hasLatin || !hasCyrillic) {
    const raw = mapChars(word, TO_LATIN);
    if (EN_RAW_PATTERNS.some((re) => re.test(raw))) return true;
    const en = collapse(raw);
    if (EN_PATTERNS.some((re) => re.test(en))) return true;
  }
  return false;
}

/** The first word that looks like a swear word or a slur, or null. */
export function findProfanity(text: string): string | null {
  for (const word of wordsOf(text)) if (matchWord(word)) return word;
  return null;
}

export function hasProfanity(text: string): boolean {
  return findProfanity(text) !== null;
}
