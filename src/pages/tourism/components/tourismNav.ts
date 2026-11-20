// Visit Aklan navigation: which tabs exist, where they go, and which one is
// active for a URL. Pure, so it can be tested without rendering.

export type TabId =
  | 'overview'
  | 'things'
  | 'festivals'
  | 'stay'
  | 'towns'
  | 'map';

/** A tab is a link, or (towns, stay) a button that opens a panel. */
export interface Tab {
  id: TabId;
  label: string;
  to?: string;
}

export const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', to: '/tourism' },
  {
    id: 'things',
    label: 'Things to do',
    to: '/tourism/explore?layer=place&view=list',
  },
  {
    id: 'festivals',
    label: 'Festivals',
    to: '/tourism/explore?layer=event&view=list',
  },
  { id: 'stay', label: 'Where to stay' },
  { id: 'towns', label: 'Towns' },
  { id: 'map', label: 'Map', to: '/tourism/explore?view=map' },
];

/** Where to stay: the two existing accommodation pages, plus stays on the map. */
export const STAY_LINKS = [
  { label: 'Boracay', to: '/tourism/accommodations/boracay' },
  { label: 'Aklan Mainland', to: '/tourism/accommodations/mainland' },
  { label: 'All stays on the map', to: '/tourism/explore?layer=stay&view=map' },
];

/** Phone bottom bar: four top-level destinations, all direct links. */
export const BOTTOM_ITEMS: TabId[] = ['overview', 'things', 'festivals', 'map'];

/** The tab that matches a URL, or null when none does. */
export function activeTab(pathname: string, search: string): TabId | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/tourism') return 'overview';
  if (path.startsWith('/tourism/accommodations')) return 'stay';
  if (path === '/tourism/explore') {
    const layer = new URLSearchParams(search).get('layer');
    if (layer === 'place') return 'things';
    if (layer === 'event') return 'festivals';
    if (layer === 'stay') return 'stay';
    return 'map';
  }
  if (/^\/tourism\/[^/]+$/.test(path)) return 'towns';
  return null;
}

/** The phone bottom bar is hidden on Explore, which has its own bottom sheet. */
export const showBottomBar = (pathname: string) =>
  !pathname.replace(/\/+$/, '').endsWith('/tourism/explore');
