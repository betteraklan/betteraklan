import { describe, expect, it } from 'vitest';

import {
  flightsLine,
  hotlinesUrl,
  manilaDate,
  todaysFlights,
  websiteUrl,
} from './gettingHere';

const flight = (direction: 'departure' | 'arrival', local: string | null) => ({
  direction,
  flightNumber: 'X1',
  airline: 'A',
  status: 'Scheduled',
  scheduledLocal: local,
  revisedLocal: null,
  terminal: null,
  otherAirport: null,
});

// 21 Nov 2026, 10:00 in Manila (02:00 UTC).
const NOW = new Date('2026-11-21T02:00:00Z');

describe('todaysFlights', () => {
  it('counts only flights dated today at the airport', () => {
    const c = todaysFlights(
      {
        flights: [
          flight('departure', '2026-11-21 06:00+08:00'),
          flight('departure', '2026-11-21 18:30+08:00'),
          flight('departure', '2026-11-21 21:00+08:00'),
          flight('arrival', '2026-11-21 09:10+08:00'),
          flight('arrival', '2026-11-21 20:00+08:00'),
          flight('departure', '2026-11-22 05:00+08:00'),
          flight('arrival', '2026-11-20 23:50+08:00'),
          flight('arrival', null),
        ],
      },
      NOW
    );
    expect(c).toEqual({ departures: 3, arrivals: 2 });
  });

  it('uses the Philippine date, not UTC', () => {
    // 23:30 UTC on the 20th is already the 21st in Manila.
    expect(manilaDate(new Date('2026-11-20T23:30:00Z'))).toBe('2026-11-21');
  });
});

describe('flightsLine', () => {
  it('reads like the card copy', () => {
    expect(flightsLine('KLO', { departures: 3, arrivals: 2 })).toBe(
      'Today: KLO 3 departures, 2 arrivals'
    );
    expect(flightsLine('MPH', { departures: 1, arrivals: 1 })).toBe(
      'Today: MPH 1 departure, 1 arrival'
    );
  });

  it('is null when nothing is listed, so a data gap is not "no flights"', () => {
    expect(flightsLine('KLO', { departures: 0, arrivals: 0 })).toBeNull();
  });
});

describe('hotlinesUrl and websiteUrl', () => {
  it('points at the existing hotlines page for the town', () => {
    expect(hotlinesUrl('New Washington')).toBe(
      'https://hotlines.bettergov.ph/?city=New%20Washington&province=Aklan'
    );
  });

  it('turns a directory website into a link, and blank into null', () => {
    expect(websiteUrl('www.example.gov.ph')).toBe('https://www.example.gov.ph');
    expect(websiteUrl('https://x.gov.ph')).toBe('https://x.gov.ph');
    expect(websiteUrl(null)).toBeNull();
    expect(websiteUrl('  ')).toBeNull();
  });
});
