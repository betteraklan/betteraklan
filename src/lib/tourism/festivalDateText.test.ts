import { describe, expect, it } from 'vitest';

import municipalities from '@/data/tourism/municipalities.json';

import {
  buildIcs,
  canAddToCalendar,
  monthGrid,
  parseFestivalDate,
  pickFeatured,
} from './festivalDateText';

describe('parseFestivalDate: dates given plainly', () => {
  it.each([
    [
      'Held every July 31, this annual event',
      'fixed',
      7,
      31,
      undefined,
      'every July 31',
    ],
    [
      'This is held every 23rd of March.',
      'fixed',
      3,
      23,
      undefined,
      'every 23rd of March',
    ],
    [
      'on April 25th, formally declaring',
      'fixed',
      4,
      25,
      undefined,
      'April 25th',
    ],
    [
      'held on the 25th of April each year',
      'fixed',
      4,
      25,
      undefined,
      '25th of April',
    ],
    ['from June 12 to 23 under one venue', 'fixed', 6, 12, 23, 'June 12 to 23'],
    [
      'lined up from December 16th to 30th adding color',
      'fixed',
      12,
      16,
      30,
      'December 16th to 30th',
    ],
    [
      'the contest is held every 28th of the month of April',
      'fixed',
      4,
      28,
      undefined,
      'every 28th of the month of April',
    ],
    [
      'January 22 became the date of thanksgiving',
      'fixed',
      1,
      22,
      undefined,
      'January 22',
    ],
    [
      'done on February 29 in leap years',
      'fixed',
      2,
      29,
      undefined,
      'February 29',
    ],
  ])('%s', (desc, kind, month, day, endDay, text) => {
    const i = parseFestivalDate(desc)!;
    expect(i.kind).toBe(kind);
    expect(i.months).toEqual([month]);
    expect(i.day).toBe(day);
    expect(i.endDay).toBe(endDay);
    // The phrase is a word-for-word piece of the description.
    expect(desc).toContain(i.text);
    expect(i.text).toBe(text);
  });

  it('knows when the description says it happens every year', () => {
    expect(parseFestivalDate('held every June 15.')!.recurring).toBe(true);
    expect(parseFestivalDate('an annual event on June 15.')!.recurring).toBe(
      true
    );
    expect(parseFestivalDate('from December 16th to 30th')!.recurring).toBe(
      false
    );
  });
});

describe('parseFestivalDate: dates that change, or are not confirmed', () => {
  it('a weekday rule like "3rd Sunday" is a weekday date, not a day', () => {
    const i = parseFestivalDate(
      'concluded every 3rd Sunday of January with a High Mass'
    )!;
    expect(i.kind).toBe('weekday');
    expect(i.months).toEqual([1]);
    expect(i.day).toBeUndefined();
    expect(i.text).toBe('every 3rd Sunday of January');
    expect(canAddToCalendar(i)).toBe(false);
  });

  it.each([
    ['culminating on the third Sunday in January', 'third Sunday in January'],
    [
      'fourth Sunday of January in the provincial calendar',
      'fourth Sunday of January',
    ],
    ['on the last Sat of March', 'last Sat of March'],
  ])('reads %s', (desc, text) => {
    const i = parseFestivalDate(desc)!;
    expect(i.kind).toBe('weekday');
    expect(i.text).toBe(text);
  });

  it('a hedged day is unconfirmed: "as early as December 15"', () => {
    const i = parseFestivalDate(
      'A light-a-tree program is done every year in as early as December 15.'
    )!;
    expect(i.kind).toBe('unconfirmed');
    expect(i.months).toEqual([12]);
    expect(i.text).toBe('as early as December 15');
    expect(canAddToCalendar(i)).toBe(false);
  });

  it('a sentence that only names months is unconfirmed in each of them', () => {
    const i = parseFestivalDate(
      'Activities have been reported in February and October.'
    )!;
    expect(i.kind).toBe('unconfirmed');
    expect(i.months).toEqual([2, 10]);
    expect(i.text).toBe('February and October');
  });

  it('two different dates in one description are unconfirmed, not guessed', () => {
    const i = parseFestivalDate('held every May 3 and again on June 9.')!;
    expect(i.kind).toBe('unconfirmed');
    expect(i.months).toEqual([5, 6]);
    expect(i.day).toBeUndefined();
  });

  it('the same date written twice is still one plain date', () => {
    const i = parseFestivalDate(
      'On April 25 ... the 25th of April each year.'
    )!;
    expect(i.kind).toBe('fixed');
    expect(i.day).toBe(25);
  });
});

describe('parseFestivalDate: no date at all', () => {
  it.each([
    ['', 'empty text'],
    ['A celebration of the harvest with street dancing.', 'no date words'],
    [
      'commemoration of the 74 Batangnons mass murdered on October 19, 1942.',
      'a historical date with a year',
    ],
    [
      'the blood compact on March 2 and 3, 1897.',
      'a historical range with a year',
    ],
    ['Held on February 30.', 'a day that does not exist'],
    ['from June 23 to 12', 'a range that runs backwards'],
    ['Held in the month of January.', 'a month with no day (not a hedge)'],
  ])('%s -> null (%s)', desc => {
    expect(parseFestivalDate(desc)).toBeNull();
  });
});

