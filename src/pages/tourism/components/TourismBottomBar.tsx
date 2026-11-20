import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CompassIcon, MapIcon } from 'lucide-react';

import { LAYER_ICON } from './layerMeta';
import { activeTab, BOTTOM_ITEMS, showBottomBar, TABS } from './tourismNav';

const ICON = {
  overview: CompassIcon,
  things: LAYER_ICON.place,
  festivals: LAYER_ICON.event,
  map: MapIcon,
} as const;

/**
 * Four-item bar fixed to the bottom on phones, above the safe-area inset.
 * Hidden on Explore, whose own bottom sheet and Map/List toggle sit there.
 */
export default function TourismBottomBar() {
  const { pathname, search } = useLocation();
  const shown = showBottomBar(pathname);
  const current = activeTab(pathname, search);

  // Pads the page (on phones only, see index.css) so the bar never hides it.
  useEffect(() => {
    if (!shown) return;
    document.body.classList.add('tourism-bottom-bar');
    return () => document.body.classList.remove('tourism-bottom-bar');
  }, [shown]);

  if (!shown) return null;
  return (
    <nav
      aria-label='Visit Aklan shortcuts'
      className='bg-kapwa-bg-surface border-kapwa-border-weak fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden'
    >
      <ul className='grid grid-cols-4'>
        {BOTTOM_ITEMS.map(id => {
          const tab = TABS.find(t => t.id === id)!;
          const Icon = ICON[id as keyof typeof ICON];
          const on = current === id;
          return (
            <li key={id}>
              <Link
                to={tab.to!}
                aria-current={on ? 'page' : undefined}
                className={`type-meta flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kapwa-border-brand ${on ? 'text-kapwa-text-brand' : 'text-kapwa-text-support'}`}
              >
                <Icon aria-hidden='true' className='h-6 w-6' />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
