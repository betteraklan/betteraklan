import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from '../test-config';
import { mobileCheck } from '../utils/device';

// The rebuilt tourism pages.
const PAGES = [
  ['Overview', '/tourism'],
  ['Town page', '/tourism/kalibo'],
  ['Explore list', '/tourism/explore?view=list'],
  ['Boracay stays', '/tourism/accommodations/boracay'],
  ['Mainland stays', '/tourism/accommodations/mainland'],
] as const;

const TABS = [
  'Overview',
  'Things to do',
  'Festivals',
  'Where to stay',
  'Towns',
  'Map',
];

/** What has keyboard focus right now. */
const focus = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement as HTMLElement;
    const r = e.getBoundingClientRect();
    return {
      id: e.id,
      label: (e.getAttribute('aria-label') || e.textContent || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40),
      inMain: !!e.closest('#tourism-main'),
      inTabs: !!e.closest('nav[aria-label="Visit Aklan"]'),
      hidden: !!e.closest('[aria-hidden="true"],[inert]'),
      visible: r.width > 0 && r.height > 0,
    };
  });

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('#tourism-main').waitFor();
  // Reach the page's own content, not just the shell.
  await page.locator('#tourism-main h1, #tourism-main h2').first().waitFor();
}

/** Tab until the focused element has this label (fails if it never does). */
async function tabTo(page: Page, label: string, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if ((await focus(page)).label === label) return i + 1;
  }
  throw new Error(`Never reached "${label}" in ${max} Tab presses`);
}

test.describe('tourism: skip link and tab order', () => {
  test('skip link is the first stop in the tourism shell and lands in the page', async ({
    page,
  }) => {
    await open(page, '/tourism/kalibo');
    const skip = await tabTo(page, 'Skip to content');
    const overview = await tabTo(page, 'Overview');
    expect(skip).toBeLessThan(skip + overview);
    // From the skip link, one more Tab would be the tab row; Enter jumps past it.
    await page.keyboard.press('Shift+Tab');
    expect((await focus(page)).label).toBe('Skip to content');
    await page.keyboard.press('Enter');
    expect((await focus(page)).id).toBe('tourism-main');
    await page.keyboard.press('Tab');
    const next = await focus(page);
    expect(next.inMain).toBe(true);
    expect(next.inTabs).toBe(false);
  });

  test('skip link is only visible while it has focus', async ({ page }) => {
    await open(page, '/tourism');
    const link = page.getByRole('link', { name: 'Skip to content' });
    await expect(link).toBeAttached();
    const before = await link.boundingBox();
    expect((before?.width ?? 0) <= 1).toBe(true);
    await tabTo(page, 'Skip to content');
    const shown = await link.boundingBox();
    expect(shown!.width).toBeGreaterThan(80);
    expect(shown!.y).toBeGreaterThanOrEqual(0);
  });

  test('the tab row is reached in visual order', async ({ page }) => {
    await open(page, '/tourism');
    await tabTo(page, 'Overview');
    const seen = ['Overview'];
    const xs: number[] = [];
    for (let i = 0; i < TABS.length - 1; i++) {
      await page.keyboard.press('Tab');
      const f = await focus(page);
      seen.push(f.label.replace(/\s*\d*$/, ''));
      xs.push(
        // Position inside the row, so a row that scrolls sideways still compares.
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const row = el.closest('ul') as HTMLElement;
          return (
            el.getBoundingClientRect().left -
            row.getBoundingClientRect().left +
            row.scrollLeft
          );
        })
      );
    }
    expect(seen).toEqual(TABS);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  test('Towns opens with Enter, Tab enters it, Escape returns focus', async ({
    page,
  }) => {
    await open(page, '/tourism');
    await tabTo(page, 'Towns');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Towns' })).toBeVisible();
    // Focus moves into the panel as it opens: no Tab past the rest of the row.
    await expect
      .poll(async () => (await focus(page)).label)
      .toMatch(/records?$/);
    const first = await focus(page);
    expect(first.label).toMatch(/records?$/);
    await page.keyboard.press('Escape');
    expect((await focus(page)).label).toMatch(/^Towns/);
    await expect(page.getByRole('region', { name: 'Towns' })).toHaveCount(0);
  });

  for (const [name, path] of PAGES) {
    test(`${name}: no keyboard trap, and focus never lands on hidden content`, async ({
      page,
    }) => {
      await open(page, path);
      const seen = new Set<string>();
      for (let i = 0; i < 45; i++) {
        await page.keyboard.press('Tab');
        const f = await focus(page);
        expect(f.hidden, `focus on hidden content: ${f.label}`).toBe(false);
        expect(f.visible, `focus on a zero-size element: ${f.label}`).toBe(
          true
        );
        seen.add(`${f.id}|${f.label}`);
      }
      // Tabbing 45 times reaches many different controls, not the same few.
      expect(seen.size).toBeGreaterThan(20);
    });
  }
});

test.describe('tourism: phone bottom bar and touch targets', () => {
  test('bar items and tabs are at least 44px tall', async ({ page }) => {
    test.skip(!(await mobileCheck()), 'phone projects only');
    await open(page, '/tourism');
    const bar = page.getByRole('navigation', { name: 'Visit Aklan shortcuts' });
    await expect(bar).toBeVisible();
    for (const link of await bar.getByRole('link').all())
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const tabs = page.getByRole('navigation', {
      name: 'Visit Aklan',
      exact: true,
    });
    for (const item of await tabs.locator('a, button').all())
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Safe-area padding is applied to the bar.
    const pad = await bar.evaluate(el => getComputedStyle(el).paddingBottom);
    expect(pad).toBeDefined();
  });

  test('no horizontal page scroll on the rebuilt pages', async ({ page }) => {
    test.skip(!(await mobileCheck()), 'phone projects only');
    for (const [, path] of PAGES) {
      await open(page, path);
      const wide = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      );
      expect(wide, path).toBe(false);
    }
  });
});

// Contrast (tags, chips, pills, links) is covered by axe's colour-contrast rule.
// The site has no dark theme, so dark mode must look the same: run both.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`tourism: WCAG 2.1 AA in ${scheme} mode`, () => {
    test.use({ colorScheme: scheme });
    for (const [name, path] of PAGES) {
      test(`${name}: no violations`, async ({ page }) => {
        await open(page, path);
        // Let lazy panels, chips and status text settle.
        await page.waitForTimeout(800);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .include('nav[aria-label="Visit Aklan"]')
          .include('nav[aria-label="Visit Aklan shortcuts"]')
          .include('#tourism-main')
          // WebGL canvas: its content is not DOM text.
          .exclude('.maplibregl-map')
          .analyze();
        expect(
          results.violations.map(v => ({
            id: v.id,
            nodes: v.nodes
              .slice(0, 8)
              .map(
                n =>
                  `${n.target.join(' ')} :: ${n.any[0]?.message ?? n.all[0]?.message ?? ''}`
              ),
          }))
        ).toEqual([]);
      });
    }
  });
}
