// A display-time category for a record, worked out from its name and
// description. The data has no category field and this never writes one back:
// the JSON stays as the owner supplied it. It is a convenience for filtering
// and badges, so wherever the text is unclear the answer is "Other", for a
// person to review, rather than a guess.

export type Category =
  | 'Beach'
  | 'Falls'
  | 'Cave'
  | 'Culture'
  | 'Nature'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Beach',
  'Falls',
  'Cave',
  'Culture',
  'Nature',
  'Other',
];

/** The four categories offered as filter chips on a town page. */
export const FILTER_CATEGORIES = ['Beach', 'Falls', 'Cave', 'Culture'] as const;

// Whole-word patterns. The first category that matches wins, so a name like
// "Tigayon Hill and Caves" is a Cave (not just Nature) and "Beach Falls"
// would be Falls.
const RULES: [Category, RegExp][] = [
  ['Cave', /\b(caves?|caverns?|grottos?)\b/i],
  ['Falls', /\b(falls|waterfalls?|cascades?)\b/i],
  ['Beach', /\b(beach(es)?|shores?|coves?|sandbars?)\b/i],
  [
    'Culture',
    /\b(church(es)?|cathedral|chapel|shrine|monument|museum|heritage|plaza|marker|relics?|ruins?|village|convent|commemorat\w*|ati-?atihan|festival|fiesta)\b/i,
  ],
  [
    'Nature',
    // No "island": it is not enough to say what an island is known for
    // (Boracay's description names its beaches, and that should decide).
    /\b(hills?|mountain(eering)?|mt|rivers?|forests?|mangroves?|sanctuary|parks?|eco-?\w*|lakes?|springs?|rocks?|stones?|trek(king)?|trails?|reefs?|coral|dead forest|reforestation|birds?|cliffs?|trees?|nature)\b/i,
  ],
];

// A full stop after one of these does not end a sentence ("8 kms. in length",
// "Mt. Nausan", "St. John", "Brgy. Libang").
const ABBREVIATIONS = 'kms?|mt|st|sto|sta|brgy|no|dr|mr|mrs|jr|sr|ft';
const SENTENCE_END = new RegExp(
  `(?<!\\b(?:${ABBREVIATIONS}))[.!?]\\s+(?=[A-Z“"])`,
  'i'
);

/**
 * First sentence, so a passing mention deep in a long description doesn't
 * decide the category.
 */
export function leadSentence(s: string): string {
  const text = s.replace(/\s+/g, ' ').trim();
  const m = SENTENCE_END.exec(text);
  return m ? text.slice(0, m.index + 1) : text;
}
const lead = leadSentence;

export interface Categorizable {
  name: string | null;
  description: string;
  /** 'event' and 'product' records are not places: see below. */
  layer?: 'place' | 'event' | 'stay' | 'product';
}

/**
 * Beach, Falls, Cave, Culture, Nature or Other.
 * - Festivals are Culture; products and stays have no category (Other).
 * - A place is classed from its name first (the first rule that matches).
 * - Only if the name says nothing does the first sentence of its description
 *   get a say, and then only when it points to a single category. A sentence
 *   that names two ("fringed with mangroves ... and rocky beaches") is left as
 *   Other for a person to decide, not settled by which rule comes first.
 */
export function categoryOf(rec: Categorizable): Category {
  if (rec.layer === 'event') return 'Culture';
  if (rec.layer === 'product' || rec.layer === 'stay') return 'Other';
  const name = rec.name ?? '';
  for (const [category, re] of RULES) if (re.test(name)) return category;
  const first = lead(rec.description);
  const hits = RULES.filter(([, re]) => re.test(first)).map(([c]) => c);
  return hits.length === 1 ? hits[0] : 'Other';
}
