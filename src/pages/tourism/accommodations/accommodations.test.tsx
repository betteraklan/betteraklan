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
    const n = Number(chip.textContent!.replace('Station 1', ''));
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
