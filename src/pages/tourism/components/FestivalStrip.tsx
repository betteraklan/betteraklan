import { useMemo } from 'react';

import { CalendarX2Icon } from 'lucide-react';

import type { Rec } from '@/lib/tourism/explore';
import {
  DATE_STATUS_LABEL,
  festivalBuckets,
  formatDateRange,
  monthsFrom,
  overlaps,
} from '@/lib/tourism/festivalDates';

import { LAYER_COLOR } from './layerMeta';

interface Props {
  /** All festival records (dated or not). */
  events: Rec[];
  today: Date;
  /** 'YYYY-MM' of the selected month, or null. */
  selected: string | null;
  onSelect: (month: { key: string; from: string; to: string } | null) => void;
  onOpen: (id: string) => void;
}

const DOTS = 3;

/**
 * Horizontal 12-month festival strip. Only recorded dates (confirmed or
 * tentative) place a festival; nothing is inferred from names or past years.
 */
export default function FestivalStrip({
  events,
  today,
  selected,
  onSelect,
  onOpen,
}: Props) {
  const months = useMemo(() => monthsFrom(today), [today]);
  const perMonth = useMemo(
    () =>
      new Map(
        months.map(m => [m.key, events.filter(e => overlaps(e, m.from, m.to))])
      ),
    [months, events]
  );
  const buckets = useMemo(
    () => festivalBuckets(events, today),
    [events, today]
  );
  const undated = events.filter(e => e.dateStatus === 'unavailable').length;
  const anyDated = undated < events.length;
  const color = LAYER_COLOR.event;

  const group = (title: string, list: Rec[]) =>
    list.length > 0 && (
      <div>
        <h4 className='type-meta text-kapwa-text-support font-semibold'>
          {title}
        </h4>
        <ul className='mt-1 space-y-1'>
          {list.map(e => (
            <li key={e.id}>
              <button
                type='button'
                onClick={() => onOpen(e.id)}
                className='type-meta hover:bg-kapwa-bg-hover flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-2 text-left'
              >
                <span className='min-w-0 truncate font-semibold'>
                  {e.name}
                  {e.townName && (
                    <span className='text-kapwa-text-support font-normal'>
                      {' '}
                      · {e.townName}
                    </span>
                  )}
                </span>
                <span className='text-kapwa-text-support shrink-0'>
                  {formatDateRange(e.dates!.start!, e.dates!.end)} ·{' '}
                  {DATE_STATUS_LABEL[e.dateStatus]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section
      aria-labelledby='festival-strip'
      className='border-kapwa-border-weak space-y-3 border-b px-3 py-3'
    >
      <div className='flex items-baseline justify-between gap-2 px-1'>
        <h3 id='festival-strip' className='type-meta font-bold'>
          Festival calendar
        </h3>
        {selected && (
          <button
            type='button'
            onClick={() => onSelect(null)}
            className='text-kapwa-text-brand type-meta min-h-11 font-semibold'
          >
            Show all months
          </button>
        )}
      </div>

      <div
        role='group'
        aria-label='Months'
        className='-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1'
      >
        {months.map(m => {
          const list = perMonth.get(m.key) ?? [];
          const on = selected === m.key;
          const isNow = m.key === months[0].key;
          return (
            <button
              key={m.key}
              type='button'
              disabled={list.length === 0}
              aria-pressed={on}
              aria-label={`${m.label} ${m.year}: ${list.length ? `${list.length} festival${list.length === 1 ? '' : 's'}` : 'no recorded festival dates'}`}
              onClick={() => onSelect(on ? null : m)}
              className={`flex min-h-14 w-14 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-control border transition-colors duration-(--dur-fast) disabled:cursor-default ${on ? 'border-[#1D4FB0] bg-[#1D4FB0] text-white' : 'border-kapwa-border-weak enabled:hover:bg-kapwa-bg-hover'} ${list.length === 0 && !on ? 'text-kapwa-text-support' : ''}`}
            >
              <span
                className={`type-meta leading-none ${isNow ? 'font-bold' : ''}`}
              >
                {m.label}
              </span>
              {m.month === 1 && (
                <span className='text-[10px] leading-none opacity-70'>
                  {m.year}
                </span>
              )}
              <span
                aria-hidden='true'
                className='flex h-2 items-center gap-0.5'
              >
                {list.slice(0, DOTS).map(e => (
                  <span
                    key={e.id}
                    className='h-1.5 w-1.5 rounded-full border'
                    style={{
                      borderColor: on ? 'white' : color,
                      // Confirmed: filled; tentative: hollow.
                      background:
                        e.dateStatus === 'confirmed'
                          ? on
                            ? 'white'
                            : color
                          : 'transparent',
                    }}
                  />
                ))}
                {list.length > DOTS && (
                  <span className='text-[9px] leading-none'>
                    +{list.length - DOTS}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {anyDated ? (
        <div className='space-y-2'>
          {group('Happening now', buckets.now)}
          {group('This month', buckets.thisMonth)}
          {group('Upcoming', buckets.upcoming)}
          {undated > 0 && (
            <p className='text-kapwa-text-support type-meta px-1'>
              {undated} more festival{undated === 1 ? '' : 's'}:{' '}
              {DATE_STATUS_LABEL.unavailable.toLowerCase()}.
            </p>
          )}
        </div>
      ) : (
        <p className='text-kapwa-text-support type-meta flex items-start gap-2 px-1'>
          <CalendarX2Icon
            aria-hidden='true'
            className='mt-0.5 h-4 w-4 shrink-0'
          />
          <span>
            No festival dates are recorded yet. All {events.length} festivals
            are listed below as &ldquo;{DATE_STATUS_LABEL.unavailable}&rdquo;;
            dates appear here once they&apos;re checked against a source.
          </span>
        </p>
      )}
    </section>
  );
}
