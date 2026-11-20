import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { dateTile, parseFestivalDate } from '@/lib/tourism/festivalDateText';
import { config } from '@/lib/lguConfig';

import municipalities from '@/data/tourism/municipalities.json';

import TourismMunicipalityDetail from './[municipality]';
import { spotsOnMap } from './components/tourismData';

vi.mock('@/lib/tourism/advisories', () => ({
  useAdvisories: () => ({ advisories: [], status: 'live' }),
  advisoriesFor: () => [],
}));
vi.mock('@/lib/weather', () => ({
  fetchWeatherForCity: () => Promise.resolve(null),
}));

const page = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path='/tourism/:municipality'
          element={<TourismMunicipalityDetail />}
        />
      </Routes>
    </MemoryRouter>
  );

const town = (slug: string) => municipalities.find(m => m.slug === slug)!;
const spotsList = () => document.getElementById('attractions-list')!;
const spotCards = () =>
  within(spotsList())
    .queryAllByRole('article')
    .filter(a => within(a).queryByRole('heading'));

describe('dateTile', () => {
  const tile = (s: string) => dateTile(parseFestivalDate(s));

  it('reads real festival dates from the data', () => {
    const malayDay = town('malay').festivals.find(f => f.name === 'Malay Day')!;
    expect(tile(malayDay.description)).toMatchObject({
      top: 'JUN',
      bottom: '15',
    });
    const food = town('kalibo').festivals.find(
      f => f.name === 'Kalibo Food Festival'
    )!;
    expect(tile(food.description)).toMatchObject({
      top: 'JUN',
      bottom: '12–23',
    });
    const ati = town('kalibo').festivals.find(f =>
      f.name?.includes('ATI-ATIHAN')
    )!;
    expect(tile(ati.description)).toMatchObject({
      top: 'JAN',
      bottom: '3RD SUN',
    });
  });

  it('is DATE TBC when the data gives no date or a hedged one', () => {
    const obreros = town('malay').festivals.find(
      f => f.name === 'Fiesta de Obreros'
    )!;
    expect(tile(obreros.description)).toMatchObject({
      top: 'DATE',
      bottom: 'TBC',
    });
    // "as early as December 15" and "February and October" are not dates.
    expect(tile('Starts as early as December 15.').bottom).toBe('TBC');
    expect(tile('Reported in February and October.').bottom).toBe('TBC');
  });

  it('gives screen readers the phrase as written', () => {
    expect(tile('Held every June 15 in Malay.').label).toBe(
      'Date: every June 15'
    );
    expect(tile('No date here.').label).toBe('Date to be confirmed');
  });
});

describe('town page finish (Malay)', () => {
  it('shows a date tile on every festival card', () => {
    page('/tourism/malay');
    const festivals = document.getElementById('festivals')!;
    expect(within(festivals).getByText('Date: every June 15')).toBeTruthy();
    expect(within(festivals).getByText('Date to be confirmed')).toBeTruthy();
  });

  it('collapses a long spot list behind "Show all N spots"', () => {
    page('/tourism/malay');
    const named = town('malay').attractions.filter(a => a.name).length;
    expect(named).toBeGreaterThan(8);
    expect(spotCards()).toHaveLength(8);

    const more = screen.getByRole('button', {
      name: `Show all ${named} spots`,
    });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(more.getAttribute('aria-controls')).toBe('attractions-list');

    fireEvent.click(more);
    expect(spotCards()).toHaveLength(named);
    const fewer = screen.getByRole('button', { name: 'Show fewer spots' });
    expect(fewer.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(fewer);
    expect(spotCards()).toHaveLength(8);
  });

  it('does not collapse a short list or a category filter', () => {
    page('/tourism/kalibo');
    expect(screen.queryByRole('button', { name: /^Show all/ })).toBeNull();
  });

  it('has a mini-map card counting the spots and opening Explore', () => {
    // Malay's own 13 spots, not the featured highlights Explore also pins there.
    expect(spotsOnMap('malay')).toBe(
      town('malay').attractions.filter(a => a.name).length
    );
    page('/tourism/malay');
    const card = screen
      .getByRole('heading', { name: /spots on the map$/ })
      .closest('section')!;
    expect(
      within(card).getByRole('heading', {
        name: `${spotsOnMap('malay')} spots on the map`,
      })
    ).toBeTruthy();
    expect(
      within(card)
        .getByRole('link', { name: 'Open map of Malay' })
        .getAttribute('href')
    ).toBe('/tourism/explore?town=malay');
  });

  it('links to more events, naming the provincial page while no town site is recorded', () => {
    page('/tourism/malay');
    const link = screen.getByRole('link', { name: /^More events on/ });
    // The directory has no website for Malay yet, so the link must not claim one.
    expect(link.textContent).toContain(
      'More events on the Aklan Provincial Tourism page for Malay'
    );
    expect(link.getAttribute('href')).toBe(
      'https://aklan.gov.ph/tourism/malay/'
    );
  });

  it('has a Suggest a fix link that names the page', () => {
    page('/tourism/malay');
    expect(screen.getByText(/Spotted a mistake\?/)).toBeTruthy();
    const href = screen
      .getByRole('link', { name: /Suggest a fix/ })
      .getAttribute('href')!;
    expect(href.startsWith(`${config.portal.githubUrl}/issues/new?`)).toBe(
      true
    );
    const q = new URL(href).searchParams;
    expect(q.get('title')).toBe('Tourism fix: Malay');
    expect(q.get('body')).toContain('Page: /tourism/malay');
  });

  it('keeps the source note and prev/next links', () => {
    page('/tourism/malay');
    expect(
      screen.getByRole('link', {
        name: /Aklan Provincial Government Tourism page for Malay/,
      })
    ).toBeTruthy();
    const i = municipalities.findIndex(m => m.slug === 'malay');
    const prev = municipalities[i - 1];
    const next = municipalities[i + 1];
    expect(
      screen.getByRole('link', { name: prev.name }).getAttribute('href')
    ).toBe(`/tourism/${prev.slug}`);
    expect(
      screen.getByRole('link', { name: next.name }).getAttribute('href')
    ).toBe(`/tourism/${next.slug}`);
  });
});
