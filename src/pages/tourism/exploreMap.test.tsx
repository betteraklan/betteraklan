import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { festivalsInMonth } from '@/lib/tourism/explore';

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
vi.mock('@/lib/tourism/advisories', () => ({
  useAdvisories: () => ({ advisories: [], status: 'live' }),
  advisoriesFor: () => [],
}));
vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));

const TODAY = new Date(2026, 10, 21);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});
afterEach(() => {
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
