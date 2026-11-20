import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import accommodations from '@/data/tourism/accommodations.json';
import { groupStays } from '@/lib/tourism/accommodations';
import { TRIP_KEY } from '@/lib/tourism/tripStore';

import AccommodationsPage from './[area]';

// WebGL is not available here: a stub draws each pin as a button.
vi.mock('../components/AklanMap3D', () => ({
  default: ({
    pins,
    onPin,
  }: {
    pins: { id: string; name: string }[];
    onPin: (id: string) => void;
  }) => (
    <div data-testid='map'>
      {pins.map(p => (
        <button key={p.id} type='button' onClick={() => onPin(p.id)}>
          pin {p.name}
        </button>
      ))}
    </div>
  ),
}));

const page = () =>
  render(
    <MemoryRouter initialEntries={['/tourism/accommodations/boracay']}>
      <Routes>
        <Route
          path='/tourism/accommodations/:area'
          element={<AccommodationsPage />}
        />
      </Routes>
    </MemoryRouter>
  );

type Row = {
  name: string;
  area: string;
  lat: number | null;
  lon: number | null;
};
const rows = (accommodations as Row[]).map((a, i) => ({
  ...a,
  id: `stay-${i}`,
}));
const boracay = rows.filter(
  (a): a is typeof a & { lat: number; lon: number } =>
    a.area === 'boracay' && a.lat != null && a.lon != null
);
const groups = groupStays(boracay);
const shared = groups.find(g => g.items.length > 1)!;

describe('accommodations map (MapLibre)', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('draws one pin per coordinate, not one per establishment', () => {
    page();
    const map = screen.getByTestId('map');
    expect(within(map).getAllByRole('button')).toHaveLength(groups.length);
    expect(groups.length).toBeLessThan(boracay.length);
  });

  it('a shared pin lists every establishment at that coordinate', () => {
    page();
    fireEvent.click(
      within(screen.getByTestId('map')).getByRole('button', {
        name: `pin ${shared.items.length} establishments`,
      })
    );
    const panel = screen.getByRole('region', {
      name: `${shared.items.length} establishments at this pin`,
    });
    for (const s of shared.items)
      expect(within(panel).getAllByText(s.name).length).toBeGreaterThan(0);
    expect(
      within(panel)
        .getByRole('link', { name: /Open this area in Google Maps/ })
        .getAttribute('href')
    ).toBe(
      `https://www.google.com/maps/search/?api=1&query=${shared.lat},${shared.lon}`
    );
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: /at this pin/ })).toBeNull();
  });

  it('Show on map opens the pin for that establishment', () => {
    page();
    const list = screen
      .getAllByRole('list')
      .find(l => l.tagName === 'OL' && l.hasAttribute('start'))!;
    const first = within(list).getAllByRole('listitem')[0];
    const name = first.querySelector('h3')!.textContent!;
    fireEvent.click(within(first).getByRole('button', { name: /Show on map/ }));
    const g = groups.find(x => x.items.some(p => p.name === name))!;
    const heading =
      g.items.length === 1
        ? name
        : `${g.items.length} establishments at this pin`;
    expect(screen.getByRole('region', { name: heading })).toBeTruthy();
  });

  it('Save to trip stores the stay id and links to the trip in Explore', () => {
    page();
    const list = screen
      .getAllByRole('list')
      .find(l => l.tagName === 'OL' && l.hasAttribute('start'))!;
    const first = within(list).getAllByRole('listitem')[0];
    const name = first.querySelector('h3')!.textContent!;
    const id = boracay.find(a => a.name === name)!.id;
    const save = within(first).getByRole('button', {
      name: `Save ${name} to my trip`,
    });
    fireEvent.click(save);
    expect(localStorage.getItem(TRIP_KEY)).toBe(id);
    expect(save.getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole('link', { name: /My trip: 1 stop/ }).getAttribute('href')
    ).toBe(`/tourism/explore?trip=${id}`);
  });
});
