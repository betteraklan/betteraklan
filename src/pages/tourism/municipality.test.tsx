import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import TourismMunicipalityDetail from './[municipality]';

vi.mock('@/lib/tourism/advisories', () => ({
  useAdvisories: () => ({ advisories: [], status: 'live' }),
  advisoriesFor: () => [],
}));
vi.mock('@/data/tourism/municipalities.json', () => ({
  default: [
    {
      slug: 'altavas',
      name: 'Altavas',
      overview: {
        recordId: 'AKL-001',
        itemName: 'Altavas municipal overview',
        text: 'An inland municipality in eastern Aklan.',
        sourceUrl: 'https://example.test/1',
      },
      festivals: [
        { name: 'Pag-Aeaw-Aeaw', description: 'Workbook.', recordId: 'AKL-9' },
        { name: 'ALTAVAS STO. NIÑO FESTIVAL', description: 'Legacy.' },
      ],
      attractions: [
        {
          name: 'Juez de Cuchillo commemoration',
          description: 'Workbook.',
          recordId: 'AKL-8',
          location: 'Poblacion',
        },
      ],
      products: [],
    },
  ],
}));

const page = () =>
  render(
    <MemoryRouter initialEntries={['/tourism/altavas']}>
      <Routes>
        <Route
          path='/tourism/:municipality'
          element={<TourismMunicipalityDetail />}
        />
      </Routes>
    </MemoryRouter>
  );

describe('municipality page with workbook records', () => {
  it('renders workbook names verbatim and re-cases legacy names as before', () => {
    page();
    expect(screen.getByText('Pag-Aeaw-Aeaw')).toBeTruthy();
    expect(screen.getByText('Juez de Cuchillo commemoration')).toBeTruthy();
    expect(screen.getByText('Altavas Sto. Niño Festival')).toBeTruthy();
  });

  it('shows the overview paragraph and the location text', () => {
    page();
    expect(
      screen.getByText('An inland municipality in eastern Aklan.')
    ).toBeTruthy();
    expect(screen.getByText('Location/barangay: Poblacion')).toBeTruthy();
  });
});
