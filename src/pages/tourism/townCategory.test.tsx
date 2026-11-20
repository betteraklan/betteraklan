import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { type Category, categoryOf } from '@/lib/tourism/category';

import municipalities from '@/data/tourism/municipalities.json';

import TourismMunicipalityDetail from './[municipality]';

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

// What the page should count, worked out here from the data: festivals are
// Culture, places come from categoryOf, products have no category.
function expected(slug: string) {
  const m = municipalities.find(x => x.slug === slug)!;
  const counts: Partial<Record<Category, number>> = {};
  const add = (c: Category) => (counts[c] = (counts[c] ?? 0) + 1);
  for (const e of m.festivals) if (e.name) add('Culture');
  for (const e of m.attractions)
    if (e.name)
      add(
        categoryOf({ name: e.name, description: e.description, layer: 'place' })
      );
  return counts;
}

const chipGroup = () =>
  screen.getByRole('group', { name: 'Filter by category' });
// Record cards only: the unnamed free-text paragraphs are articles too, without a heading.
const articles = () =>
  screen.getAllByRole('article').filter(a => within(a).queryByRole('heading'));
const badge = (a: HTMLElement) =>
  within(a).queryByText(/^(Beach|Falls|Cave|Culture|Nature|Other)$/);

describe('town page category chips', () => {
  it('offers All and only the categories the town has, with counts', () => {
    page('/tourism/altavas');
    const labels = within(chipGroup())
      .getAllByRole('button')
      .map(b => b.textContent!.replace(/\s+/g, ' '));
    const c = expected('altavas');
    expect(labels[0]).toBe('All');
    expect(labels).toContain(`Falls · ${c.Falls}`);
    expect(labels).toContain(`Caves · ${c.Cave}`);
    expect(labels).toContain(`Culture · ${c.Culture}`);
    // Altavas has no beach, so no Beaches chip leads to nothing.
    expect(c.Beach ?? 0).toBe(0);
    expect(labels.some(l => l.startsWith('Beaches'))).toBe(false);
    // Real examples: two caves in Altavas (Kipot Cave and Suhot Cave).
    expect(c.Cave).toBe(2);
  });

  it('a chip keeps only that category and says how many it is showing', () => {
    page('/tourism/altavas');
    fireEvent.click(
      within(chipGroup()).getByRole('button', { name: /^Caves/ })
    );
    const cards = articles();
    expect(cards).toHaveLength(expected('altavas').Cave!);
    for (const a of cards) expect(badge(a)?.textContent).toBe('Cave');
    expect(screen.getByText('Kipot Cave')).toBeTruthy();
    expect(screen.queryByText(/Macawiwili Falls/)).toBeNull();
    // Sections with nothing left are hidden, including the nameless paragraphs.
    expect(screen.queryByRole('heading', { name: /Products/i })).toBeNull();
    expect(
      screen
        .getByRole('button', { name: /^Caves/ })
        .getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('All brings everything back', () => {
    page('/tourism/altavas');
    const all = articles().length;
    fireEvent.click(
      within(chipGroup()).getByRole('button', { name: /^Falls/ })
    );
    expect(articles().length).toBeLessThan(all);
    fireEvent.click(within(chipGroup()).getByRole('button', { name: 'All' }));
    expect(articles()).toHaveLength(all);
  });

  it('opens already filtered from ?category=, and ignores one the town has none of', () => {
    page('/tourism/altavas?category=cave');
    expect(articles()).toHaveLength(expected('altavas').Cave!);
  });

  it('ignores an unknown or empty category', () => {
    page('/tourism/altavas?category=beach');
    expect(articles().length).toBeGreaterThan(expected('altavas').Cave!);
    expect(
      within(chipGroup())
        .getByRole('button', { name: 'All' })
        .getAttribute('aria-pressed')
    ).toBe('true');
  });
});

describe('category badge on each card', () => {
  it('every festival and place card shows one, and product cards do not', () => {
    page('/tourism/kalibo');
    let withBadge = 0;
    let without = 0;
    for (const a of articles()) {
      if (badge(a)) withBadge += 1;
      else without += 1;
    }
    const m = municipalities.find(x => x.slug === 'kalibo')!;
    const named = (list: { name: string | null }[]) =>
      list.filter(e => e.name).length;
    expect(withBadge).toBe(named(m.festivals) + named(m.attractions));
    expect(without).toBe(named(m.products));
  });

  it('shows the real category for known records', () => {
    page('/tourism/kalibo');
    const card = (name: string) =>
      articles().find(a =>
        within(a).queryByRole('heading', { name })
      ) as HTMLElement;
    expect(badge(card('Kalibo Cathedral'))?.textContent).toBe('Culture');
    expect(badge(card('Bakhawan Eco-Park'))?.textContent).toBe('Nature');
    expect(badge(card('Tigayon Hill and caves'))?.textContent).toBe('Cave');
    expect(badge(card('Kalibo Food Festival'))?.textContent).toBe('Culture');
  });
});
