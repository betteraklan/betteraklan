// Words kept lowercase in a title-cased name, except as the first word.
const MINOR = new Set([
  'a',
  'an',
  'and',
  'at',
  'de',
  'for',
  'in',
  'it',
  'of',
  'on',
  'or',
  'sa',
  'ng',
  'the',
  'to',
  'with',
]);
// Acronyms and Roman numerals that stay uppercase.
const KEEP_UPPER = new Set([
  'ASU',
  'BFP',
  'DOT',
  'HR',
  'ICT',
  'LGU',
  'PNP',
  'RHU',
]);
const ROMAN =
  /^(?=[IVXLCDM]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/**
 * Display-time title case for ALL CAPS names only. Mixed-case names are
 * returned unchanged. Never use this to rewrite a stored name.
 */
export function displayName(name: string): string {
  // Only ALL CAPS: has at least one letter and no lowercase letters.
  if (!/[A-Z]/.test(name) || /[a-z]/.test(name)) return name;
  const out = name
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      word
        .split('-')
        .map(part => {
          const upper = part.toUpperCase();
          if (KEEP_UPPER.has(upper) || ROMAN.test(upper)) return upper;
          if (i > 0 && MINOR.has(part)) return part;
          // Capitalise the first letter, after any leading bracket or quote.
          return part.replace(
            /^([^A-Za-z]*)([A-Za-z])/,
            (_, lead, c) => lead + c.toUpperCase()
          );
        })
        .join('-')
    )
    .join(' ');
  // Acronyms inside brackets, e.g. "University(ASU)", stay uppercase.
  return out.replace(/\((\w+)\)/g, (m, w) =>
    KEEP_UPPER.has(w.toUpperCase()) ? `(${w.toUpperCase()})` : m
  );
}
