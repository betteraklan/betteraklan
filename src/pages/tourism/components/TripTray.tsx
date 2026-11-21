import { useEffect, useRef } from 'react';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  MapIcon,
  Share2Icon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

import { LAYER_LABEL, type Rec } from '@/lib/tourism/explore';
import { routeKm } from '@/lib/tourism/trip';

import LayerGlyph from './LayerGlyph';
import { displayName } from '@/lib/tourism/displayName';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Stops by day, Day 1 first. */
  days: Rec[][];
  /** Move the stop at `index` (counted across all days) up or down. */
  onMove: (index: number, dir: -1 | 1) => void;
  /** Put a stop on day `day` (0-based); `days.length` starts a new day. */
  onSetDay: (id: string, day: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onShowRoute: () => void;
  onShare: () => void;
}

const KM = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

const pinned = (stops: Rec[]) =>
  stops.filter(
    (s): s is Rec & { lat: number; lon: number } =>
      s.lat != null && s.lon != null
  );

// Matches the map: odd days blue, even days orange.
const DAY_BADGE = ['bg-[#1D4FB0]', 'bg-kapwa-orange-700'];

/**
 * My trip: saved places by day, each day's straight-line distance, and a link
 * that carries the trip. A modal sheet on phones, a centred panel on desktop.
 */
