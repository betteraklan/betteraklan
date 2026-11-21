import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import manifest from '@/data/tourism/tourism-images.json';
import municipalities from '@/data/tourism/municipalities.json';
import reconciliation from '@/data/tourism/workbook-reconciliation.json';

import {
  exportWebp,
  pruneOwnedFiles,
  smallSrc,
} from '../../../scripts/data-prep/fetch-tourism-images.mjs';
import TourismMunicipalityDetail from './[municipality]';

vi.mock('@/lib/tourism/advisories', () => ({
  useAdvisories: () => ({ advisories: [], status: 'live' }),
  advisoriesFor: () => [],
}));
vi.mock('@/lib/weather', () => ({
  fetchWeatherForCity: () => Promise.resolve(null),
}));

const PUBLIC = join(process.cwd(), 'public');
const DOCUMENTED =
  /public domain|\bCC[ -]BY(-SA)?[ -][234]\.0\b|creative commons attribution/i;
type Row = {
  recordId: string;
  image: { verdict: string; row: Record<string, string> };
};
const rows = (reconciliation as { records: Row[] }).records;

describe('tourism-images.json', () => {
  it('lists only photos with a documented licence that passed the image rules', () => {
    expect(manifest.length).toBeGreaterThan(0);
    for (const m of manifest) {
      expect(m.credit).toMatch(DOCUMENTED);
      expect(rows.find(r => r.recordId === m.recordId)!.image.verdict).toBe(
        'pass'
      );
    }
  });

  it('has a 1200 and a 600 px WebP for every entry, and no other photo files', () => {
    for (const m of manifest) {
      expect(m.src).toMatch(/^\/tourism\/AKL-\d{3}\.webp$/);
      expect(existsSync(join(PUBLIC, m.src))).toBe(true);
      expect(existsSync(join(PUBLIC, smallSrc(m.src)))).toBe(true);
    }
    const files = readdirSync(join(PUBLIC, 'tourism')).sort();
    expect(files).toEqual(
      manifest
        .flatMap(m => [m.src, smallSrc(m.src)])
        .map(s => s.split('/').pop())
        .sort()
    );
  });

  it('WebP files are at most 1200 and 600 px wide', () => {
    const width = (p: string) => {
      const b = readFileSync(join(PUBLIC, p));
      const chunk = b.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return 1 + b.readUIntLE(24, 3);
      if (chunk === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
      return (b.readUInt32LE(21) & 0x3fff) + 1;
    };
    for (const m of manifest) {
      expect(width(m.src)).toBeLessThanOrEqual(1200);
      expect(width(smallSrc(m.src))).toBeLessThanOrEqual(600);
    }
  });
});

describe('export and pruning', () => {
  it('exports both widths without enlarging, and prune keeps both', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'webp-'));
    const sharp = (await import('sharp')).default;
    const png = await sharp({
      create: { width: 800, height: 500, channels: 3, background: '#808080' },
    })
      .png()
      .toBuffer();
    const out = await exportWebp(png, dir, 'AKL-999');
    expect(out[1200]).toMatchObject({ file: 'AKL-999.webp', width: 800 });
    expect(out[600]).toMatchObject({ file: 'AKL-999-600.webp', width: 600 });
    expect(
      pruneOwnedFiles(dir, [
        { recordId: 'AKL-999', src: '/tourism/AKL-999.webp' },
      ])
    ).toEqual([]);
    expect(pruneOwnedFiles(dir, [])).toEqual([
      'AKL-999-600.webp',
      'AKL-999.webp',
    ]);
  });
});

const page = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/tourism/${slug}`]}>
      <Routes>
        <Route
          path='/tourism/:municipality'
          element={<TourismMunicipalityDetail />}
        />
      </Routes>
    </MemoryRouter>
  );
const hero = () =>
  screen.getByRole('heading', { level: 1 }).closest('section')!;

describe('town heroes', () => {
  const withPhoto = municipalities.filter(m => m.overview?.image);

  it('every hero photo is the town overview photo from the manifest', () => {
    expect(withPhoto.map(m => m.slug).sort()).toEqual([
      'altavas',
      'buruanga',
      'kalibo',
      'new-washington',
    ]);
    for (const m of withPhoto)
      expect(manifest.map(f => f.recordId)).toContain(m.overview!.recordId);
  });

  it('shows the photo with both widths and its credit visible', () => {
    page('kalibo');
    const h = hero();
    expect(h.getAttribute('data-town')).toBe('');
    const img = h.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/tourism/AKL-082.webp');
    expect(img.getAttribute('srcset')).toBe(
      '/tourism/AKL-082-600.webp 600w, /tourism/AKL-082.webp 1200w'
    );
    expect(img.getAttribute('alt')).toBe('Kalibo municipal overview, Kalibo');
    expect(within(h).getByText(/Photo: Elmer B. Domingo/)).toBeTruthy();
    expect(
      within(h).getByRole('link', { name: /CC BY-SA 4.0 licence/ })
    ).toBeTruthy();
  });

  it('keeps the gradient when a town has no licensed photo', () => {
    page('balete');
    const backdrop = hero().querySelector('[data-hero-backdrop]')!;
    expect(backdrop.getAttribute('data-hero-backdrop')).toBe('gradient');
    expect(hero().querySelector('img')).toBeNull();
  });
});
