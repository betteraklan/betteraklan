import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import TourismBottomBar from './TourismBottomBar';
import TourismTabs from './TourismTabs';

const at = (url: string, ui: React.ReactNode) =>
  render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

describe('TourismTabs', () => {
  it('marks the current tab and links to existing URLs', () => {
    at('/tourism/explore?layer=event&view=list', <TourismTabs />);
    const festivals = screen.getByRole('link', { name: 'Festivals' });
    expect(festivals.getAttribute('aria-current')).toBe('page');
    expect(festivals.getAttribute('href')).toBe(
      '/tourism/explore?layer=event&view=list'
    );
    expect(
      screen.getByRole('link', { name: 'Overview' }).getAttribute('href')
    ).toBe('/tourism');
  });

  it('opens the Towns grid with 17 towns and a shading legend', async () => {
    at('/tourism/kalibo', <TourismTabs />);
    const towns = screen.getByRole('button', { name: 'Towns' });
    expect(towns.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(towns);
    expect(towns.getAttribute('aria-expanded')).toBe('true');
    const region = await screen.findByRole('region', { name: 'Towns' });
    const links = await screen.findAllByRole('link', { name: /records?$/ });
    expect(links).toHaveLength(17);
    expect(
      region.querySelector('[aria-label="Shading legend"]')
    ).not.toBeNull();
    const kalibo = links.find(
      l => l.getAttribute('href') === '/tourism/kalibo'
    );
    expect(kalibo?.getAttribute('aria-current')).toBe('page');
  });

  it('Where to stay offers both accommodation pages', () => {
    at('/tourism', <TourismTabs />);
    fireEvent.click(screen.getByRole('button', { name: 'Where to stay' }));
    expect(
      screen.getByRole('link', { name: 'Boracay' }).getAttribute('href')
    ).toBe('/tourism/accommodations/boracay');
    expect(
      screen.getByRole('link', { name: 'Aklan Mainland' }).getAttribute('href')
    ).toBe('/tourism/accommodations/mainland');
  });

  it('Escape closes a panel and returns focus to its tab', () => {
    at('/tourism', <TourismTabs />);
    const stay = screen.getByRole('button', { name: 'Where to stay' });
    fireEvent.click(stay);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(stay.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(stay);
  });
});

describe('TourismBottomBar', () => {
  it('shows four labelled links on tourism pages', () => {
    at('/tourism/kalibo', <TourismBottomBar />);
    const bar = screen.getByRole('navigation', {
      name: 'Visit Aklan shortcuts',
    });
    expect(bar.querySelectorAll('a')).toHaveLength(4);
    expect(bar.className).toContain('safe-area-inset-bottom');
  });

  it('is hidden on Explore', () => {
    at('/tourism/explore?view=map', <TourismBottomBar />);
    expect(
      screen.queryByRole('navigation', { name: 'Visit Aklan shortcuts' })
    ).toBeNull();
  });
});
