import { describe, expect, it } from 'vitest';

import { displayName } from './displayName';

describe('displayName', () => {
  it.each([
    ['ALTAVAS STO. NIÑO FESTIVAL', 'Altavas Sto. Niño Festival'],
    ['AKLAN STATE UNIVERSITY(ASU)', 'Aklan State University(ASU)'],
    ['XIX MARTYRS OF AKLAN', 'XIX Martyrs of Aklan'],
    ['NAHAUNANG ATIS (FIRST AETAS)', 'Nahaunang Atis (First Aetas)'],
    ['BATAN ATI-ATI MALAKARA FESTIVAL', 'Batan Ati-Ati Malakara Festival'],
    ['KATUNGGAN IT IBAJAY', 'Katunggan it Ibajay'],
    ['PASCUA SA MALINAO FESTIVAL', 'Pascua sa Malinao Festival'],
    ['JUEZ DE CUCHILLO', 'Juez de Cuchillo'],
    [
      'CLUSTERED CENTURY-OLD ACACIA TREES',
      'Clustered Century-Old Acacia Trees',
    ],
    ['THE JAIME L. SIN MONUMENT', 'The Jaime L. Sin Monument'],
  ])('title-cases ALL CAPS %s', (input, expected) => {
    expect(displayName(input)).toBe(expected);
  });

  it.each([
    'Historical Marker of General Ananias Diokno',
    'Juez De Cuchillo commemoration',
    'Pag-Aeaw-Aeaw',
    'Kalibo Sto. Niño Ati-atihan Festival',
    'ibajay falls',
  ])('leaves mixed-case or lowercase name unchanged: %s', input => {
    expect(displayName(input)).toBe(input);
  });

  it('leaves words that only look like Roman numerals alone', () => {
    expect(displayName('MID')).toBe('Mid');
    expect(displayName('CIVIL')).toBe('Civil');
  });

  it('is idempotent and never returns an empty string for a non-empty name', () => {
    const once = displayName('ISLA KAPISPISAN');
    expect(displayName(once)).toBe(once);
    expect(displayName('123 AND 456')).toBe('123 and 456');
  });
});

describe('workbook names stay verbatim', () => {
  it('displayName leaves every workbook name unchanged', async () => {
    const { default: municipalities } =
      await import('@/data/tourism/municipalities.json');
    const names = (
      municipalities as {
        attractions: { name: string | null; recordId?: string }[];
        festivals: { name: string | null; recordId?: string }[];
        products: { name: string | null; recordId?: string }[];
      }[]
    )
      .flatMap(m => [...m.attractions, ...m.festivals, ...m.products])
      .filter(e => e.recordId && e.name);
    expect(names.length).toBeGreaterThan(0);
    for (const e of names) expect(displayName(e.name!)).toBe(e.name);
  });
});
