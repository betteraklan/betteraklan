import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import municipalities from '@/data/tourism/municipalities.json';
import images from '@/data/tourism/tourism-images.json';

const KEYS = ['alt', 'credit', 'recordId', 'src'];

describe('tourism-images.json', () => {
  it('is a valid array of { recordId, src, alt, credit } entries', () => {
    expect(Array.isArray(images)).toBe(true);
    for (const e of images as Record<string, unknown>[]) {
      expect(Object.keys(e).sort()).toEqual(KEYS);
      expect(e.recordId).toMatch(/^AKL-\d{3}$/);
      expect(e.src).toMatch(/^\/tourism\/AKL-\d{3}\.(jpg|png|webp)$/);
      expect(typeof e.alt).toBe('string');
      expect(typeof e.credit).toBe('string');
    }
  });

  it('points only at live workbook records', () => {
    type Rec = { recordId?: string };
    type Muni = {
      attractions: Rec[];
      festivals: Rec[];
      products: Rec[];
      overview?: Rec;
    };
    // A town overview is live too: its photo is the town page hero.
    const live = new Set(
      (municipalities as Muni[])
        .flatMap(m => [
          ...m.attractions,
          ...m.festivals,
          ...m.products,
          ...(m.overview ? [m.overview] : []),
        ])
        .map(e => e.recordId)
    );
    for (const e of images as { recordId: string }[])
      expect(live.has(e.recordId), e.recordId).toBe(true);
  });

  it('is loadable from disk as plain JSON', () => {
    const raw = readFileSync(
      join(__dirname, '../../data/tourism/tourism-images.json'),
      'utf8'
    );
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});