describe('monthGrid', () => {
  const f = (id: string, description: string, name = id) => ({
    id,
    name,
    description,
    townName: 'Kalibo',
  });

  it('has twelve months and puts each festival under the month it names', () => {
    const g = monthGrid([
      f('a', 'every June 24'),
      f('b', 'every June 12'),
      f('c', 'reported in February and October.'),
      f('d', 'no date here'),
    ]);
    expect(g.months).toHaveLength(12);
    // Earlier day first within a month.
    expect(g.months[5].map(p => p.festival.id)).toEqual(['b', 'a']);
    // A two-month phrase is listed in both months.
    expect(g.months[1].map(p => p.festival.id)).toEqual(['c']);
    expect(g.months[9].map(p => p.festival.id)).toEqual(['c']);
    expect(g.months[0]).toEqual([]);
    // A festival with no date is returned, not dropped.
    expect(g.undated.map(u => u.id)).toEqual(['d']);
  });

  it('lists plain dates before moving and unconfirmed ones', () => {
    const g = monthGrid([
      f('u', 'reported in January.'),
      f('w', 'every 3rd Sunday of January'),
      f('x', 'every January 22'),
    ]);
    expect(g.months[0].map(p => p.festival.id)).toEqual(['x', 'w', 'u']);
  });

  it('accounts for every festival in the data', () => {
    const festivals = municipalities.flatMap(m =>
      m.festivals
        .filter(e => e.name)
        .map((e, i) => ({
          id: `${m.slug}-${i}`,
          name: e.name!,
          description: e.description,
          townName: m.name,
        }))
    );
    const g = monthGrid(festivals);
    const placed = new Set(g.months.flat().map(p => p.festival.id));
    expect(placed.size + g.undated.length).toBe(festivals.length);
  });
});

describe('pickFeatured', () => {
  const f = (id: string, name: string, description: string) => ({
    id,
    name,
    description,
    townName: 'X',
  });

  it('chooses an Ati-Atihan from the data, preferring one with a date', () => {
    const picked = pickFeatured([
      f(
        '1',
        'Malinao Ati-atihan',
        'A very long description with no date at all. '.repeat(20)
      ),
      f(
        '2',
        'KALIBO STO. NIÑO ATI-ATIHAN FESTIVAL',
        'concluded every 3rd Sunday of January.'
      ),
      f('3', 'Piña Festival', 'every April 25'),
    ])!;
    expect(picked.festival.id).toBe('2');
    expect(picked.info.text).toBe('every 3rd Sunday of January');
  });

  it('is null when no Ati-Atihan has a date', () => {
    expect(pickFeatured([f('1', 'Ati-Atihan', 'street dancing')])).toBeNull();
    expect(pickFeatured([])).toBeNull();
  });

  it('picks Kalibo in the real data', () => {
    const festivals = municipalities.flatMap(m =>
      m.festivals
        .filter(e => e.name)
        .map((e, i) => ({
          id: `${m.slug}-${i}`,
          name: e.name!,
          description: e.description,
          townName: m.name,
        }))
    );
    const picked = pickFeatured(festivals)!;
    expect(picked.festival.townName).toBe('Kalibo');
    expect(picked.info.kind).toBe('weekday');
  });
});

describe('buildIcs', () => {
  const NOW = new Date('2026-11-21T02:00:00Z');
  const ev = (description: string, over: Record<string, string> = {}) => ({
    uid: 'event-kalibo-3',
    summary: 'Kalibo Day',
    location: 'Kalibo, Aklan',
    info: parseFestivalDate(description)!,
    ...over,
  });
  const unfold = (s: string) => s.replace(/\r\n /g, '');

  it('is a valid calendar with CRLF lines and an all-day event', () => {
    const ics = buildIcs([ev('done on November 3 every year')], NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const t = unfold(ics);
    // 3 November has passed by 21 November 2026, so the next one is in 2027.
    expect(t).toContain('DTSTART;VALUE=DATE:20271103');
    expect(t).toContain('DTEND;VALUE=DATE:20271104');
    expect(t).toContain('SUMMARY:Kalibo Day');
    expect(t).toContain('UID:event-kalibo-3@betteraklan.org');
    expect(t).toContain('RRULE:FREQ=YEARLY');
    expect(t).toContain(
      'Date as written in the festival description: November 3.'
    );
  });

  it('keeps this year when the date is still ahead', () => {
    expect(buildIcs([ev('every December 25')], NOW)).toContain(
      'DTSTART;VALUE=DATE:20261225'
    );
  });

  it("uses next year when this year's date has passed", () => {
    const t = buildIcs([ev('every June 24')], NOW);
    expect(t).toContain('DTSTART;VALUE=DATE:20270624');
  });

  it('a date range ends the day after its last day', () => {
    const t = buildIcs([ev('from June 12 to 23 each year')], NOW);
    expect(t).toContain('DTSTART;VALUE=DATE:20270612');
    expect(t).toContain('DTEND;VALUE=DATE:20270624');
  });

  it('does not repeat yearly unless the description says every year', () => {
    expect(buildIcs([ev('on November 3')], NOW)).not.toContain('RRULE');
  });

  it('skips weekday-rule and unconfirmed dates instead of guessing', () => {
    const t = buildIcs(
      [
        ev('every 3rd Sunday of January'),
        ev('as early as December 15'),
        ev('reported in February and October.'),
      ],
      NOW
    );
    expect(t).not.toContain('BEGIN:VEVENT');
  });

  it('escapes commas, semicolons and folds long lines', () => {
    const t = buildIcs(
      [
        ev('every July 31', {
          summary: 'Heroes of Vivo, Tangalan; a long, long name '.repeat(3),
        }),
      ],
      NOW
    );
    expect(t).toContain('\\,');
    expect(t).toContain('\\;');
    for (const line of t.split('\r\n'))
      expect(line.length).toBeLessThanOrEqual(71);
  });
});
