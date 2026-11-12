import { describe, expect, it } from 'vitest';

import type { TourismEntry } from '@/types/tourism';

import {
  festivalBuckets,
  filterByDateRange,
  formatDateRange,
  getDateStatus,
  monthsFrom,
  overlaps,
} from './festivalDates';

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

describe('formatDateRange', () => {
  it('formats a single day without shifting by time zone', () => {
    expect(formatDateRange('2027-01-10')).toMatch(/Jan 10, 2027/);
  });

  it('formats a range and collapses an end equal to the start', () => {
    expect(formatDateRange('2027-01-10', '2027-01-16')).toMatch(
      /Jan 10, 2027 – Jan 16, 2027/
    );
    expect(formatDateRange('2027-01-10', '2027-01-10')).not.toContain('–');
  });
});

describe('festival calendar helpers', () => {
  const today = new Date('2027-01-14T03:00:00Z');
  const ev = (
    start: string,
    end?: string,
    status: DateStatus = 'confirmed'
  ) => ({
    dates: { start, end },
    dateStatus: status,
  });

  it('lists twelve months from the current one, across a year end', () => {
    const m = monthsFrom(new Date('2026-11-12T00:00:00Z'));
    expect(m).toHaveLength(12);
    expect(m[0]).toMatchObject({
      key: '2026-11',
      from: '2026-11-01',
      to: '2026-11-30',
    });
    expect(m[2]).toMatchObject({
      key: '2027-01',
      label: 'Jan',
      to: '2027-01-31',
    });
    expect(m[3].to).toBe('2027-02-28');
  });

  it('only counts recorded dates when checking overlap', () => {
    expect(
      overlaps(ev('2027-01-10', '2027-01-16'), '2027-01-01', '2027-01-31')
    ).toBe(true);
    expect(overlaps(ev('2027-03-01'), '2027-01-01', '2027-01-31')).toBe(false);
    expect(
      overlaps(
        { dateStatus: 'unavailable' as const },
        '2027-01-01',
        '2027-12-31'
      )
    ).toBe(false);
  });

  it('sorts festivals into now, this month and upcoming', () => {
    const now = ev('2027-01-10', '2027-01-16');
    const later = ev('2027-01-25', undefined, 'tentative');
    const soon = ev('2027-03-02');
    const far = ev('2027-09-01');
    const b = festivalBuckets([far, soon, later, now], today);
    expect(b.now).toEqual([now]);
    expect(b.thisMonth).toEqual([later]);
    expect(b.upcoming).toEqual([soon]);
  });
});
