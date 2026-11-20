import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import accommodations from '@/data/tourism/accommodations.json';

import AccommodationsPage from './[area]';

// The map is not under test here (and WebGL is unavailable): stub it.
vi.mock('../components/AklanMap3D', () => ({
  default: () => <div data-testid='map' />,
}));

const page = (area: 'boracay' | 'mainland') =>
  render(
    <MemoryRouter initialEntries={[`/tourism/accommodations/${area}`]}>
      <Routes>
        <Route
          path='/tourism/accommodations/:area'
          element={<AccommodationsPage />}
        />
      </Routes>
    </MemoryRouter>
  );

const all = accommodations as { area: string; geocodePrecision: string }[];
const boracay = all.filter(a => a.area === 'boracay');
const mainland = all.filter(a => a.area === 'mainland');
const status = () => screen.getByRole('status').textContent;

describe('accommodations page', () => {
  it('shows the result count and numbered rows', () => {
    page('boracay');
    expect(status()).toBe(
      `Showing ${boracay.length} of ${boracay.length} establishments`
    );
    const list = screen
      .getAllByRole('list')
      .find(l => l.tagName === 'OL' && l.hasAttribute('start'))!;
    expect(list.tagName).toBe('OL');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(20);
    expect(rows[0].textContent).toMatch(/^1\./);
    expect(rows[19].textContent).toMatch(/^20\./);
  });

  it('offers Type and Station chips on Boracay, Type only on the mainland', () => {
    page('boracay');
    expect(screen.getByRole('group', { name: 'Type' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Station' })).toBeTruthy();
  });

  it('has no Station chips on the mainland, but keeps the municipality filter', () => {
    page('mainland');
    expect(screen.queryByRole('group', { name: 'Station' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Type' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Municipality' })).toBeTruthy();
  });

  it('a chip filters the list and Clear filters undoes it', () => {
    page('boracay');
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    const station = screen.getByRole('group', { name: 'Station' });
    const chip = within(station).getByRole('button', { name: /^Station 1/ });
    // Chips read "Station 1 · 60": the number after the dot.
    const n = Number(chip.textContent!.split('·')[1]);
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(status()).toBe(`Showing ${n} of ${boracay.length} establishments`);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(status()).toBe(
      `Showing ${boracay.length} of ${boracay.length} establishments`
    );
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('clicking the chosen chip again clears it', () => {
    page('boracay');
    const type = screen.getByRole('group', { name: 'Type' });
    const chip = within(type).getByRole('button', { name: /^Resort/ });
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(status()).toContain(`of ${boracay.length}`);
  });

  it('combines the name search with chips', () => {
    page('boracay');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search by name' }), {
      target: { value: 'resort' },
    });
    const withSearch = Number(status()!.match(/Showing (\d+)/)![1]);
    expect(withSearch).toBeGreaterThan(0);
    expect(withSearch).toBeLessThan(boracay.length);
    const type = screen.getByRole('group', { name: 'Type' });
    // Names that say two types ("Resort Hotel") are not counted as Resort.
    fireEvent.click(within(type).getByRole('button', { name: /^Resort/ }));
    expect(Number(status()!.match(/Showing (\d+)/)![1])).toBeLessThan(
      withSearch
    );
  });

  it('explains an empty result and offers Clear filters', () => {
    page('boracay');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search by name' }), {
      target: { value: 'zzzzzz' },
    });
    expect(
      screen.getByText('No establishments match these filters.')
    ).toBeTruthy();
    expect(status()).toBe(`Showing 0 of ${boracay.length} establishments`);
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }).length
    ).toBeGreaterThan(0);
  });

  it('keeps Show on map and the Approximate pin badge', () => {
    page('mainland');
    expect(
      screen.getAllByRole('button', { name: /Show on map/ }).length
    ).toBeGreaterThan(0);
    const approx = mainland.filter(a => a.geocodePrecision !== 'exact').length;
    if (approx > 0)
      expect(screen.getAllByText(/Approximate pin/).length).toBeGreaterThan(0);
  });
});

describe('station chips, rows and Load more', () => {
  const list = () =>
    screen
      .getAllByRole('list')
      .find(l => l.tagName === 'OL' && l.hasAttribute('start'))!;
  const rowCount = () => within(list()).getAllByRole('listitem').length;
  // Counted from the published addresses (a "Station N" in the text).
  const stationCount = (n: string) =>
    (accommodations as { area: string; address: string }[]).filter(
      a =>
        a.area === 'boracay' &&
        new RegExp('station\\s*' + n + '\\b', 'i').test(a.address)
    ).length;

  it('station chips read "Station 2 · 70" with counts from the derived field', () => {
    page('boracay');
    const group = screen.getByRole('group', { name: 'Station' });
    for (const n of ['1', '2', '3'])
      expect(
        within(group).getByRole('button', {
          // The dot has non-breaking spaces around it, so match any space.
          name: new RegExp(
            '^Station ' + n + '\\s+·\\s+' + stationCount(n) + '$'
          ),
        })
      ).toBeTruthy();
  });

  it('every row has a Directions link to its coordinates', () => {
    page('boracay');
    for (const row of within(list()).getAllByRole('listitem')) {
      const link = within(row).getByRole('link', { name: /^Directions/ });
      expect(link.getAttribute('href')).toMatch(
        /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+\.\d+,-?\d+\.\d+$/
      );
      expect(link.getAttribute('target')).toBe('_blank');
    }
  });

  it('every row says Exact pin or Approximate pin with the area it sits at', () => {
    page('mainland');
    for (const row of within(list()).getAllByRole('listitem'))
      expect(row.textContent).toMatch(
        /Exact pin|Approximate pin · (barangay|municipality) centre/
      );
    expect(screen.queryByText(/ level$/)).toBeNull();
  });

  it('"Load 20 more" adds rows, keeps the count, and ends when all are shown', () => {
    page('boracay');
    expect(
      screen.getByText(`Showing 1 to 20 of ${boracay.length}`)
    ).toBeTruthy();
    expect(
      screen.queryByRole('navigation', { name: /pagination/i })
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Load 20 more' }));
    expect(rowCount()).toBe(40);
    expect(
      screen.getByText(`Showing 1 to 40 of ${boracay.length}`)
    ).toBeTruthy();
    // Focus lands on the first new row, numbered 21.
    expect(document.activeElement?.textContent).toMatch(/^21./);
    // Narrow to few results: the button goes away and the count is exact.
    fireEvent.change(screen.getByRole('textbox', { name: 'Search by name' }), {
      target: { value: 'hostel' },
    });
    const n = rowCount();
    expect(n).toBeLessThanOrEqual(20);
    expect(screen.getByText(`Showing 1 to ${n} of ${n}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Load/ })).toBeNull();
  });

  it('changing a filter starts again at the first 20', () => {
    page('boracay');
    fireEvent.click(screen.getByRole('button', { name: 'Load 20 more' }));
    expect(rowCount()).toBe(40);
    const type = screen.getByRole('group', { name: 'Type' });
    fireEvent.click(within(type).getByRole('button', { name: /^Resort/ }));
    expect(rowCount()).toBeLessThanOrEqual(20);
  });

  it('the map legend gives each entry a shape and words', () => {
    page('boracay');
    const legend = screen.getByRole('list', { name: 'Map legend' });
    const items = within(legend).getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const item of items.slice(0, 3)) {
      expect(item.querySelector('svg')).not.toBeNull();
      expect(item.textContent).toMatch(/pin|bubble/i);
    }
    expect(legend.textContent).toMatch(/Exact pin/);
    expect(legend.textContent).toMatch(/Approximate pin/);
  });
});
