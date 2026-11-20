import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import accommodations from '@/data/tourism/accommodations.json';
import municipalities from '@/data/tourism/municipalities.json';
import resorts from '@/data/tourism/resorts.json';

import { ALL_RECORDS, pickSpread } from './components/tourismData';
import TourismIndex from './index';

function Where() {
  const l = useLocation();
  return <p data-testid='where'>{l.pathname + l.search}</p>;
}
const page = () =>
  render(
    <MemoryRouter initialEntries={['/tourism']}>
      <Routes>
        <Route path='/tourism' element={<TourismIndex />} />
        <Route path='*' element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const festivals = ALL_RECORDS.filter(r => r.layer === 'event').length;

describe('Tourism Overview', () => {
  it('keeps every existing section', () => {
    page();
    expect(screen.getByText('Featured Highlights')).toBeTruthy();
    expect(screen.getByText('Explore by Municipality')).toBeTruthy();
    expect(
      screen
        .getByRole('link', {
          name: /Aklan Provincial Government Tourism pages/,
        })
        .getAttribute('href')
    ).toBe('https://aklan.gov.ph/tourism/');
    // Featured Highlights still lists every resort, and every municipality is linked.
    for (const r of resorts)
      expect(screen.getAllByText(r.name).length).toBeGreaterThan(0);
    for (const m of municipalities)
      expect(
        screen.getByRole('link', { name: `Explore tourism in ${m.name}` })
      ).toBeTruthy();
  });

  it('computes tile counts from the JSON files', () => {
    page();
    expect(
      screen.getByText(
        `${accommodations.length} places to stay in Boracay and the mainland`
      )
    ).toBeTruthy();
    expect(
      screen.getByText(`${festivals} festivals through the year`)
    ).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`^${ALL_RECORDS.length} BetterAklan records`))
    ).toBeTruthy();
  });

  it('links Help while travelling to the existing hotlines site', () => {
    page();
    const help = screen.getByRole('link', { name: /Help while travelling/ });
    expect(help.getAttribute('href')).toMatch(
      /^https:\/\/hotlines\.bettergov\.ph\/\?city=/
    );
    expect(help.getAttribute('target')).toBe('_blank');
    expect(screen.queryByText(/Getting here/i)).toBeNull();
  });

  it('category tabs switch and deep-link into Explore', () => {
    page();
    const tablist = screen.getByRole('tablist', { name: 'Kinds of places' });
    const products = within(tablist).getByRole('tab', {
      name: /Local products/,
    });
    fireEvent.click(products);
    expect(products.getAttribute('aria-selected')).toBe('true');
    const all = screen.getByRole('link', {
      name: /See all \d+ local products in Explore/,
    });
    expect(all.getAttribute('href')).toBe(
      '/tourism/explore?layer=product&view=list'
    );
  });

  it('arrow keys move between category tabs', () => {
    page();
    const tablist = screen.getByRole('tablist', { name: 'Kinds of places' });
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    const festivalsTab = within(tablist).getByRole('tab', {
      name: /Festivals/,
    });
    expect(festivalsTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(festivalsTab);
  });

  it('shows Festivals through the year and the map teaser', () => {
    page();
    expect(
      screen.getByRole('heading', { name: 'Festivals through the year' })
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Open the map' }).getAttribute('href')
    ).toBe('/tourism/explore?view=map');
  });

  it('pressing Enter in search opens Explore with the query', () => {
    page();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'falls' } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByTestId('where').textContent).toBe(
      '/tourism/explore?q=falls&view=list'
    );
  });
});

describe('pickSpread', () => {
  it('takes at most one record per town, up to six', () => {
    const picks = pickSpread(ALL_RECORDS, 'place');
    expect(picks.length).toBeLessThanOrEqual(6);
    expect(new Set(picks.map(p => p.town)).size).toBe(picks.length);
    expect(picks.every(p => p.layer === 'place')).toBe(true);
  });
});
