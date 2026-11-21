import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { displayName } from '@/lib/tourism/displayName';
import { filterRecords, monthsBetween } from '@/lib/tourism/explore';
import { monthRange } from '@/lib/tourism/festivalDateText';

import { ALL_RECORDS } from './components/tourismData';
import AccommodationsPage from './accommodations/[area]';
import TourismExplore from './explore';
import TourismIndex from './index';
import TourismMunicipalityDetail from './[municipality]';

// WebGL is unavailable here; the map itself is not under test.
vi.mock('./components/AklanMap3D', () => ({
  default: () => <div data-testid='map' />,
}));
vi.mock('@/lib/tourism/advisories', () => ({
  useAdvisories: () => ({ advisories: [], status: 'live' }),
  advisoriesFor: () => [],
}));
vi.mock('@/lib/weather', () => ({
  fetchWeatherForCity: () => Promise.resolve(null),
}));

// Live feeds (flights) are not under test; fail them quietly.
vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

function Where() {
  const l = useLocation();
  return <p data-testid='where'>{l.pathname + l.search}</p>;
}
const where = () => screen.getByTestId('where').textContent!;

const app = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path='/tourism' element={<TourismIndex />} />
        <Route path='/tourism/explore' element={<TourismExplore />} />
        <Route
          path='/tourism/accommodations/:area'
          element={<AccommodationsPage />}
        />
        <Route
          path='/tourism/:municipality'
          element={<TourismMunicipalityDetail />}
        />
      </Routes>
      <Where />
    </MemoryRouter>
  );

/** The selected-record panel in Explore names the record in an h2. */
const selectedName = () =>
  screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);

describe('month ranges for festival links', () => {
  it('takes the next occurrence of the month, whole month', () => {
    const today = new Date(2026, 10, 21); // 21 Nov 2026
    expect(monthRange(6, today)).toEqual({
      from: '2027-06-01',
      to: '2027-06-30',
    });
    expect(monthRange(11, today)).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
    expect(monthRange(2, new Date(2027, 0, 5)).to).toBe('2027-02-28');
    expect(monthRange(2, new Date(2028, 0, 5)).to).toBe('2028-02-29');
  });

  it('lists the months a range touches, or null for a year or open end', () => {
    expect([...monthsBetween('2027-06-01', '2027-06-30')!]).toEqual([6]);
    expect([...monthsBetween('2026-12-15', '2027-01-10')!]).toEqual([12, 1]);
    expect(monthsBetween('2027-01-01', '2027-12-31')).toBeNull();
    expect(monthsBetween('2027-01-01', undefined)).toBeNull();
  });

  it('a June range keeps the June festivals the descriptions name, and the undated', () => {
    const june = filterRecords(ALL_RECORDS, {
      q: '',
      town: '',
      layer: 'event',
      ...monthRange(6, new Date(2026, 10, 21)),
    }).map(r => r.name);
    expect(june).toContain('Malay Day'); // "every June 15"
    expect(june).toContain('Kalibo Food Festival'); // "June 12 to 23"
    expect(june).not.toContain('KALIBO STO. NIÑO ATI-ATIHAN FESTIVAL'); // January
    expect(june).not.toContain('Bayangan Festival'); // July 6
    expect(june).toContain('Fiesta de Obreros'); // no date given: kept
  });
});

describe('links into Explore open the right view', () => {
  it('a town page spot card: See on map selects that spot in its town', () => {
    app('/tourism/malay');
    const card = screen
      .getAllByRole('article')
      .find(a => within(a).queryByRole('heading', { name: 'Pangihan Cave' }))!;
    const link = within(card).getByRole('link', { name: /See on map/ });
    expect(link.getAttribute('href')).toBe(
      '/tourism/explore?town=malay&sel=place-malay-1'
    );
    fireEvent.click(link);
    expect(where()).toContain('sel=place-malay-1');
    expect(selectedName()).toContain('Pangihan Cave');
  });

  it('an Overview top-place card carries its town', () => {
    app('/tourism');
    const panel = document.getElementById('places-panel')!;
    const first = within(panel).getAllByRole('button', {
      pressed: false,
    })[0];
    const id = first.closest('[data-rec]')!.getAttribute('data-rec')!;
    const rec = ALL_RECORDS.find(r => r.id === id)!;
    fireEvent.click(first);
    expect(where()).toBe(
      `/tourism/explore?sel=${id}${rec.town ? `&town=${rec.town}` : ''}&view=map`
    );
    expect(selectedName()).toContain(displayName(rec.name));
  });

  it('a stay row: Open in Explore selects that stay on the stay layer', () => {
    app('/tourism/accommodations/mainland');
    const link = screen.getAllByRole('link', { name: /^Open in Explore/ })[0];
    const id = new URLSearchParams(
      link.getAttribute('href')!.split('?')[1]
    ).get('sel')!;
    expect(link.getAttribute('href')).toBe(
      `/tourism/explore?layer=stay&sel=${id}`
    );
    const stay = ALL_RECORDS.find(r => r.id === id)!;
    expect(stay.layer).toBe('stay');
    expect(link.textContent).toContain(stay.name);
    fireEvent.click(link);
    expect(selectedName()).toContain(displayName(stay.name));
  });

  it('a festival month card opens that month in Explore', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 21));
    app('/tourism');
    const june = document
      .getElementById('month-june')!
      .closest('section') as HTMLElement;
    const link = within(june).getByRole('link');
    expect(link.getAttribute('href')).toBe(
      '/tourism/explore?layer=event&from=2027-06-01&to=2027-06-30&view=list'
    );
    fireEvent.click(link);
    expect(screen.getByText('Malay Day')).toBeTruthy();
    expect(screen.queryByText(/ATI-ATIHAN FESTIVAL/i)).toBeNull();
  });

  it('Take the tour starts the existing tour and drops tour=1', () => {
    app('/tourism');
    const link = screen.getByRole('link', { name: 'Take the tour' });
    expect(link.getAttribute('href')).toBe('/tourism/explore?view=map&tour=1');
    act(() => {
      fireEvent.click(link);
    });
    expect(
      screen.getByRole('button', { name: /^Pause tour, stop 1 of/ })
    ).toBeTruthy();
    expect(where()).not.toContain('tour=1');
    expect(where()).toContain('town=');
  });
});

describe('Copy link on Explore', () => {
  it('is visible and copies the current view', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    app('/tourism/explore?town=kalibo&view=list');
    const btn = screen.getByRole('button', { name: 'Copy link' });
    expect(btn.className).not.toContain('sr-only');
    await act(async () => {
      fireEvent.click(btn);
    });
    // The page copies the address bar, which a real browser keeps in step with the view.
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getAllByText('Link copied').length).toBeGreaterThan(0);
  });
});
