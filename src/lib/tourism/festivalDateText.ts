// Festival dates as the data gives them: in each festival's description
// ("held every 23rd of March", "from June 12 to 23", "every 3rd Sunday of
// January"). The data holds no structured event dates, so nothing here
// invents one: a phrase is read as written, shown as written, and only a
// plain day-and-month phrase can become a calendar entry.

export type DateKind =
  /** A day, or a range of days, in one month ("June 12 to 23"). */
  | 'fixed'
  /** An Nth weekday of a month ("3rd Sunday of January"): changes each year. */
  | 'weekday'
  /** Hedged ("as early as December 15", "reported in February and October"). */
  | 'unconfirmed';

export interface FestivalDateInfo {
  kind: DateKind;
  /** 1 to 12. More than one only for an unconfirmed, multi-month phrase. */
  months: number[];
  day?: number;
  endDay?: number;
  /** The phrase exactly as it appears in the description. */
  text: string;
  /** The description says it happens every year. */
  recurring: boolean;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const M = MONTH_NAMES.join('|');
const monthNo = (s: string) =>
  MONTH_NAMES.findIndex(m => m.toLowerCase() === s.toLowerCase()) + 1;

// Longest day count per month, leap year allowed (a Feb 29 festival is real).
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const validDay = (month: number, day: number) =>
  day >= 1 && day <= DAYS_IN[month - 1];

// One scan finds, in text order: Nth weekday of a month, a day range, "25th of
// April", or "April 25". The range comes before the single day so "June 12 to
// 23" is one phrase, not two.
const PHRASE = new RegExp(
  [
    `\\b(?<nth>1st|2nd|3rd|4th|first|second|third|fourth|last)\\s+(?<dow>sun|mon|tue|wed|thu|fri|sat)[a-z]*\\s+(?:of|in)\\s+(?:the\\s+month\\s+of\\s+)?(?<wm>${M})\\b`,
    `\\b(?<rm>${M})\\s+(?<r1>\\d{1,2})(?:st|nd|rd|th)?\\s*(?:to|-|–|and)\\s*(?<r2>\\d{1,2})(?:st|nd|rd|th)?\\b`,
    `\\b(?<dd>\\d{1,2})(?:st|nd|rd|th)?\\s+of\\s+(?:the\\s+month\\s+of\\s+)?(?<dm>${M})\\b`,
    `\\b(?<sm>${M})\\s+(?<sd>\\d{1,2})(?:st|nd|rd|th)?\\b`,
  ].join('|'),
  'gi'
);

const HEDGE =
  /as early as|around|about|approximately|usually|reported|varies|vary|may be/i;
const EVERY_YEAR =
  /\bevery\b|annual|each year|yearly|year by year|of each year/i;
// A year right after the phrase ("March 2 and 3, 1897") dates a past event, not a festival day.
const YEAR_AFTER = /^\s*,?\s*(?:1[5-9]|20)\d{2}\b/;

/** Any "every " or "as early as " directly before the phrase belongs to it. */
function withLead(desc: string, start: number): number {
  const lead = /(every |as early as )$/i.exec(
    desc.slice(Math.max(0, start - 12), start)
  );
  return lead ? start - lead[0].length : start;
}

/**
 * The date a description gives for its festival, or null when it names none.
 * A phrase is skipped when a year follows it (a historical date), and one
 * description with two different dates is unconfirmed rather than guessed.
 */
export function parseFestivalDate(
  description: string
): FestivalDateInfo | null {
  const found: FestivalDateInfo[] = [];
  const recurring = EVERY_YEAR.test(description);

  for (const m of description.matchAll(PHRASE)) {
    const g = m.groups!;
    const end = m.index! + m[0].length;
    if (YEAR_AFTER.test(description.slice(end))) continue;
    const start = withLead(description, m.index!);
    const text = description.slice(start, end);
    const window = description.slice(Math.max(0, m.index! - 40), end + 10);
    const hedged = HEDGE.test(window);

    let info: FestivalDateInfo | null = null;
    if (g.nth) {
      info = { kind: 'weekday', months: [monthNo(g.wm)], text, recurring };
    } else if (g.rm) {
      const month = monthNo(g.rm);
      const d1 = Number(g.r1);
      const d2 = Number(g.r2);
      if (validDay(month, d1) && validDay(month, d2) && d2 >= d1)
        info = {
          kind: 'fixed',
          months: [month],
          day: d1,
          endDay: d2,
          text,
          recurring,
        };
    } else {
      const month = monthNo(g.dm ?? g.sm);
      const day = Number(g.dd ?? g.sd);
      if (validDay(month, day))
        info = { kind: 'fixed', months: [month], day, text, recurring };
    }
    if (info) found.push(hedged ? { ...info, kind: 'unconfirmed' } : info);
  }

  if (found.length === 1) return found[0];
  if (found.length > 1) {
    const same = found.every(
      f =>
        f.kind === found[0].kind &&
        f.months[0] === found[0].months[0] &&
        f.day === found[0].day &&
        f.endDay === found[0].endDay
    );
    if (same) return found[0];
    // Two different dates: show the first as written, claim neither.
    return {
      ...found[0],
      kind: 'unconfirmed',
      months: [...new Set(found.flatMap(f => f.months))],
      day: undefined,
      endDay: undefined,
    };
  }

  // No day or weekday phrase: a hedged sentence that only names months
  // ("Activities have been reported in February and October").
  for (const sentence of description.split(/(?<=[.!?])\s+/)) {
    if (
      !/\b(reported|activities)\b/i.test(sentence) ||
      /\b(?:1[5-9]|20)\d{2}\b/.test(sentence)
    )
      continue;
    const hits = [...sentence.matchAll(new RegExp(`\\b(?:${M})\\b`, 'gi'))];
    if (hits.length === 0) continue;
    const first = hits[0].index!;
    const last = hits[hits.length - 1];
    return {
      kind: 'unconfirmed',
      months: [...new Set(hits.map(h => monthNo(h[0])))],
      text: sentence.slice(first, last.index! + last[0].length),
      recurring,
    };
  }
  return null;
}

export interface FestivalLike {
  id: string;
  name: string;
  description: string;
  townName: string | null;
}

export interface PlacedFestival<T extends FestivalLike = FestivalLike> {
  festival: T;
  info: FestivalDateInfo;
}

const kindRank = { fixed: 0, weekday: 1, unconfirmed: 2 } as const;

/**
 * Twelve months, January to December. A festival is listed under every month
 * its date phrase names; festivals whose description gives no date are
 * returned separately so none is dropped.
 */
export function monthGrid<T extends FestivalLike>(festivals: T[]) {
  const months: PlacedFestival<T>[][] = Array.from({ length: 12 }, () => []);
  const undated: T[] = [];
  for (const festival of festivals) {
    const info = parseFestivalDate(festival.description);
    if (!info) undated.push(festival);
    else for (const m of info.months) months[m - 1].push({ festival, info });
  }
  for (const list of months)
    list.sort(
      (a, b) =>
        kindRank[a.info.kind] - kindRank[b.info.kind] ||
        (a.info.day ?? 99) - (b.info.day ?? 99) ||
        a.festival.name.localeCompare(b.festival.name)
    );
  return { months, undated };
}

/**
 * The Ati-Atihan to feature, chosen from the data: festivals named Ati-Atihan,
 * preferring one whose description gives a date, then the fullest description.
 */
export function pickFeatured<T extends FestivalLike>(
  festivals: T[]
): PlacedFestival<T> | null {
  const candidates = festivals
    .filter(f => /ati-?atihan/i.test(f.name))
    .map(festival => ({
      festival,
      info: parseFestivalDate(festival.description),
    }));
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      Number(!!b.info) - Number(!!a.info) ||
      b.festival.description.length - a.festival.description.length
  );
  const best = candidates[0];
  return best.info ? { festival: best.festival, info: best.info } : null;
}

