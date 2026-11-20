import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { TourismImage as Photo } from '@/types/tourism';

import TourismImage from './TourismImage';

export interface HeroChip {
  label: string;
  to: string;
}

export interface HeroStat {
  value: number;
  label: string;
}

interface Props {
  title: string;
  description: string;
  /** Small label above the title. */
  eyebrow?: string;
  breadcrumb?: ReactNode;
  /** The search form (the Overview passes OverviewSearch). */
  search?: ReactNode;
  /** Category links that open Explore. */
  chips?: HeroChip[];
  /** Counts computed from the data. */
  stats?: HeroStat[];
  /** A video card shown beside the text (below it on phones). */
  video?: ReactNode;
  /** Buttons under the description (town pages). */
  actions?: ReactNode;
  /** Shown beside the text, e.g. a MiniMap (town pages). */
  aside?: ReactNode;
  /**
   * Background photo, from `tourism-images.json`. There is none yet, so the
   * background is a brand-950 to brand-600 gradient. A photo given here fills
   * the same slot under a brand-950 scrim; nothing else in the layout moves.
   */
  image?: Photo;
}

const CHIP =
  'type-meta inline-flex min-h-11 items-center rounded-full border border-white/50 bg-white/10 px-4 font-semibold text-white transition-colors duration-(--dur-fast) hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/**
 * Tourism hero: breadcrumb, title, search, category chips, a stats strip and
 * a video card, over a background slot. Every part is optional, so the town
 * page uses the same hero with its own buttons and mini-map.
 */
export default function TourismHero({
  title,
  description,
  eyebrow = 'Visit Aklan',
  breadcrumb,
  search,
  chips,
  stats,
  video,
  actions,
  aside,
  image,
}: Props) {
  const side = video ?? aside;
  return (
    <section
      aria-labelledby='tourism-title'
      data-town=''
      className='relative isolate overflow-hidden rounded-card text-white shadow-elev-2'
    >
      <TourismImage fill image={image} />

      <div
        className={`grid gap-8 p-6 sm:p-10 ${video ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center' : 'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'}`}
      >
        <div className='min-w-0 max-w-2xl space-y-5'>
          {breadcrumb}
          <div>
            <p className='type-meta font-bold tracking-[0.2em] text-white/85 uppercase'>
              {eyebrow}
            </p>
            <h1 id='tourism-title' className='type-display mt-1 text-white'>
              {title}
            </h1>
            <p className='type-body mt-2 text-white/90'>{description}</p>
          </div>

          {search}

          {chips && chips.length > 0 && (
            <nav aria-label='Browse by category'>
              <ul className='flex flex-wrap gap-2'>
                {chips.map(c => (
                  <li key={c.label}>
                    <Link to={c.to} className={CHIP}>
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}

          {stats && stats.length > 0 && (
            <dl className='grid grid-cols-2 gap-4 border-t border-white/30 pt-4 sm:grid-cols-4'>
              {stats.map(s => (
                // Number above its label, while the label still comes first
                // for screen readers (a term, then its value).
                <div key={s.label} className='flex flex-col-reverse'>
                  <dt className='type-meta text-white/90'>{s.label}</dt>
                  <dd className='type-title font-bold text-white'>
                    {s.value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {side && (
          <div
            className={
              video
                ? 'bg-black/20 overflow-hidden rounded-card shadow-elev-3 ring-1 ring-white/25'
                : 'w-32 shrink-0 self-end sm:w-44'
            }
          >
            {side}
          </div>
        )}
      </div>
    </section>
  );
}
