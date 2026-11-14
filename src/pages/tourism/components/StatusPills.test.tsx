import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdvisoryKindPill } from './StatusPills';

describe('AdvisoryKindPill', () => {
  it.each([
    ['closure', 'Closure', 'bg-kapwa-bg-warning-weak'],
    ['access', 'Access change', 'bg-kapwa-bg-warning-weak'],
    ['event', 'Event', 'bg-kapwa-bg-surface-raised'],
  ] as const)(
    'labels %s advisories with text and a theme tone',
    (kind, text, tone) => {
      render(<AdvisoryKindPill kind={kind} />);
      const pill = screen.getByText(text);
      expect(pill.className).toContain(tone);
      // Icon is decorative; the text carries the meaning.
      expect(pill.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
        'true'
      );
    }
  );
});
