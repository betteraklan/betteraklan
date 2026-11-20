import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { filterRecords, type Layer } from '@/lib/tourism/explore';

import TourismHero from './components/TourismHero';
import { ALL_RECORDS, COUNTS } from './components/tourismData';
import { HERO_CHIPS } from './components/tourismNav';
import TourismIndex from './index';

vi.mock('@/components/ui/YouTubeFacade', () => ({
  YouTubeFacade: ({ title }: { title: string }) => <div>video: {title}</div>,
}));

const inRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TourismHero', () => {
  it('renders title, search, chips, stats and video in their slots', () => {
    inRouter(
      <TourismHero
        title='Discover Aklan'
        description='Intro'
        search={<input aria-label='slot search' />}
        chips={[{ label: 'Beaches', to: '/tourism/explore?q=beach' }]}
        stats={[{ value: 1234, label: 'Things' }]}
        video={<div>video slot</div>}
      />
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Discover Aklan' })
    ).toBeTruthy();
    expect(screen.getByLabelText('slot search')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Beaches' }).getAttribute('href')
    ).toBe('/tourism/explore?q=beach');
    expect(screen.getByText('1,234')).toBeTruthy();
    expect(screen.getByText('video slot')).toBeTruthy();
  });

  it('uses a brand-950 to brand-600 gradient with no photo', () => {
    const { container } = inRouter(<TourismHero title='T' description='D' />);
    const bg = container.querySelector('[data-hero-backdrop]')!;
    expect(bg.getAttribute('data-hero-backdrop')).toBe('gradient');
    expect(bg.className).toContain('from-kapwa-brand-950');
    expect(bg.className).toContain('to-kapwa-brand-600');
    expect(container.querySelector('img')).toBeNull();
  });

  it('a photo fills the same slot under a brand-950 scrim, with credit and alt', () => {
    const photo = {
      src: '/tourism/x.jpg',
      alt: 'Boracay at dusk',
      credit: 'Someone; public domain',
    };
    const without = inRouter(<TourismHero title='T' description='D' />);
    const layoutWithout = without.container.querySelector(
      'section > div:last-child'
    )!.className;
    without.unmount();
    const { container } = inRouter(
      <TourismHero title='T' description='D' image={photo} />
    );
    const bg = container.querySelector('[data-hero-backdrop]')!;
    expect(bg.getAttribute('data-hero-backdrop')).toBe('photo');
    expect(screen.getByRole('img', { name: 'Boracay at dusk' })).toBeTruthy();
    expect(
      bg.querySelector('[class*="from-kapwa-brand-950/90"]')
    ).not.toBeNull();
    expect(screen.getByText('Photo: Someone; public domain')).toBeTruthy();
    // Dropping in a photo changes nothing about the layout around it.
    expect(container.querySelector('section > div:last-child')!.className).toBe(
      layoutWithout
    );
  });
});

describe('Overview hero', () => {
  const page = () =>
    render(
      <MemoryRouter>
        <TourismIndex />
      </MemoryRouter>
    );

  it('shows the Figma parts: breadcrumb, Discover Aklan, search, chips, video', () => {
    page();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Discover Aklan' })
    ).toBeTruthy();
    const crumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(crumbs).getByRole('link', { name: 'Home' })).toBeTruthy();
    expect(
      screen.getByRole('search', { name: 'Search Aklan tourism' })
    ).toBeTruthy();
    const chips = screen.getByRole('navigation', {
      name: 'Browse by category',
    });
    expect(
      within(chips)
        .getAllByRole('link')
        .map(a => a.textContent)
    ).toEqual([
      'Beaches',
      'Waterfalls and springs',
      'Caves and hills',
      'Festivals',
      'Heritage',
      'Food and products',
    ]);
    expect(screen.getByText('video: Welcome to Aklan!')).toBeTruthy();
  });

  it('the stats strip equals the data counts', () => {
    page();
    const stat = (label: string) =>
      screen
        .getByText(label, { selector: 'dt' })
        .parentElement!.querySelector('dd')!.textContent;
    expect(stat('Municipalities')).toBe(String(COUNTS.towns));
    expect(stat('Spots and attractions')).toBe(String(COUNTS.spots));
    expect(stat('Festivals')).toBe(String(COUNTS.festivals));
    expect(stat('Places to stay')).toBe(COUNTS.stays.toLocaleString());
  });

  it('every chip leads to at least one record in Explore', () => {
    for (const chip of HERO_CHIPS) {
      const p = new URL(chip.to, 'http://x').searchParams;
      const hits = filterRecords(ALL_RECORDS, {
        q: p.get('q') ?? '',
        town: '',
        layer: (p.get('layer') ?? 'all') as Layer,
      });
      expect(hits.length, chip.label).toBeGreaterThan(0);
    }
  });
});
