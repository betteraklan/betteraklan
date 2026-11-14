import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminAdvisory } from '@/lib/tourism/advisoriesAdmin';

import TourismAdvisories from './TourismAdvisories';

const base: AdminAdvisory = {
  id: 'live',
  kind: 'closure',
  title: 'Caticlan port closed',
  summary: 'Gale warning',
  affects: { municipality: 'malay', place: 'Caticlan Jetty Port' },
  issuer: 'PCG Aklan',
  sourceUrl: 'https://example.gov.ph/1',
  publishedAt: '2026-11-14',
  endsAt: '2026-11-16',
  isPublished: true,
  createdAt: '2026-11-14 00:00:00',
  updatedAt: '2026-11-14 00:00:00',
};
const list: AdminAdvisory[] = [
  base,
  {
    ...base,
    id: 'old',
    title: 'Old fiesta',
    kind: 'event',
    publishedAt: '2026-01-01',
    endsAt: '2026-01-02',
  },
  { ...base, id: 'hidden', title: 'Draft notice', isPublished: false },
];

let requests: Array<{ url: string; init?: RequestInit }>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-15T12:00:00+08:00'));
  requests = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url === '/api/admin/auth/csrf')
      return Response.json({ csrf_token: 't' });
    if (init?.method === 'PATCH') {
      const changes = JSON.parse(String(init.body));
      return Response.json({ advisory: { ...base, ...changes } });
    }
    if (init?.method === 'POST') {
      const p = JSON.parse(String(init.body));
      if (!p.title) {
        return Response.json(
          {
            error: 'Validation failed',
            details: { title: 'Required', sourceUrl: 'Required' },
          },
          { status: 400 }
        );
      }
      return Response.json(
        { advisory: { ...base, id: 'new', title: p.title } },
        { status: 201 }
      );
    }
    return Response.json({ advisories: list });
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const card = (title: string) =>
  screen.getByRole('heading', { name: title }).closest('li') as HTMLElement;

describe('TourismAdvisories admin page', () => {
  it('lists advisories with their status', async () => {
    render(<TourismAdvisories />);
    await screen.findByText('Caticlan port closed');
    expect(within(card('Caticlan port closed')).getByText('Live')).toBeTruthy();
    expect(within(card('Old fiesta')).getByText('Ended')).toBeTruthy();
    expect(within(card('Draft notice')).getByText('Unpublished')).toBeTruthy();
    expect(
      within(card('Caticlan port closed')).getByText(
        /Malay · Caticlan Jetty Port/
      )
    ).toBeTruthy();
  });

  it('filters by status', async () => {
    render(<TourismAdvisories />);
    await screen.findByText('Caticlan port closed');
    fireEvent.change(screen.getByLabelText('Show'), {
      target: { value: 'ended' },
    });
    expect(screen.queryByText('Caticlan port closed')).toBeNull();
    expect(screen.getByText('Old fiesta')).toBeTruthy();
  });

  it('unpublishes with a CSRF token and updates the card', async () => {
    render(<TourismAdvisories />);
    await screen.findByText('Caticlan port closed');
    fireEvent.click(
      screen.getByRole('button', { name: 'Unpublish “Caticlan port closed”' })
    );
    await waitFor(() =>
      expect(
        within(card('Caticlan port closed')).getByText('Unpublished')
      ).toBeTruthy()
    );
    const patch = requests.find(r => r.init?.method === 'PATCH')!;
    expect(patch.url).toBe('/api/admin/tourism/advisories/live');
    expect(JSON.parse(String(patch.init!.body))).toEqual({
      isPublished: false,
    });
    expect(
      (patch.init!.headers as Record<string, string>)['X-CSRF-Token']
    ).toBe('t');
    expect(screen.getByText(/Unpublished “Caticlan port closed”/)).toBeTruthy();
  });

  it('shows field errors from the server and creates once fixed', async () => {
    render(<TourismAdvisories />);
    await screen.findByText('Caticlan port closed');
    fireEvent.click(screen.getByRole('button', { name: 'New advisory' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await within(dialog).findByText('Please fix the highlighted fields.');
    const title = within(dialog).getByLabelText('Title');
    expect(title.getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(title, { target: { value: 'Kalibo road works' } });
    expect(title.getAttribute('aria-invalid')).toBe('false');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('heading', { name: 'Kalibo road works' })
    ).toBeTruthy();
  });

  it('shows an error when the list cannot load', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 401 }));
    render(<TourismAdvisories />);
    expect(await screen.findByText(/session has expired/)).toBeTruthy();
  });
});
