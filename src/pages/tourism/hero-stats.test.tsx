import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import accommodations from '@/data/tourism/accommodations.json';
import municipalities from '@/data/tourism/municipalities.json';

import { COUNTS } from './components/tourismData';
import TourismIndex from './index';

// Counted straight from the JSON, not through tourismData, so the test checks
// the helper rather than repeating it.
const named = (key: 'attractions' | 'festivals' | 'products') =>
  municipalities.reduce((n, m) => n + m[key].filter(e => e.name).length, 0);
const raw = (key: 'attractions' | 'festivals' | 'products') =>
  municipalities.reduce((n, m) => n + m[key].length, 0);

vi.mock('@/components/ui/YouTubeFacade', () => ({
  YouTubeFacade: () => null,
}));

describe('tourism counts equal the data', () => {
  it('computed counts match the JSON lengths', () => {
    expect(COUNTS.towns).toBe(municipalities.length);
    expect(COUNTS.towns).toBe(17);
    expect(COUNTS.spots).toBe(named('attractions'));
    expect(COUNTS.spotsRaw).toBe(raw('attractions'));
    expect(COUNTS.festivals).toBe(named('festivals'));
    expect(COUNTS.festivalsRaw).toBe(raw('festivals'));
    expect(COUNTS.products).toBe(named('products'));
    expect(COUNTS.stays).toBe(accommodations.length);
    expect(COUNTS.boracayStays).toBe(
      accommodations.filter(a => a.area === 'boracay').length
    );
    expect(COUNTS.mainlandStays).toBe(
      accommodations.filter(a => a.area === 'mainland').length
    );
    expect(COUNTS.boracayStays + COUNTS.mainlandStays).toBe(COUNTS.stays);
  });

  it('the Overview shows those counts, not typed-in numbers', () => {
    render(
      <MemoryRouter>
        <TourismIndex />
      </MemoryRouter>
    );
    expect(
      screen.getByText(
        `${COUNTS.stays} places to stay in Boracay and the mainland`
      )
    ).toBeTruthy();
    expect(
      screen.getByText(`${COUNTS.festivals} festivals through the year`)
    ).toBeTruthy();
    expect(
      screen.getByText(
        new RegExp(
          `${COUNTS.records} BetterAklan records across ${COUNTS.towns}`
        )
      )
    ).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`of its ${COUNTS.towns} municipalities`))
    ).toBeTruthy();
  });
});
