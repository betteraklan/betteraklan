import { expect, test } from '../test-config';

// Links from the tourism pages into Explore, using Explore's own URL params.
// Each test follows a real link and checks Explore opens on the right thing.

test.describe('tourism: links into Explore', () => {
  test('a town page spot opens selected in Explore, in its town', async ({
    page,
  }) => {
    await page.goto('/tourism/malay');
    const card = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Pangihan Cave' }) });
    await card.getByRole('link', { name: /See on map/ }).click();

    await expect(page).toHaveURL(/\/tourism\/explore\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('town')).toBe('malay');
    expect(url.searchParams.get('sel')).toBe('place-malay-1');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Pangihan Cave' })
    ).toBeVisible();
  });

  test('a stay row opens that stay in Explore on the stay layer', async ({
    page,
  }) => {
    await page.goto('/tourism/accommodations/mainland');
    const link = page.getByRole('link', { name: /^Open in Explore/ }).first();
    const name = (await link.textContent())!
      .replace(/^\s*Open in Explore:\s*/, '')
      .trim();
    await link.click();

    await expect(page).toHaveURL(/\/tourism\/explore\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('layer')).toBe('stay');
    expect(url.searchParams.get('sel')).toMatch(/^stay-\d+$/);
    // Explore shows names in display case ("AGZAM RESORT" as "Agzam Resort").
    const exact = new RegExp(
      `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'i'
    );
    await expect(
      page.getByRole('heading', { level: 2, name: exact })
    ).toBeVisible();
  });

  test('a festival month card opens that month of festivals in Explore', async ({
    page,
  }) => {
    await page.goto('/tourism');
    await page
      .locator('#month-june')
      .locator('xpath=ancestor::section[1]')
      .getByRole('link')
      .click();

    await expect(page).toHaveURL(/\/tourism\/explore\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('layer')).toBe('event');
    expect(url.searchParams.get('from')).toMatch(/^\d{4}-06-01$/);
    expect(url.searchParams.get('to')).toMatch(/^\d{4}-06-30$/);
    // June festivals by their own description; January's Ati-Atihan is not.
    await expect(page.getByText('Malay Day').first()).toBeVisible();
    await expect(page.getByText('Kalibo Food Festival').first()).toBeVisible();
    await expect(
      page.getByText('KALIBO STO. NIÑO ATI-ATIHAN FESTIVAL')
    ).toHaveCount(0);
  });

  test('Take the tour starts the tour in Explore', async ({ page }) => {
    await page.goto('/tourism');
    await page.getByRole('link', { name: 'Take the tour' }).click();

    await expect(
      page.getByRole('button', { name: /^Pause tour, stop 1 of/ })
    ).toBeVisible();
    // tour=1 is dropped once the tour starts, so a reload does not restart it.
    await expect(page).not.toHaveURL(/tour=1/);
  });

  test('Copy link is visible and copies the current view', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/tourism/explore?town=kalibo&view=list');
    const copy = page.getByRole('button', { name: 'Copy link' });
    await expect(copy).toBeVisible();
    await copy.click();
    await expect(page.getByText('Link copied').first()).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('town=kalibo');
  });
});
