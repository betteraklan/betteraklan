import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TourismImage from './TourismImage';

const photo = {
  src: '/tourism/AKL-002.jpg',
  alt: 'Tigayon Hill and caves, Altavas',
  credit: 'Photo by Someone; public domain.',
};

describe('TourismImage', () => {
  it('shows a fixed 16:10 frame', () => {
    const { container } = render(<TourismImage layer='place' />);
    expect(container.firstElementChild?.className).toContain('aspect-[16/10]');
  });

  it('renders the layer fallback tile when there is no photo', () => {
    const { container } = render(<TourismImage layer='place' />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it.each([
    ['place', 'bg-kapwa-brand-600'],
    ['stay', 'bg-kapwa-brand-700'],
    ['event', 'bg-kapwa-orange-700'],
    ['product', 'bg-teal-600'],
  ] as const)('%s fallback uses %s only', (layer, tile) => {
    const { container } = render(<TourismImage layer={layer} />);
    expect(container.firstElementChild?.className).toContain(tile);
  });

  it('keeps fallback tiles to brand blue, orange and the one teal', () => {
    const tiles = (['place', 'stay', 'event', 'product'] as const).map(l => {
      const { container, unmount } = render(<TourismImage layer={l} />);
      const cls = container.firstElementChild?.className ?? '';
      unmount();
      return cls;
    });
    for (const cls of tiles)
      expect(cls).toMatch(/bg-(kapwa-brand|kapwa-orange|teal)-\d{3}/);
    expect(tiles.join(' ')).not.toMatch(/hsl|#[0-9a-f]{3,6}/i);
  });

  it('lazy-loads the photo with its alt text and a visible credit', () => {
    render(<TourismImage image={photo} layer='place' />);
    const img = screen.getByRole('img', { name: photo.alt });
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(screen.getByText(`Photo: ${photo.credit}`)).toBeTruthy();
    expect(screen.getByTitle(`Photo: ${photo.credit}`)).toBeTruthy();
  });

  const cc = {
    src: '/tourism/AKL-036.jpg',
    alt: 'Batan Sea Port, Batan',
    credit: 'Heinrich Balbuena; CC BY 3.0 (Wikimedia Commons).',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Batan,_Aklan_2.JPG',
  };

  it('links a CC photo to its page and licence, without truncating', () => {
    render(<TourismImage image={cc} layer='place' />);
    const page = screen.getByRole('link', { name: /Heinrich Balbuena/ });
    expect(page.getAttribute('href')).toBe(cc.sourcePage);
    const licence = screen.getByRole('link', { name: /CC BY 3.0 licence/ });
    expect(licence.getAttribute('href')).toBe(cc.licenceUrl);
    expect(licence.getAttribute('rel')).toContain('license');
    expect(page.closest('span')!.className).not.toContain('truncate');
  });

  it('shows the CC credit as text inside a button card (no nested links)', () => {
    render(
      <button type='button'>
        <TourismImage image={cc} layer='place' links={false} />
      </button>
    );
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByText('CC BY 3.0')).toBeTruthy();
    expect(screen.getByText(/Photo: Heinrich Balbuena/)).toBeTruthy();
  });

  it('falls back to the tile if the photo fails to load', () => {
    const { container } = render(<TourismImage image={photo} layer='event' />);
    fireEvent.error(screen.getByRole('img', { name: photo.alt }));
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstElementChild?.className).toContain(
      'bg-kapwa-orange-700'
    );
  });
});
