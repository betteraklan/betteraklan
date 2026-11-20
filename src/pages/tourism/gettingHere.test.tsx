import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import airports from '@/data/airports.json';

import GettingHere from './components/GettingHere';
import PlanYourVisit from './components/PlanYourVisit';
import { ALL_RECORDS, staysIn } from './components/tourismData';

const mocks = vi.hoisted(() => ({
  flights: vi.fn(),
  weather: vi.fn(),
}));
vi.mock('@/lib/flights', () => ({ fetchFlightsData: mocks.flights }));
vi.mock('@/lib/weather', () => ({ fetchWeatherForCity: mocks.weather }));

const inRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
}).format(new Date());
const flight = (direction: 'departure' | 'arrival') => ({
  direction,
  flightNumber: 'X1',
  airline: 'A',
  status: 'Scheduled',
  scheduledLocal: `${today} 09:00+08:00`,
  revisedLocal: null,
  terminal: null,
  otherAirport: null,
});

describe('Getting here card', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the live line for each airport from the flights API', async () => {
    mocks.flights.mockResolvedValue({
      updatedAt: new Date().toISOString(),
      airports: [
        {
          slug: 'kalibo',
          icao: 'RPVK',
          iata: 'KLO',
          name: 'Kalibo International Airport',
          flights: [
            flight('departure'),
            flight('departure'),
            flight('departure'),
            flight('arrival'),
            flight('arrival'),
          ],
        },
      ],
    });
    inRouter(<GettingHere />);
    expect(
      await screen.findByText('Today: KLO 3 departures, 2 arrivals')
    ).toBeTruthy();
    // The other airport has no data, so it just has no live line.
    expect(screen.queryByText(/Today: MPH/)).toBeNull();
  });

  it('lists both airports from the airports data with links to the live schedule', async () => {
    mocks.flights.mockResolvedValue({
      updatedAt: new Date().toISOString(),
      airports: [],
    });
    inRouter(<GettingHere />);
    for (const a of airports) {
      expect(screen.getByText(new RegExp(`\(${a.iata}\)`))).toBeTruthy();
      expect(
        screen
          .getByRole('link', {
            name: new RegExp(`Live schedule for ${a.name}`),
          })
          .getAttribute('href')
      ).toBe(`/airports/${a.slug}`);
    }
  });

  it('falls back quietly when the flights API fails: no error text, link stays', async () => {
    mocks.flights.mockRejectedValue(new Error('HTTP 500'));
    inRouter(<GettingHere />);
    await waitFor(() =>
      expect(
        screen.getByText(/Check the live schedule before you travel/)
      ).toBeTruthy()
    );
    expect(screen.queryByText(/error|failed|couldn/i)).toBeNull();
    expect(screen.queryByText(/Today:/)).toBeNull();
    expect(screen.getAllByRole('link', { name: /Live schedule/ })).toHaveLength(
      airports.length
    );
  });

  it('shows no unsourced transport steps or travel times', async () => {
    mocks.flights.mockRejectedValue(new Error('x'));
    const { container } = inRouter(<GettingHere />);
    expect(container.textContent).not.toMatch(
      /jetty|boat|ferry|minutes|hours? by|\bkm\b/i
    );
  });
});

describe('Plan your visit panel', () => {
  beforeEach(() => vi.resetAllMocks());

  it('counts the stays in the town from the data', () => {
    mocks.weather.mockResolvedValue(null);
    const n = staysIn('kalibo');
    expect(n).toBe(
      ALL_RECORDS.filter(r => r.layer === 'stay' && r.town === 'kalibo').length
    );
    expect(n).toBeGreaterThan(0);
    inRouter(<PlanYourVisit slug='kalibo' name='Kalibo' />);
    expect(
      screen
        .getByRole('link', {
          name: `${n} place${n === 1 ? '' : 's'} to stay in Kalibo`,
        })
        .getAttribute('href')
    ).toBe('/tourism/explore?layer=stay&town=kalibo&view=list');
  });

  it('leaves the stays row out for a town with none', () => {
    mocks.weather.mockResolvedValue(null);
    const none = [
      'altavas',
      'balete',
      'banga',
      'batan',
      'lezo',
      'libacao',
      'madalag',
      'makato',
      'malinao',
      'numancia',
      'tangalan',
      'ibajay',
      'buruanga',
      'nabas',
      'new-washington',
    ].find(s => staysIn(s) === 0);
    if (!none) return;
    inRouter(<PlanYourVisit slug={none} name={none} />);
    expect(screen.queryByText(/to stay in/)).toBeNull();
  });

  it('shows a short forecast when the weather API answers', async () => {
    mocks.weather.mockResolvedValue({
      temperature: 29,
      condition: 'light rain',
    });
    inRouter(<PlanYourVisit slug='kalibo' name='Kalibo' />);
    expect(await screen.findByText(/29°C, light rain\./)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /Weather in Kalibo/ })
        .getAttribute('href')
    ).toBe('/map');
  });

  it('keeps the weather link when the weather API fails', async () => {
    mocks.weather.mockRejectedValue(new Error('HTTP 503'));
    inRouter(<PlanYourVisit slug='kalibo' name='Kalibo' />);
    expect(
      screen.getByRole('link', { name: /Weather in Kalibo/ })
    ).toBeTruthy();
    await waitFor(() => expect(mocks.weather).toHaveBeenCalled());
    expect(screen.queryByText(/°C/)).toBeNull();
    expect(screen.queryByText(/error|failed|couldn/i)).toBeNull();
  });

  it('links Emergency hotlines to the existing hotlines page for the town', () => {
    mocks.weather.mockResolvedValue(null);
    inRouter(<PlanYourVisit slug='new-washington' name='New Washington' />);
    const link = screen.getByRole('link', { name: /Emergency hotlines/ });
    expect(link.getAttribute('href')).toBe(
      'https://hotlines.bettergov.ph/?city=New%20Washington&province=Aklan'
    );
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('shows no municipality website, because the data has none, and no travel steps', () => {
    mocks.weather.mockResolvedValue(null);
    const { container } = inRouter(
      <PlanYourVisit slug='kalibo' name='Kalibo' />
    );
    expect(
      within(container).queryByRole('link', { name: /website/i })
    ).toBeNull();
    expect(container.textContent).not.toMatch(/jetty|boat|minutes|hours? by/i);
  });
});
