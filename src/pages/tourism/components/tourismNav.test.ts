import { describe, expect, it } from 'vitest';

import {
  activeTab,
  BOTTOM_ITEMS,
  showBottomBar,
  STAY_LINKS,
  TABS,
} from './tourismNav';

describe('tourism tabs', () => {
  it('has the six tabs in order', () => {
    expect(TABS.map(t => t.label)).toEqual([
      'Overview',
      'Things to do',
      'Festivals',
      'Where to stay',
      'Towns',
      'Map',
    ]);
  });

  it.each([
    ['/tourism', '', 'overview'],
    ['/tourism/', '', 'overview'],
    ['/tourism/explore', '?layer=place&view=list', 'things'],
    ['/tourism/explore', '?layer=event', 'festivals'],
    ['/tourism/explore', '?layer=stay', 'stay'],
    ['/tourism/explore', '?town=kalibo&view=map', 'map'],
    ['/tourism/explore', '', 'map'],
    ['/tourism/accommodations/boracay', '', 'stay'],
    ['/tourism/accommodations/mainland', '', 'stay'],
    ['/tourism/kalibo', '', 'towns'],
    ['/government', '', null],
  ])('%s%s is %s', (path, search, tab) => {
    expect(activeTab(path, search)).toBe(tab);
  });

  it('links only to existing tourism URLs and keeps both stay pages reachable', () => {
    const links = [
      ...TABS.flatMap(t => (t.to ? [t.to] : [])),
      ...STAY_LINKS.map(s => s.to),
    ];
    for (const to of links)
      expect(to).toMatch(
        /^\/tourism(\/explore(\?.*)?|\/accommodations\/(boracay|mainland))?$/
      );
    expect(STAY_LINKS.map(s => s.to)).toEqual(
      expect.arrayContaining([
        '/tourism/accommodations/boracay',
        '/tourism/accommodations/mainland',
      ])
    );
  });

  it('bottom bar has four direct links and hides on Explore', () => {
    expect(BOTTOM_ITEMS).toHaveLength(4);
    for (const id of BOTTOM_ITEMS)
      expect(TABS.find(t => t.id === id)?.to).toBeTruthy();
    expect(showBottomBar('/tourism/explore')).toBe(false);
    expect(showBottomBar('/tourism/kalibo')).toBe(true);
    expect(showBottomBar('/tourism')).toBe(true);
  });
});
