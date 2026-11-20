import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import municipalities from '@/data/tourism/municipalities.json';

import { CATEGORIES, categoryOf, leadSentence } from './category';

type Entry = { name: string | null; description: string; recordId?: string };

// Every named attraction in the data, with its town.
const places = municipalities.flatMap(m =>
  (m.attractions as Entry[])
    .filter(e => e.name)
    .map(e => ({ ...e, name: e.name!, town: m.slug, townName: m.name }))
);
const find = (town: string, name: string) => {
  const p = places.find(x => x.town === town && x.name === name);
  if (!p) throw new Error(`${town}: no attraction named "${name}" in the data`);
  return p;
};
const cat = (town: string, name: string) =>
  categoryOf({ ...find(town, name), layer: 'place' });

describe('categoryOf: real records from the data', () => {
  it.each([
    ['batan', 'Mambuquiao Beach', 'Beach'],
    ['malay', 'White Beach', 'Beach'],
    ['malay', 'Boracay Island', 'Beach'], // no keyword in the name; its description names its beaches
    ['tangalan', 'Jawili Falls', 'Falls'],
    ['libacao', 'WATER FALLS', 'Falls'],
    ['malay', 'Agnaga mini falls and cold spring', 'Falls'],
    ['altavas', 'Kipot Cave', 'Cave'],
    ['malay', 'Bat Caves', 'Cave'],
    ['kalibo', 'Tigayon Hill and caves', 'Cave'], // a cave, not only a hill
    ['kalibo', 'Kalibo Cathedral', 'Culture'],
    ['batan', 'Kalantiaw Shrine', 'Culture'],
    ['kalibo', 'Museo it Akean', 'Culture'],
    ['altavas', 'HISTORICAL MARKER OF GENERAL ANANIAS DIOKNO', 'Culture'],
    ['kalibo', 'Bakhawan Eco-Park', 'Nature'],
    ['batan', 'Ob-Ob Hill', 'Nature'],
    ['libacao', 'Mt. Nausan and Mt. Nangtud', 'Nature'],
    ['malay', 'Naasug Point', 'Nature'], // named a cliff in its description
    ['numancia', 'CLUSTERED CENTURY-OLD ACACIA TREES', 'Nature'],
    // Not clear from the text: left for a person, not guessed.
    ['altavas', 'Tinagong Dagat', 'Other'], // mangroves and rocky beaches in one sentence
    ['numancia', 'NAHAUNANG ATIS (FIRST AETAS)', 'Other'], // a village by a river
    ['madalag', 'HANGING BRIDGE', 'Other'],
    ['balete', 'Basura Garden', 'Other'],
    ['lezo', 'Pottery workshops', 'Other'],
    ['makato', 'Aklan State University Makato Annex', 'Other'],
  ])('%s: %s is %s', (town, name, expected) => {
    expect(cat(town, name)).toBe(expected);
  });

  it('classes every attraction as one of the six categories', () => {
    for (const p of places)
      expect(CATEGORIES).toContain(categoryOf({ ...p, layer: 'place' }));
    expect(places.length).toBeGreaterThan(100);
  });

  it('uses all of Beach, Falls, Cave, Culture, Nature and Other on the real data', () => {
    const seen = new Set(places.map(p => categoryOf({ ...p, layer: 'place' })));
    expect([...seen].sort()).toEqual([...CATEGORIES].sort());
  });
});

describe('categoryOf: rules', () => {
  const rec = (
    name: string,
    description = '',
    layer?: 'place' | 'event' | 'stay' | 'product'
  ) => ({
    name,
    description,
    layer,
  });

  it('a name decides before the description', () => {
    // The description mentions a beach, but the name is a church.
    expect(
      categoryOf(rec('Saint Peter Church', 'Near the beach.', 'place'))
    ).toBe('Culture');
  });

  it('a first sentence that names two categories is left as Other', () => {
    expect(
      categoryOf(
        rec(
          'Hidden Lagoon',
          'Fringed with thick mangroves and rocky beaches.',
          'place'
        )
      )
    ).toBe('Other');
    // One category in the sentence still decides.
    expect(
      categoryOf(rec('Hidden Lagoon', 'Fringed with thick mangroves.', 'place'))
    ).toBe('Nature');
  });

  it('a passing mention after the first sentence does not decide', () => {
    expect(
      categoryOf(
        rec(
          'Old Plantation',
          'A private farm. Visitors can walk to the beach nearby.',
          'place'
        )
      )
    ).toBe('Other');
  });

  it('festivals are Culture; products and stays have no category', () => {
    expect(
      categoryOf(rec('Kalibo Food Festival', 'June 12 to 23', 'event'))
    ).toBe('Culture');
    expect(categoryOf(rec('Piña textiles', 'Woven cloth.', 'product'))).toBe(
      'Other'
    );
    expect(
      categoryOf(rec('Sea View Beach Resort', 'Beachfront.', 'stay'))
    ).toBe('Other');
  });

  it('matches whole words only', () => {
    expect(categoryOf(rec('Cavendish Farm', '', 'place'))).toBe('Other');
    expect(categoryOf(rec('Fallsworth Hall', '', 'place'))).toBe('Other');
  });

  it('a name of null with no description is Other, not an error', () => {
    expect(categoryOf({ name: null, description: '', layer: 'place' })).toBe(
      'Other'
    );
  });
});

describe('leadSentence', () => {
  it('does not stop at abbreviations', () => {
    expect(
      leadSentence(
        '8 kms. in length and 4 kms. wide, it is a lake. Next sentence.'
      )
    ).toBe('8 kms. in length and 4 kms. wide, it is a lake.');
    expect(leadSentence('Climb Mt. Nausan at dawn. Bring water.')).toBe(
      'Climb Mt. Nausan at dawn.'
    );
    expect(leadSentence('Brgy. Libang has falls. It is high.')).toBe(
      'Brgy. Libang has falls.'
    );
  });

  it('returns the whole text when there is one sentence', () => {
    expect(leadSentence('A single sentence')).toBe('A single sentence');
    expect(leadSentence('')).toBe('');
  });
});

describe('the data is never written', () => {
  it('categoryOf leaves its input and the JSON exactly as they were', () => {
    const before = JSON.stringify(municipalities);
    for (const p of places) {
      const frozen = Object.freeze({ ...p, layer: 'place' as const });
      categoryOf(frozen); // would throw if it tried to change a frozen record
    }
    expect(JSON.stringify(municipalities)).toBe(before);
    expect(JSON.stringify(municipalities)).not.toMatch(/"category"/);
  });
});

describe('the "Other" review list', () => {
  const doc = readFileSync(
    join(__dirname, '../../../docs/tourism-category-review.md'),
    'utf8'
  );
  const other = places.filter(
    p => categoryOf({ ...p, layer: 'place' }) === 'Other'
  );

  it('is up to date: it lists every place currently classed Other', () => {
    expect(doc).toContain(`## Other (${other.length})`);
    for (const p of other) expect(doc).toContain(p.name);
  });

  it('lists nothing that has since been classed', () => {
    const listed = doc
      .split('\n')
      .filter(
        l =>
          l.startsWith('| ') &&
          !l.startsWith('| Record') &&
          !l.startsWith('| ---')
      );
    expect(listed).toHaveLength(other.length);
  });
});