export default function TripTray({
  open,
  onClose,
  days,
  onMove,
  onSetDay,
  onRemove,
  onClear,
  onShowRoute,
  onShare,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const stops = days.flat();
  const mapped = pinned(stops);
  // Each day is its own route: no line from one day's end to the next's start.
  const km = days.reduce((sum, d) => sum + routeKm(pinned(d)), 0);
  const approx = mapped.some(s => s.placement === 'approximate');
  const unmapped = stops.length - mapped.length;
  const multi = days.length > 1;

  return (
    <dialog
      ref={ref}
      aria-labelledby='trip-title'
      onClose={onClose}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className='bg-kapwa-bg-surface text-kapwa-text-strong m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-card p-0 shadow-elev-3 backdrop:bg-[#0f234b]/40 sm:m-auto sm:max-w-md sm:rounded-card motion-safe:open:animate-[explore-sheet-up_var(--dur-base)_var(--ease-out-expo)_both]'
    >
      <div className='space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'>
        <div className='flex items-center justify-between'>
          <h2 id='trip-title' className='type-title'>
            My trip
          </h2>
          <button
            type='button'
            aria-label='Close my trip'
            onClick={onClose}
            className='-mr-2 flex h-11 w-11 items-center justify-center rounded-full'
          >
            <XIcon aria-hidden='true' className='h-5 w-5' />
          </button>
        </div>

        {stops.length === 0 ? (
          <p className='text-kapwa-text-support type-body'>
            Nothing saved yet. Tap the bookmark on a place to add it to your
            trip.
          </p>
        ) : (
          <>
            <p className='type-body'>
              <strong>
                {stops.length} stop{stops.length === 1 ? '' : 's'}
              </strong>
              {multi && (
                <>
                  {' over '}
                  <strong>{days.length} days</strong>
                </>
              )}
              {km > 0 && (
                <>
                  {' · '}
                  {approx ? 'about ' : ''}
                  <strong>{KM.format(km)} km</strong> in straight lines
                </>
              )}
            </p>
            <p className='text-kapwa-text-support type-meta'>
              Straight-line distance between stops, not road distance
              {multi ? ', counted within each day' : ''}.
              {approx &&
                ' Some stops use a municipality-centre pin, so the total is approximate.'}
              {unmapped > 0 &&
                ` ${unmapped} stop${unmapped === 1 ? ' has' : 's have'} no map location and ${unmapped === 1 ? 'is' : 'are'} left out of the route.`}{' '}
              Use a stop&apos;s Day menu to plan more than one day.
            </p>

            <div className='max-h-[45vh] space-y-3 overflow-y-auto'>
              {days.map((day, d) => {
                const start = days.slice(0, d).flat().length;
                const dayKm = routeKm(pinned(day));
                return (
                  <section
                    key={d}
                    aria-labelledby={multi ? `trip-day-${d}` : undefined}
                  >
                    {multi && (
                      <h3
                        id={`trip-day-${d}`}
                        className='type-meta flex items-center gap-2 font-bold'
                      >
                        <span
                          aria-hidden='true'
                          className={`h-1 w-5 rounded-full ${DAY_BADGE[d % 2]}`}
                        />
                        Day {d + 1}
                        <span className='text-kapwa-text-support font-normal'>
                          · {day.length} stop{day.length === 1 ? '' : 's'}
                          {dayKm > 0 ? ` · ${KM.format(dayKm)} km` : ''}
                        </span>
                      </h3>
                    )}
                    <ol
                      start={start + 1}
                      aria-label={multi ? undefined : 'Stops'}
                      className='divide-kapwa-border-weak divide-y'
                    >
                      {day.map((s, j) => {
                        const i = start + j;
                        const name = displayName(s.name);
                        return (
                          <li
                            key={s.id}
                            className='flex items-center gap-2 py-2'
                          >
                            <span
                              aria-hidden='true'
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${DAY_BADGE[d % 2]}`}
                            >
                              {i + 1}
                            </span>
                            <span className='min-w-0 flex-1'>
                              <span className='type-meta block truncate font-semibold'>
                                {name}
                              </span>
                              <span className='text-kapwa-text-support type-meta flex flex-wrap items-center gap-x-1'>
                                <LayerGlyph layer={s.layer} size={12} />
                                {LAYER_LABEL[s.layer]}
                                {s.townName ? ` · ${s.townName}` : ''}
                              </span>
                              <select
                                aria-label={`Day for ${name}`}
                                value={d}
                                onChange={e =>
                                  onSetDay(s.id, Number(e.target.value))
                                }
                                className='border-kapwa-border-weak type-meta mt-1 min-h-11 rounded-control border bg-transparent px-2'
                              >
                                {days.map((_, k) => (
                                  <option key={k} value={k}>
                                    Day {k + 1}
                                  </option>
                                ))}
                                <option value={days.length}>
                                  New day (Day {days.length + 1})
                                </option>
                              </select>
                            </span>
                            <button
                              type='button'
                              aria-label={`Move ${name} up`}
                              disabled={i === 0}
                              onClick={() => onMove(i, -1)}
                              className='flex h-11 w-9 items-center justify-center rounded-control disabled:opacity-30'
                            >
                              <ArrowUpIcon
                                aria-hidden='true'
                                className='h-4 w-4'
                              />
                            </button>
                            <button
                              type='button'
                              aria-label={`Move ${name} down`}
                              disabled={i === stops.length - 1}
                              onClick={() => onMove(i, 1)}
                              className='flex h-11 w-9 items-center justify-center rounded-control disabled:opacity-30'
                            >
                              <ArrowDownIcon
                                aria-hidden='true'
                                className='h-4 w-4'
                              />
                            </button>
                            <button
                              type='button'
                              aria-label={`Remove ${name} from my trip`}
                              onClick={() => onRemove(s.id)}
                              className='text-kapwa-text-support flex h-11 w-9 items-center justify-center rounded-control'
                            >
                              <Trash2Icon
                                aria-hidden='true'
                                className='h-4 w-4'
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
            </div>

            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <button
                type='button'
                onClick={onShowRoute}
                disabled={mapped.length === 0}
                className='bg-kapwa-bg-brand-default text-kapwa-text-inverse inline-flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-bold disabled:opacity-50'
              >
                <MapIcon aria-hidden='true' className='h-4 w-4' />
                Show route
              </button>
              <button
                type='button'
                onClick={onShare}
                className='border-kapwa-border-weak inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-sm font-bold'
              >
                <Share2Icon aria-hidden='true' className='h-4 w-4' />
                Share trip
              </button>
              <button
                type='button'
                onClick={onClear}
                className='text-kapwa-text-brand ml-auto min-h-11 px-1 text-sm font-bold'
              >
                Clear trip
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
