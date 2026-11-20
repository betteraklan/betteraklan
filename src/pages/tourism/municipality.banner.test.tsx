import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRIP_KEY } from '@/lib/tourism/tripStore';

import TourismMunicipalityDetail from './[municipality]';

const state = vi.hoisted(() => ({
  advisories: [] as unknown[],
  status: 'live' as 'live' | 'fallback' | 'loading',
}));

vi.mock('@/lib/tourism/advisories', () => ({
  useAdvisories: () => ({ advisories: state.advisories, status: state.status }),
  advisoriesFor: (
    slug: string,
    list: { affects: { municipality?: string } }[]
  ) => list.filter(a => a.affects.municipality === slug),
}));
vi.mock('@/data/tourism/municipalities.json', () => ({
  default: [
    {
      slug: 'altavas',
      name: 'Altavas',
      festivals: [
        {
          name: 'Pag-Aeaw-Aeaw',
          description: 'First sentence. Second sentence stays visible.',
          recordId: 'AKL-9',
          location: 'Poblacion',
        },
      ],
      attractions: [{ name: null, description: 'A free-text paragraph.' }],
      products: [],
    },
  ],
}));

const NOTICE = {
  id: 'n1',
  kind: 'closure',
  title: 'Falls trail closed',
  summary: 'Closed for repairs.',
  affects: { municipality: 'altavas' },
  issuer: 'MDRRMO Altavas',
  sourceUrl: 'https://example.test/notice',
  publishedAt: '2026-11-01',
};

const page = () =>
  render(
    <MemoryRouter initialEntries={['/tourism/altavas']}>
      <Routes>
        <Route
          path='/tourism/:municipality'
          element={<TourismMunicipalityDetail />}
        />
      </Routes>
    </MemoryRouter>
  );

describe('town page notices banner', () => {
  beforeEach(() => {
    state.advisories = [];
    state.status = 'live';
    localStorage.clear();
  });

  it('shows no banner when there are no notices', () => {
    page();
    expect(screen.queryByRole('region', { name: /Notices for/ })).toBeNull();
    expect(screen.queryByText(/Live notices couldn/)).toBeNull();
  });

  it('shows the banner at the top when a notice affects the town', () => {
    state.advisories = [NOTICE];
    page();
    const banner = screen.getByRole('region', { name: 'Notices for Altavas' });
    expect(within(banner).getByText('Falls trail closed')).toBeTruthy();
    expect(within(banner).getByText('Closed for repairs.')).toBeTruthy();
    const hero = screen.getByRole('heading', { level: 1, name: 'Altavas' });
    // The banner comes before the hero in the page.
    expect(
      banner.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('ignores notices for other towns', () => {
    state.advisories = [{ ...NOTICE, affects: { municipality: 'kalibo' } }];
    page();
    expect(screen.queryByRole('region', { name: /Notices for/ })).toBeNull();
  });

  it('keeps the fallback message when live notices fail', () => {
    state.status = 'fallback';
    page();
    expect(
      screen.getByText(
        'Live notices couldn’t be loaded. Showing the last published list.'
      )
    ).toBeTruthy();
  });
});

describe('town page records', () => {
  beforeEach(() => localStorage.clear());

  it('shows the full description, location, date status and last checked', () => {
    page();
    expect(
      screen.getByText('First sentence. Second sentence stays visible.')
    ).toBeTruthy();
    expect(screen.getByText('Location/barangay: Poblacion')).toBeTruthy();
    expect(screen.getByText('Last checked: Not recorded')).toBeTruthy();
    expect(screen.getByText('Date not recorded')).toBeTruthy();
  });

  it('links See on map to Explore with the town and record', () => {
    page();
    expect(
      screen.getByRole('link', { name: /See on map/ }).getAttribute('href')
    ).toBe('/tourism/explore?town=altavas&sel=event-altavas-0');
  });

  it('keeps nameless paragraphs', () => {
    page();
    expect(screen.getByText('A free-text paragraph.')).toBeTruthy();
  });

  it('in-page tabs are real anchors to the sections', () => {
    page();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const link = within(nav).getByRole('link', { name: /Festivals & Events/ });
    expect(link.getAttribute('href')).toBe('#festivals');
    expect(document.getElementById('festivals')).not.toBeNull();
  });

  it('Save to trip stores the stop and offers it in Explore', () => {
    page();
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Pag-Aeaw-Aeaw to my trip' })
    );
    expect(localStorage.getItem(TRIP_KEY)).toBe('event-altavas-0');
    expect(screen.getByRole('status').textContent).toBe(
      'Added Pag-Aeaw-Aeaw to My trip.'
    );
    expect(
      screen.getByRole('link', { name: /My trip: 1 stop/ }).getAttribute('href')
    ).toBe('/tourism/explore?trip=event-altavas-0');
  });
});