/** Only a plain day or day range can be added to a calendar. */
export const canAddToCalendar = (i: FestivalDateInfo) => i.kind === 'fixed';

// ---------------------------------------------------------------- .ics ----

const ymd = (y: number, m: number, d: number) =>
  `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// Content lines are folded at 75 octets; fold by characters a little short of
// that so multi-byte letters (ñ) never push a line over.
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 70) {
    out.push(rest.slice(0, 70));
    rest = ` ${rest.slice(70)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

export interface IcsEvent {
  uid: string;
  summary: string;
  location?: string;
  info: FestivalDateInfo;
}

/** The next time a day-and-month falls on or after `now`, as a UTC date. */
function nextYear(month: number, day: number, now: Date): number {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const y = now.getUTCFullYear();
  return Date.UTC(y, month - 1, day) >= today ? y : y + 1;
}

/**
 * An iCalendar file for festivals with a plain date. All-day events; one that
 * the description says happens every year repeats yearly. Anything else is
 * skipped, never guessed.
 */
export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BetterAklan//Festivals//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const e of events) {
    const i = e.info;
    if (!canAddToCalendar(i) || !i.day) continue;
    const month = i.months[0];
    const year = nextYear(month, i.day, now);
    const lastDay = i.endDay ?? i.day;
    // DTEND of an all-day event is the day after it ends.
    const after = new Date(Date.UTC(year, month - 1, lastDay + 1));
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@betteraklan.org`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(year, month, i.day)}`,
      `DTEND;VALUE=DATE:${ymd(after.getUTCFullYear(), after.getUTCMonth() + 1, after.getUTCDate())}`,
      `SUMMARY:${esc(e.summary)}`,
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      `DESCRIPTION:${esc(`Date as written in the festival description: ${i.text}. From BetterAklan.`)}`,
      ...(i.recurring ? ['RRULE:FREQ=YEARLY'] : []),
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
