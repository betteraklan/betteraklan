import { Link } from 'react-router-dom';

import { ArrowRight, CalendarHeart, CalendarPlusIcon } from 'lucide-react';

import { displayName } from '@/lib/tourism/displayName';
import { teaser } from '@/lib/tourism/explore';
import {
  buildIcs,
  canAddToCalendar,
  type FestivalDateInfo,
  MONTH_NAMES,
  monthGrid,
  pickFeatured,
  type PlacedFestival,
} from '@/lib/tourism/festivalDateText';

import { ALL_RECORDS, COUNTS } from './tourismData';

const EVENT_RECORDS = ALL_RECORDS.filter(r => r.layer === 'event');
const FESTIVALS = EVENT_RECORDS.map(r => ({
  id: r.id,
  name: r.name,
  description: r.description,
  townName: r.townName,
}));
type Festival = (typeof FESTIVALS)[number];

const GRID = monthGrid(FESTIVALS);
const FEATURED = pickFeatured(FESTIVALS);
const TOWNS = new Set(EVENT_RECORDS.map(r => r.town).filter(Boolean)).size;
const PER_CARD = 3;

/** Saves one festival as an .ics file, made in the browser (no server). */
function downloadIcs(f: Festival, info: FestivalDateInfo) {
  const ics = buildIcs([
    {
      uid: f.id,
      summary: displayName(f.name),
      location: f.townName ? `${f.townName}, Aklan` : undefined,
      info,
    },
  ]);
  const url = URL.createObjectURL(
    new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `${f.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A calendar button for a plain date; a plain note for any other. */
function CalendarAction({ f, info }: { f: Festival; info: FestivalDateInfo }) {
  if (canAddToCalendar(info))
    return (
      <button
        type='button'
        onClick={() => downloadIcs(f, info)}
        className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand'
      >
        <CalendarPlusIcon aria-hidden='true' className='h-4 w-4' />
        Add to my calendar
        <span className='sr-only'>: {displayName(f.name)}</span>
      </button>
    );
  return (
    <p className='text-kapwa-text-support type-meta'>
      {info.kind === 'weekday'
        ? "The date changes each year, so it can't be added to a calendar automatically."
        : "The date isn't confirmed, so it can't be added to a calendar."}
    </p>
  );
}

function DateLine({ f, info }: { f: Festival; info: FestivalDateInfo }) {
  return (
    <p className='text-kapwa-text-support type-meta'>
      {f.townName} · {info.text}
      {info.kind === 'unconfirmed' && (
        <span className='text-kapwa-text-strong font-semibold'>
          {' '}
          · Date not confirmed
        </span>
      )}
    </p>
  );
}

function MonthCard({
  month,
  items,
}: {
  month: string;
  items: PlacedFestival<Festival>[];
}) {
  const shown = items.slice(0, PER_CARD);
  const more = items.length - shown.length;
  const id = `month-${month.toLowerCase()}`;
  return (
    <li>
      <section
        aria-labelledby={id}
        className='bg-kapwa-bg-surface border-kapwa-border-weak h-full space-y-2 rounded-panel border p-4 shadow-elev-1'
      >
        <div className='flex items-baseline justify-between gap-2'>
          <h3 id={id} className='text-kapwa-text-strong type-body font-bold'>
            {month}
          </h3>
          <span className='text-kapwa-text-support type-meta'>
            {items.length} festival{items.length === 1 ? '' : 's'}
          </span>
        </div>
        {items.length === 0 ? (
          <p className='text-kapwa-text-support type-meta'>
            No festivals listed yet
          </p>
        ) : (
          <ul className='divide-kapwa-border-weak divide-y'>
            {shown.map(({ festival: f, info }) => (
              <li key={f.id} className='space-y-0.5 py-2 first:pt-0'>
                <p className='text-kapwa-text-strong type-body font-semibold'>
                  {displayName(f.name)}
                </p>
                <DateLine f={f} info={info} />
                <CalendarAction f={f} info={info} />
              </li>
            ))}
          </ul>
        )}
        {more > 0 && (
          <Link
            to='/tourism/explore?layer=event&view=list'
            className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center font-semibold hover:underline'
          >
            {more} more in {month}: see all festivals
          </Link>
        )}
      </section>
    </li>
  );
}

/**
 * "Festivals through the year": a featured Ati-Atihan, then January to
 * December. Each festival is listed under the month its own description names,
 * with the date wording exactly as written. The data holds no confirmed event
 * dates, so the section says so, and only a plain day-and-month can be added
 * to a calendar.
 */
export default function FestivalBand() {
  const featured = FEATURED;
  return (
    <section
      id='festivals'
      aria-labelledby='festivals-heading'
      data-reveal
      data-town=''
      className='bg-kapwa-bg-accent-orange-weak scroll-mt-28 space-y-5 rounded-card p-4 md:p-6'
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
        {COUNTS.festivals} festivals across {TOWNS} towns, listed by the date
        each description gives.
      </p>

      {featured && (
        <article
          aria-labelledby='featured-festival'
          className='bg-kapwa-bg-surface border-kapwa-border-weak space-y-2 rounded-card border p-4 shadow-elev-2 md:p-5'
        >
          <p className='bg-kapwa-bg-accent-orange-weak text-kapwa-text-strong type-meta inline-block rounded-full px-3 py-0.5 font-bold'>
            Featured festival
          </p>
          <h3
            id='featured-festival'
            className='text-kapwa-text-strong type-title font-bold'
          >
            {displayName(featured.festival.name)}
          </h3>
          <DateLine f={featured.festival} info={featured.info} />
          <p className='text-kapwa-text-support type-body'>
            {teaser(featured.festival.description)}
          </p>
          <div className='flex flex-wrap items-center gap-x-6 gap-y-1'>
            <Link
              to={`/tourism/explore?sel=${featured.festival.id}&view=map`}
              className='text-kapwa-text-brand type-meta inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
            >
              Read the full description
              <span className='sr-only'>
                {' '}
                of {displayName(featured.festival.name)}
              </span>
              <ArrowRight aria-hidden='true' className='h-4 w-4' />
            </Link>
            <CalendarAction f={featured.festival} info={featured.info} />
          </div>
        </article>
      )}

      <ol className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {MONTH_NAMES.map((m, i) => (
          <MonthCard key={m} month={m} items={GRID.months[i]} />
        ))}
      </ol>

      <div className='space-y-1'>
        {GRID.undated.length > 0 && (
          <p className='text-kapwa-text-strong type-body font-semibold'>
            {GRID.undated.length} more festivals don&apos;t give a date in their
            description.
          </p>
        )}
        <p className='text-kapwa-text-support type-meta'>
          BetterAklan has no confirmed event dates yet. Each date is the wording
          in the festival&apos;s own description, so check it before you plan.
        </p>
      </div>

      <Link
        to='/tourism/explore?layer=event&view=list'
        className='text-kapwa-text-brand type-body inline-flex min-h-11 items-center gap-1.5 font-semibold hover:underline'
      >
        See all {COUNTS.festivals} festivals in Explore
        <ArrowRight aria-hidden='true' className='h-4 w-4' />
      </Link>
    </section>
  );
}
