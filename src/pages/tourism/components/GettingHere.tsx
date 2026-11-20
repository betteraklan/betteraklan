import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ArrowRightIcon, PlaneIcon } from 'lucide-react';

import { formatUpdatedAgo } from '@/lib/flightStatus';
import { fetchFlightsData } from '@/lib/flights';
import { flightsLine, todaysFlights } from '@/lib/tourism/gettingHere';

import airports from '@/data/airports.json';
import type { FlightsResponseData } from '@/types/flights';

type Status = 'loading' | 'ready' | 'unavailable';

/**
 * "Getting here" on the Overview: the province's two airports, from the
 * airports data, each with a live line from the flights API. If the flights
 * can't be loaded the line is simply left out (no error, no spinner left
 * behind) and the link to the full schedule remains.
 *
 * Boat and road steps (for example the Caticlan jetty) and travel times are
 * not shown: no sourced field in the data holds them.
 */
export default function GettingHere() {
  const [data, setData] = useState<FlightsResponseData | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let live = true;
    fetchFlightsData().then(
      d => {
        if (!live) return;
        setData(d);
        setStatus('ready');
      },
      () => live && setStatus('unavailable')
    );
    return () => {
      live = false;
    };
  }, []);

  const now = new Date();
  const lines = airports.map(a => {
    const schedule = data?.airports.find(s => s.slug === a.slug);
    return {
      airport: a,
      line: schedule ? flightsLine(a.iata, todaysFlights(schedule, now)) : null,
    };
  });
  const anyLine = lines.some(l => l.line);

  return (
    <section
      aria-labelledby='getting-here-heading'
      data-reveal
      data-town=''
      className='bg-kapwa-bg-surface border-kapwa-border-weak space-y-4 rounded-card border p-4 shadow-elev-1 md:p-6'
    >
      <div className='flex items-center gap-2'>
        <PlaneIcon
          aria-hidden='true'
          className='text-kapwa-text-brand h-4 w-4'
        />
        <h2
          id='getting-here-heading'
          className='kapwa-heading-md text-kapwa-text-strong'
        >
          Getting here
        </h2>
      </div>

      <ul className='grid gap-4 md:grid-cols-2'>
        {lines.map(({ airport, line }) => (
          <li
            key={airport.slug}
            className='border-kapwa-border-weak space-y-1 rounded-panel border p-4'
          >
            <h3 className='text-kapwa-text-strong type-body font-bold'>
              {airport.shortName ?? airport.name} ({airport.iata})
            </h3>
            <p className='text-kapwa-text-support type-meta'>
              In {airport.municipality}, Aklan
            </p>
            {line && (
              <p className='text-kapwa-text-strong type-body font-semibold'>
                {line}
              </p>
            )}
            <Link
              to={`/airports/${airport.slug}`}
              className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center gap-1 font-semibold hover:underline'
            >
              Live schedule
              <span className='sr-only'> for {airport.name}</span>
              <ArrowRightIcon aria-hidden='true' className='h-4 w-4' />
            </Link>
          </li>
        ))}
      </ul>

      <p className='text-kapwa-text-support type-meta'>
        {status === 'ready' && anyLine && data
          ? `Flight counts are the flights listed today.${formatUpdatedAgo(data.updatedAt) ? ` Updated ${formatUpdatedAgo(data.updatedAt)}.` : ''}`
          : 'Flight times change. Check the live schedule before you travel.'}
      </p>
    </section>
  );
}
