import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import municipalities from '@/data/tourism/municipalities.json';
import snapshot from '@/data/tourism/id-snapshot.json';
import type { MunicipalityTourism } from '@/types/tourism';

import { buildRecords } from './explore';
import { parseTrip } from './trip';

const DATA = join(__dirname, '../../data/tourism');
const readJson = <T>(file: string, fallback: T): T =>
  existsSync(join(DATA, file))
    ? (JSON.parse(readFileSync(join(DATA, file), 'utf8')) as T)
    : fallback;

const recs = buildRecords({
  municipalities: municipalities as MunicipalityTourism[],
  resorts: [],
  accommodations: [],
  centroids: [],
  boundaries: [],
});
const byId = new Map(recs.map(r => [r.id, r]));
const recon = readJson<{
  records: { recordId: string; siteId: string | null; status: string }[];
}>('workbook-reconciliation.json', { records: [] });
const slots = readJson<
  Record<string, { municipality: string; array: string; index: number }>
>('workbook-slots.json', {});
const PREFIX: Record<string, string> = {
  attractions: 'place',
  festivals: 'event',
  products: 'product',
};

// The record that may take over a site entry's slot: an exact match or an
// owner-approved replace, both listed in the reconciliation file.
const successor = (siteId: string) =>
  recon.records.find(
    r => r.siteId === siteId && ['exact', 'twin-replace'].includes(r.status)
  )?.recordId;

describe('shared links after the workbook import', () => {
  it('every pre-import id still resolves to the same entity', () => {
    for (const { id, name } of snapshot.ids) {
      const r = byId.get(id);
      expect(r, id).toBeDefined();
      if (r!.name !== name) expect(r!.recordId, id).toBe(successor(id));
    }
  });

  it('every appended workbook record keeps its saved slot', () => {
    for (const [recordId, s] of Object.entries(slots))
      expect(
        byId.get(`${PREFIX[s.array]}-${s.municipality}-${s.index}`)?.recordId
      ).toBe(recordId);
  });

  it('a mixed legacy and new trip link keeps its stops in order', () => {
    const ids = [
      snapshot.ids[0].id,
      ...Object.values(slots)
        .slice(0, 2)
        .map(s => `${PREFIX[s.array]}-${s.municipality}-${s.index}`),
      snapshot.ids[5].id,
    ];
    expect(parseTrip(ids.join(','), new Set(byId.keys()))).toEqual(ids);
  });
});
