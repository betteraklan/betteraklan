import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MONTH_NAMES, monthGrid } from '@/lib/tourism/festivalDateText';

import FestivalBand from './components/FestivalBand';
import { ALL_RECORDS } from './components/tourismData';

const festivals = ALL_RECORDS.filter(r => r.layer === 'event').map(r => ({
  id: r.id,
  name: r.name,
  description: r.description,
  townName: r.townName,
}));
const grid = monthGrid(festivals);

const band = () =>
  render(
    <MemoryRouter>
      <FestivalBand />
    </MemoryRouter>
  );
const card = (month: string) => screen.getByRole('region', { name: month });

describe('Festivals through the year: month grid', () => {
  it('has twelve month cards, January to December, each with its count', () => {
    band();
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map(h => h.textContent)
      .filter(t => (MONTH_NAMES as readonly string[]).includes(t ?? ''));
    expect(headings).toEqual([...MONTH_NAMES]);
    MONTH_NAMES.forEach((m, i) => {
      const n = grid.months[i].length;
      expect(
        within(card(m)).getByText(`${n} festival${n === 1 ? '' : 's'}`)
      ).toBeTruthy();
    });
  });

  it('says "No festivals listed yet" for months with none', () => {
    band();
    const empty = MONTH_NAMES.filter((_, i) => grid.months[i].length === 0);
    expect(empty.length).toBeGreaterThan(0);
    for (const m of empty)
      expect(within(card(m)).getByText('No festivals listed yet')).toBeTruthy();
    const busy = MONTH_NAMES.find((_, i) => grid.months[i].length > 0)!;
    expect(
      within(card(busy)).queryByText('No festivals listed yet')
    ).toBeNull();
  });

  it('shows at most three festivals per card and links to the rest', () => {
    band();
    MONTH_NAMES.forEach((m, i) => {
      const n = grid.months[i].length;
      const items = within(card(m)).queryAllByRole('listitem');
      expect(items.length).toBe(Math.min(n, 3));
      if (n > 3)
        expect(
          within(card(m)).getByRole('link', {
            name: `${n - 3} more in ${m}: see all festivals`,
          })
        ).toBeTruthy();
    });
    expect(grid.months.some(l => l.length > 3)).toBe(true);
  });

  it('shows each date wording exactly as the description gives it', () => {
    band();
    grid.months.forEach((list, i) => {
      for (const { festival, info } of list.slice(0, 3)) {
        // The phrase is a word-for-word piece of the description...
        expect(festival.description).toContain(info.text);
        // ...and it is what the card prints.
        const text = within(card(MONTH_NAMES[i])).getAllByText(t =>
          t.includes(`${festival.townName} · ${info.text}`)
        );
        expect(text.length).toBeGreaterThan(0);
      }
    });
    expect(
      within(card('June')).getByText(/Kalibo · June 12 to 23/)
    ).toBeTruthy();
  });

  it('marks unconfirmed dates and accounts for every festival', () => {
    band();
    expect(
      within(card('February')).getByText(/February and October/)
    ).toBeTruthy();
    expect(
      within(card('February')).getByText(/Date not confirmed/)
    ).toBeTruthy();
    expect(
      within(card('October')).getByText(/February and October/)
    ).toBeTruthy();
    expect(
      screen.getByText(
        `${grid.undated.length} more festivals don't give a date in their description.`
      )
    ).toBeTruthy();
    expect(screen.getByText(/no confirmed event dates yet/i)).toBeTruthy();
  });
});

describe('Featured Ati-Atihan', () => {
  it('is the Ati-Atihan the data gives a date for', () => {
    band();
    const featured = screen.getByRole('article');
    expect(
      within(featured).getByRole('heading', { name: /Ati-Atihan Festival/i })
    ).toBeTruthy();
    expect(
      within(featured).getByText(/Kalibo · every 3rd Sunday of January/)
    ).toBeTruthy();
    expect(within(featured).getByText('Featured festival')).toBeTruthy();
    expect(
      within(featured)
        .getByRole('link', { name: /Read the full description/ })
        .getAttribute('href')
    ).toMatch(/^\/tourism\/explore\?sel=event-kalibo-\d+&view=map$/);
  });

  it('gets a plain note, not a calendar button, because its date moves', () => {
    band();
    const featured = screen.getByRole('article');
    expect(
      within(featured).queryByRole('button', { name: /Add to my calendar/ })
    ).toBeNull();
    expect(within(featured).getByText(/date changes each year/i)).toBeTruthy();
  });
});

describe('Add to my calendar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('is offered only for plain dates, with a note for the rest', () => {
    band();
    expect(
      within(card('January')).getAllByRole('button', {
        name: /Add to my calendar/,
      }).length
    ).toBeGreaterThan(0);
    const iwag = within(card('December'))
      .getAllByRole('listitem')
      .find(li => /Iwag it Kalibonhon/.test(li.textContent ?? ''))!;
    expect(within(iwag).queryByRole('button')).toBeNull();
    expect(within(iwag).getByText(/date isn't confirmed/i)).toBeTruthy();
  });

  it('downloads an .ics file made in the browser', () => {
    // Capture what the Blob is made from (reading a real Blob is not needed).
    const made: { text: string; type: string }[] = [];
    vi.stubGlobal(
      'Blob',
      class {
        constructor(parts: string[], opts: { type: string }) {
          made.push({ text: parts.join(''), type: opts.type });
        }
      }
    );
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    band();
    const item = within(card('June'))
      .getAllByRole('listitem')
      .find(li => /Kalibo Food Festival/.test(li.textContent ?? ''))!;
    fireEvent.click(
      within(item).getByRole('button', { name: /Add to my calendar/ })
    );
    expect(click).toHaveBeenCalledTimes(1);
    expect(made).toHaveLength(1);
    expect(made[0].type).toContain('text/calendar');
    const ics = made[0].text.split('\r\n').join('');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Kalibo Food Festival');
    expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{4}0612/);
    expect(ics).toMatch(/DTEND;VALUE=DATE:\d{4}0624/);
    expect(ics).toContain('LOCATION:Kalibo\\, Aklan');
    expect(ics).toContain('RRULE:FREQ=YEARLY');
  });
});
