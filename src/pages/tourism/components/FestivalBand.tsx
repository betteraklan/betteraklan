import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ArrowRight, CalendarHeart } from 'lucide-react';

import FestivalStrip from './FestivalStrip';
import { ALL_RECORDS } from './tourismData';

const EVENTS = ALL_RECORDS.filter(r => r.layer === 'event');
const TOWNS = new Set(EVENTS.map(e => e.town).filter(Boolean)).size;

/**
 * "Festivals through the year" on the orange-50 band. Uses Explore's
 * FestivalStrip, so only recorded dates place a festival in a month.
 */
export default function FestivalBand() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  return (
    <section
      id='festivals'
      aria-labelledby='festivals-heading'
      data-reveal
      data-town=''
      className='bg-kapwa-bg-accent-orange-weak scroll-mt-28 space-y-4 rounded-card p-4 md:p-6'
    >
      <div className='flex items-center gap-2'>
        <CalendarHeart
          aria-hidden='true'
          className='text-kapwa-text-accent-orange h-4 w-4'
        />
        <h2
          id='festivals-heading'
          className='kapwa-heading-md text-kapwa-text-strong'
        >
          Festivals through the year
        </h2>
      </div>
      <p className='text-kapwa-text-support type-body'>
        {EVENTS.length} festivals across {TOWNS} towns. Pick a month to see the
        festivals with a recorded date.
      </p>
      <div className='bg-kapwa-bg-surface border-kapwa-border-weak overflow-hidden rounded-card border'>
        <FestivalStrip
          events={EVENTS}
          today={today}
          selected={null}
          onSelect={m =>
            m &&
            navigate(
              `/tourism/explore?layer=event&view=list&from=${m.from}&to=${m.to}`
            )
          }
          onOpen={id => navigate(`/tourism/explore?sel=${id}&view=map`)}
        />
      </div>
      <Link
        to='/tourism/explore?layer=event&view=list'
        className='text-kapwa-text-brand type-body inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
      >
        See all {EVENTS.length} festivals in Explore
        <ArrowRight aria-hidden='true' className='h-4 w-4' />
      </Link>
    </section>
  );
}
