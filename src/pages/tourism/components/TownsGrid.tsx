import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { tierBounds } from '@/lib/tourism/explore';

import { SOURCES, TIER_COLOR, tierFor, townCounts } from './tourismData';

const { counts, max } = townCounts();
const TOWNS = [...SOURCES.municipalities].sort((a, b) =>
  a.name.localeCompare(b.name)
);
const range = (t: number) => {
  const [lo, hi] = tierBounds(t, max);
  return lo === hi ? `${hi}` : `${lo}–${hi}`;
};

interface Props {
  /** Slug of the town page being viewed, if any. */
  activeSlug?: string | null;
  onNavigate?: () => void;
}

/**
 * The 17 municipalities, each shaded with the same record-count ramp as the
 * Explore map. Counts are written out, so the shading is never the only cue.
 */
export default function TownsGrid({ activeSlug, onNavigate }: Props) {
  const root = useRef<HTMLDivElement>(null);
  // Opened from the Towns tab: focus goes to the first town, so a keyboard
  // user doesn't have to Tab past the rest of the tab row to reach the panel.
  useEffect(() => {
    root.current?.querySelector('a')?.focus();
  }, []);
  return (
    <div ref={root} className='space-y-3'>
      <div
        role='group'
        aria-label='Shading legend'
        className='text-kapwa-text-support type-meta flex flex-wrap items-center gap-1.5'
      >
        <span>Shading shows how many BetterAklan records each town has:</span>
        <span className='inline-flex items-center gap-1.5'>
          Fewer
          {TIER_COLOR.slice(1).map((c, i) => (
            <span
              key={c}
              title={`${range(i + 1)} records`}
              aria-hidden='true'
              className='h-2.5 w-5 rounded-[2px]'
              style={{ background: c }}
            />
          ))}
          More
        </span>
        <span className='sr-only'>
          {TIER_COLOR.slice(1)
            .map((_, i) => `shade ${i + 1}: ${range(i + 1)} records`)
            .join('; ')}
        </span>
      </div>

      <ul className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
        {TOWNS.map(m => {
          const n = counts.get(m.slug) ?? 0;
          const current = activeSlug === m.slug;
          return (
            <li key={m.slug}>
              <Link
                to={`/tourism/${m.slug}`}
                state={{ scrollToContent: true }}
                aria-current={current ? 'page' : undefined}
                onClick={onNavigate}
                className={`bg-kapwa-bg-surface flex min-h-11 items-center gap-3 rounded-card border p-2.5 transition-shadow duration-(--dur-fast) hover:shadow-elev-1 focus-visible:outline-2 focus-visible:outline-kapwa-border-brand ${current ? 'border-kapwa-border-brand' : 'border-kapwa-border-weak'}`}
              >
                <span
                  aria-hidden='true'
                  className='border-kapwa-border-weak h-8 w-8 shrink-0 rounded-md border'
                  style={{ background: TIER_COLOR[tierFor(n, max)] }}
                />
                <span className='min-w-0'>
                  <span className='text-kapwa-text-strong type-body block truncate font-semibold'>
                    {m.name}
                  </span>
                  <span className='text-kapwa-text-support type-meta'>
                    {n} record{n === 1 ? '' : 's'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
