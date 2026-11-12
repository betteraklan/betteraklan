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

interface Props {
  open: boolean;
  onClose: () => void;
  stops: Rec[];
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onShowRoute: () => void;
  onShare: () => void;
}

const KM = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

/**
 * My trip: saved places in order, total straight-line distance, and a link
 * that carries the trip. A modal sheet on phones, a centred panel on desktop.
 */
export default function TripTray({
  open,
  onClose,
  stops,
  onMove,
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

  const mapped = stops.filter(
    (s): s is Rec & { lat: number; lon: number } =>
      s.lat != null && s.lon != null
  );
  const km = routeKm(mapped);
  const approx = mapped.some(s => s.placement === 'approximate');
  const unmapped = stops.length - mapped.length;

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
              {mapped.length > 1 && (
                <>
                  {' · '}
                  {approx ? 'about ' : ''}
                  <strong>{KM.format(km)} km</strong> in straight lines
                </>
              )}
            </p>
            <p className='text-kapwa-text-support type-meta'>
              Straight-line distance between stops, not road distance.
              {approx &&
                ' Some stops use a municipality-centre pin, so the total is approximate.'}
              {unmapped > 0 &&
                ` ${unmapped} stop${unmapped === 1 ? ' has' : 's have'} no map location and ${unmapped === 1 ? 'is' : 'are'} left out of the route.`}
            </p>

            <ol className='divide-kapwa-border-weak max-h-[45vh] divide-y overflow-y-auto'>
              {stops.map((s, i) => (
                <li key={s.id} className='flex items-center gap-2 py-2'>
                  <span
                    aria-hidden='true'
                    className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D4FB0] text-xs font-bold text-white'
                  >
                    {i + 1}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='type-meta block truncate font-semibold'>
                      {s.name}
                    </span>
                    <span className='text-kapwa-text-support type-meta flex items-center gap-1'>
                      <LayerGlyph layer={s.layer} size={12} />
                      {LAYER_LABEL[s.layer]}
                      {s.townName ? ` · ${s.townName}` : ''}
                    </span>
                  </span>
                  <button
                    type='button'
                    aria-label={`Move ${s.name} up`}
                    disabled={i === 0}
                    onClick={() => onMove(i, -1)}
                    className='flex h-11 w-9 items-center justify-center rounded-control disabled:opacity-30'
                  >
                    <ArrowUpIcon aria-hidden='true' className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    aria-label={`Move ${s.name} down`}
                    disabled={i === stops.length - 1}
                    onClick={() => onMove(i, 1)}
                    className='flex h-11 w-9 items-center justify-center rounded-control disabled:opacity-30'
                  >
                    <ArrowDownIcon aria-hidden='true' className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    aria-label={`Remove ${s.name} from my trip`}
                    onClick={() => onRemove(s.id)}
                    className='text-kapwa-text-support flex h-11 w-9 items-center justify-center rounded-control'
                  >
                    <Trash2Icon aria-hidden='true' className='h-4 w-4' />
                  </button>
                </li>
              ))}
            </ol>

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
