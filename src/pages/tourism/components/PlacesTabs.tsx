import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ArrowRight } from 'lucide-react';

import RecordCard from './RecordCard';
import { ALL_RECORDS, pickSpread } from './tourismData';

type Kind = 'place' | 'event' | 'product';

const KINDS: { layer: Kind; label: string; noun: string }[] = [
  { layer: 'place', label: 'Places', noun: 'places' },
  { layer: 'event', label: 'Festivals', noun: 'festivals' },
  { layer: 'product', label: 'Local products', noun: 'local products' },
];

const COUNT: Record<Kind, number> = {
  place: ALL_RECORDS.filter(r => r.layer === 'place').length,
  event: ALL_RECORDS.filter(r => r.layer === 'event').length,
  product: ALL_RECORDS.filter(r => r.layer === 'product').length,
};

/** Category tabs of records, each deep-linking into Explore. */
export default function PlacesTabs() {
  const navigate = useNavigate();
  const [active, setActive] = useState<Kind>('place');
  const tabs = useRef<Partial<Record<Kind, HTMLButtonElement | null>>>({});
  const kind = KINDS.find(k => k.layer === active)!;
  const picks = pickSpread(ALL_RECORDS, active);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKey = (e: React.KeyboardEvent) => {
    const i = KINDS.findIndex(k => k.layer === active);
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % KINDS.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + KINDS.length) % KINDS.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? KINDS.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(KINDS[next].layer);
    tabs.current[KINDS[next].layer]?.focus();
  };

  return (
    <div className='space-y-4'>
      <div
        role='tablist'
        aria-label='Kinds of places'
        onKeyDown={onKey}
        className='flex flex-wrap gap-2'
      >
        {KINDS.map(k => {
          const on = k.layer === active;
          return (
            <button
              key={k.layer}
              ref={el => {
                tabs.current[k.layer] = el;
              }}
              type='button'
              role='tab'
              id={`places-tab-${k.layer}`}
              aria-selected={on}
              aria-controls='places-panel'
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(k.layer)}
              className={`type-meta inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand ${on ? 'bg-kapwa-bg-brand-default border-kapwa-border-brand text-kapwa-text-inverse' : 'bg-kapwa-bg-surface border-kapwa-border-weak text-kapwa-text-strong hover:border-kapwa-border-brand'}`}
            >
              {k.label}
              <span className={on ? '' : 'text-kapwa-text-support'}>
                {COUNT[k.layer]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role='tabpanel'
        id='places-panel'
        aria-labelledby={`places-tab-${active}`}
        className='space-y-4'
      >
        <p className='text-kapwa-text-support type-meta'>
          A spread of {kind.noun} from different towns, not a ranking.
        </p>
        <ul className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {picks.map(r => (
            <li key={r.id}>
              <RecordCard
                rec={r}
                selected={false}
                onSelect={id =>
                  navigate(
                    `/tourism/explore?sel=${id}${r.town ? `&town=${r.town}` : ''}&view=map`
                  )
                }
              />
            </li>
          ))}
        </ul>
        <Link
          to={`/tourism/explore?layer=${active}&view=list`}
          className='text-kapwa-text-brand type-body inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
        >
          See all {COUNT[active]} {kind.noun} in Explore
          <ArrowRight aria-hidden='true' className='h-4 w-4' />
        </Link>
      </div>
    </div>
  );
}
