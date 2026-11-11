import { describe, expect, it } from 'vitest';

import type { TourismEntry } from '@/types/tourism';

import { filterByDateRange, getDateStatus } from './festivalDates';

const plain: TourismEntry = { name: 'No dates', description: '' };
const confirmed: TourismEntry = {
  name: 'Confirmed',
  description: '',
  dates: { status: 'confirmed', start: '2027-01-20', end: '2027-01-22' },
};
const tentative: TourismEntry = {
  name: 'Tentative',
  description: '',
  dates: { status: 'tentative', start: '2027-03-01' },
};

describe('getDateStatus', () => {
  it('treats a missing dates object as unavailable', () => {
    expect(getDateStatus(plain)).toBe('unavailable');
  });
  it('returns the recorded status', () => {
    expect(getDateStatus(confirmed)).toBe('confirmed');
    expect(getDateStatus(tentative)).toBe('tentative');
  });
  it('downgrades confirmed/tentative without a start date to unavailable', () => {
    const e: TourismEntry = {
      name: 'x',
      description: '',
      dates: { status: 'confirmed' },
    };
    expect(getDateStatus(e)).toBe('unavailable');
  });
});

describe('filterByDateRange', () => {
  const all = [plain, confirmed, tentative];

  it('returns everything when no range is set', () => {
    expect(filterByDateRange(all)).toHaveLength(3);
  });
  it('keeps records with unavailable dates even when a range is active', () => {
    const out = filterByDateRange(all, '2030-01-01', '2030-12-31');
    expect(out).toEqual([plain]);
  });
  it('keeps dated records that overlap the range, inclusive', () => {
    expect(filterByDateRange(all, '2027-01-22', '2027-01-22')).toEqual([
      plain,
      confirmed,
    ]);
    expect(filterByDateRange(all, '2027-03-01')).toEqual([plain, tentative]);
  });
  it('drops dated records that fall outside the range', () => {
    expect(filterByDateRange(all, '2027-02-01', '2027-02-28')).toEqual([plain]);
  });
});
