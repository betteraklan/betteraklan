import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { townsWithLiveNotices } from '@/lib/tourism/advisories';
import {
  distanceKm,
  festivalsInMonth,
  formatDistance,
  sortByDistance,
} from '@/lib/tourism/explore';
import type { Advisory } from '@/types/tourism';

import { ALL_RECORDS } from './components/tourismData';
import TourismExplore from './explore';

// WebGL is unavailable here: the map is a stub that records its props.
const mapProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./components/AklanMap3D', () => ({
  default: (p: Record<string, unknown>) => {
    mapProps.current = p;
    return <div data-testid='map' />;
  },
}));
// The advisory list each test sees; the real helpers do the matching.
const notices = vi.hoisted(() => ({ list: [] as Advisory[] }));
vi.mock('@/lib/tourism/advisories', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/tourism/advisories')>()),
  useAdvisories: () => ({ advisories: notices.list, status: 'live' }),
}));
vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));

const TODAY = new Date(2026, 10, 21);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});
afterEach(() => {
  notices.list = [];
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

function Where() {
  const l = useLocation();
  return <p data-testid='where'>{l.search}</p>;
}
const params = () =>
  new URLSearchParams(screen.getByTestId('where').textContent!);
const explore = (search = '?view=map') =>
  render(
    <MemoryRouter initialEntries={[`/tourism/explore${search}`]}>
      <Routes>
        <Route path='/tourism/explore' element={<TourismExplore />} />
      </Routes>
      <Where />
    </MemoryRouter>
  );

describe('festival season slider', () => {
  it('counts the festivals each month names (real data)', () => {
    const june = festivalsInMonth(ALL_RECORDS, 6, TODAY).map(r => r.name);
    expect(june).toEqual(
      expect.arrayContaining(['Malay Day', 'Kalibo Food Festival'])
    );
    expect(june).not.toContain('Fiesta de Obreros'); // gives no date
    expect(june).not.toContain('Bayangan Festival'); // July
  });

  it('is a native range control: All months, then January to December', () => {
    explore();
    const slider = screen.getByRole('slider', { name: 'Festival season' });
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.getAttribute('min')).toBe('0');
    expect(slider.getAttribute('max')).toBe('12');
    expect(slider.getAttribute('aria-valuetext')).toBe('All months');
  });

  it('picking a month filters festivals to it and pulses their pins', () => {
    explore();
    const slider = screen.getByRole('slider', { name: 'Festival season' });
    fireEvent.change(slider, { target: { value: '6' } });
    expect(params().get('from')).toBe('2027-06-01');
    expect(params().get('to')).toBe('2027-06-30');
    const june = festivalsInMonth(ALL_RECORDS, 6, TODAY);
    expect(slider.getAttribute('aria-valuetext')).toBe(
      `June: ${june.length} festivals`
    );
    const pulse = mapProps.current.pulse as { ids: string[] };
    expect(pulse.ids.sort()).toEqual(june.map(r => r.id).sort());
    // Map pins: January's Ati-Atihan is filtered out, June's festivals stay.
    const pins = (mapProps.current.pins as { id: string; name: string }[]).map(
      p => p.name
    );
    expect(pins).toContain('Malay Day');
    expect(pins).not.toContain('KALIBO STO. NIÑO ATI-ATIHAN FESTIVAL');
  });

  it('All months clears the range', () => {
    explore('?view=map&from=2027-06-01&to=2027-06-30');
    const slider = screen.getByRole('slider', { name: 'Festival season' });
    expect((slider as HTMLInputElement).value).toBe('6');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(params().get('from')).toBeNull();
    expect(params().get('to')).toBeNull();
  });

  it('is hidden when festivals are not shown', () => {
    explore('?view=map&layer=stay');
    expect(
      screen.queryByRole('slider', { name: 'Festival season' })
    ).toBeNull();
  });
});

const notice = (over: Partial<Advisory>): Advisory => ({
  id: 'n1',
  kind: 'closure',
  title: 'Road closed',
  summary: '',
  affects: { municipality: 'kalibo' },
  issuer: 'MDRRMO',
  sourceUrl: 'https://example.gov.ph/n1',
  publishedAt: '2026-11-01',
  ...over,
});
type Pin = { id: string; layer: string; town: string | null; notice?: boolean };
const pins = () => mapProps.current.pins as Pin[];
const noticesButton = () => screen.getByRole('button', { name: /^Notices/ });

describe('notices layer', () => {
  it('finds towns with a live notice only', () => {
    const now = TODAY.getTime();
    const list = [
      notice({ id: 'live' }),
      notice({
        id: 'later',
        affects: { municipality: 'malay' },
        publishedAt: '2026-12-25',
      }),
      notice({
        id: 'over',
        affects: { municipality: 'nabas' },
        endsAt: '2026-11-10',
      }),
    ];
    expect([
      ...townsWithLiveNotices(['kalibo', 'malay', 'nabas', 'lezo'], list, now),
    ]).toEqual(['kalibo']);
    expect(townsWithLiveNotices(['kalibo'], [], now).size).toBe(0);
  });

  it('with no live notices: the toggle says so and nothing is drawn', () => {
    explore();
    const btn = noticesButton();
    expect(btn.textContent).toBe('Notices · none active');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(pins().some(p => p.notice)).toBe(false);
  });

  it('rings only the places in towns with a live notice when on', () => {
    notices.list = [notice({})];
    explore();
    const btn = noticesButton();
    expect(btn.textContent).toBe('Notices · 1 town');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(pins().some(p => p.notice)).toBe(false);

    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    const ringed = pins().filter(p => p.notice);
    expect(ringed.length).toBeGreaterThan(0);
    for (const p of ringed) {
      expect(p.town).toBe('kalibo');
      expect(p.layer).toBe('place');
    }
    expect(
      screen.getByText(/Orange ring = place in a town with an active notice/)
    ).toBeTruthy();
  });
});

describe('near me', () => {
  // A point in Malay, near the Caticlan jetty.
  const HERE = { lat: 11.9256, lon: 121.9554 };
  const geo = (ok: boolean) => {
    const getCurrentPosition = vi.fn(
      (yes: PositionCallback, no: PositionErrorCallback) =>
        ok
          ? yes({
              coords: { latitude: HERE.lat, longitude: HERE.lon },
            } as GeolocationPosition)
          : no({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError)
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    return getCurrentPosition;
  };
  const nearMe = () => screen.getByRole('button', { name: /^Near me/ });
  const firstNames = (n: number) =>
    screen
      .getAllByRole('button', { pressed: false })
      .filter(b => b.closest('[data-rec]'))
      .slice(0, n)
      .map(b => b.closest('[data-rec]')!.getAttribute('data-rec')!);

  it('sorts nearest first, and formats distances plainly', () => {
    const sorted = sortByDistance(ALL_RECORDS, HERE);
    const km = sorted
      .map(r => distanceKm(r, HERE))
      .filter((d): d is number => d != null);
    expect(km).toEqual([...km].sort((a, b) => a - b));
    // Records without a pin go last.
    const firstUnpinned = sorted.findIndex(r => r.lat == null);
    if (firstUnpinned >= 0)
      expect(sorted.slice(firstUnpinned).every(r => r.lat == null)).toBe(true);
    expect(formatDistance(0.43)).toBe('400 m');
    expect(formatDistance(3.24)).toBe('3.2 km');
    expect(formatDistance(23.6, true)).toBe('about 24 km');
  });

  it('asks for location only when tapped, then lists nearest first', () => {
    const ask = geo(true);
    explore('?view=list');
    expect(ask).not.toHaveBeenCalled();
    fireEvent.click(nearMe());
    expect(ask).toHaveBeenCalledTimes(1);
    expect(params().get('town')).toBe('malay');
    expect(screen.getByText('Nearest to you first')).toBeTruthy();
    const ids = firstNames(5);
    const km = ids.map(
      id => distanceKm(ALL_RECORDS.find(r => r.id === id)!, HERE)!
    );
    expect(km).toEqual([...km].sort((a, b) => a - b));
    expect(screen.getAllByText(/ away$/).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole('button', { name: /Clear distance sort/ })
    );
    expect(screen.queryByText('Nearest to you first')).toBeNull();
  });

  it('works normally when location is denied', () => {
    geo(false);
    explore('?view=list');
    const before = firstNames(5);
    fireEvent.click(nearMe());
    expect(
      screen.getAllByText(/Location is off for this site/).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Nearest to you first')).toBeNull();
    expect(firstNames(5)).toEqual(before);
    expect(params().get('town')).toBeNull();
  });
});
