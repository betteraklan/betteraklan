import { Link } from 'react-router-dom';

import { ArrowRightIcon, MapIcon } from 'lucide-react';

import type { TownShape } from '@/lib/tourism/shapes';

interface Props {
  title: string;
  description: string;
  shapes: { viewBox: string; towns: TownShape[] };
}

/**
 * Tourism hero. The backdrop drifts in a slow Ken Burns move (CSS only,
 * transform on one layer, off with reduced motion). There are no credited
 * tourism photos yet, so the backdrop is drawn: sea, waves and the province
 * outline from the municipality boundaries.
 */
export default function TourismHero({ title, description, shapes }: Props) {
  return (
    <section
      aria-labelledby='tourism-title'
      data-town=''
      className='relative isolate flex min-h-[320px] items-end overflow-hidden rounded-card text-white shadow-elev-2 sm:min-h-[400px]'
    >
      <div aria-hidden='true' className='ken-burns absolute -inset-[6%] -z-10'>
        <div className='absolute inset-0 bg-[linear-gradient(170deg,#0B3FAE_0%,#1556D6_45%,#2F7BEA_100%)]' />
        <div className='aklan-waves absolute inset-0' />
        <div className='absolute -top-24 right-[12%] h-72 w-72 rounded-full bg-[#FCD116]/30 blur-3xl' />
        <svg
          viewBox={shapes.viewBox}
          className='absolute top-[8%] right-[-4%] h-[95%] w-auto opacity-90'
        >
          {shapes.towns.map(t => (
            <path
              key={t.slug}
              d={t.d}
              fill='rgba(255,255,255,0.16)'
              stroke='rgba(255,255,255,0.45)'
              strokeWidth={1.2}
              vectorEffect='non-scaling-stroke'
            />
          ))}
        </svg>
      </div>
      {/* Scrim keeps the text readable over any part of the drifting art. */}
      <div
        aria-hidden='true'
        className='absolute inset-0 -z-10 bg-gradient-to-r from-[#0a2a6b]/90 via-[#0a2a6b]/55 to-transparent'
      />

      <div className='max-w-xl p-6 sm:p-10'>
        <p className='type-meta font-bold tracking-[0.2em] text-white/75 uppercase'>
          Visit Aklan
        </p>
        <h1 id='tourism-title' className='type-display mt-1 text-white'>
          {title}
        </h1>
        <p className='type-body mt-2 text-white/90'>{description}</p>
        <div className='mt-5 flex flex-wrap gap-2'>
          <Link
            to='/tourism/explore'
            className='inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#0B3FAE] shadow-elev-2'
          >
            <MapIcon aria-hidden='true' className='h-4 w-4' />
            Explore the map
          </Link>
          <a
            href='#municipalities'
            className='inline-flex min-h-11 items-center gap-2 rounded-full border border-white/60 px-5 text-sm font-bold text-white'
          >
            Browse municipalities
            <ArrowRightIcon aria-hidden='true' className='h-4 w-4' />
          </a>
        </div>
      </div>
    </section>
  );
}
