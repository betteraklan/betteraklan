import { useEffect, useRef } from 'react';

import { XIcon } from 'lucide-react';

import { LAYER_LABEL, type Layer } from '@/lib/tourism/explore';

interface Props {
  open: boolean;
  onClose: () => void;
  town: string;
  layer: Layer;
  from: string;
  to: string;
  towns: { slug: string; name: string }[];
  /** Date inputs appear only once some festival has a recorded date. */
  hasDated: boolean;
  resultCount: number;
  update: (patch: Record<string, string>) => void;
  onClearAll: () => void;
}

/**
 * All filters in one modal sheet: a bottom sheet on phones, a centred panel
 * on larger screens. Changes apply immediately; the native dialog handles
 * focus trapping and Escape.
 */
export default function FiltersSheet({
  open,
  onClose,
  town,
  layer,
  from,
  to,
  towns,
  hasDated,
  resultCount,
  update,
  onClearAll,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby='filters-title'
      onClose={onClose}
      // Tap on the backdrop (the dialog box itself, outside its content) closes.
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className='bg-kapwa-bg-surface text-kapwa-text-strong m-0 mt-auto w-full max-w-none rounded-t-card p-0 shadow-elev-3 backdrop:bg-[#0f234b]/40 sm:m-auto sm:max-w-md sm:rounded-card motion-safe:open:animate-[explore-sheet-up_var(--dur-base)_var(--ease-out-expo)_both]'
    >
      <div className='space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'>
        <div className='flex items-center justify-between'>
          <h2 id='filters-title' className='type-title'>
            Filters
          </h2>
          <button
            type='button'
            aria-label='Close filters'
            onClick={onClose}
            className='-mr-2 flex h-11 w-11 items-center justify-center rounded-full'
          >
            <XIcon aria-hidden='true' className='h-5 w-5' />
          </button>
        </div>

        <label className='type-meta block font-semibold'>
          Municipality
          <select
            value={town}
            onChange={e => update({ town: e.target.value, sel: '' })}
            className='field-control mt-1 block w-full font-normal'
          >
            <option value=''>All municipalities</option>
            {towns.map(m => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className='type-meta block font-semibold'>
          Show
          <select
            value={layer}
            onChange={e => update({ layer: e.target.value, sel: '' })}
            className='field-control mt-1 block w-full font-normal'
          >
            <option value='all'>All records</option>
            {(Object.keys(LAYER_LABEL) as Exclude<Layer, 'all'>[]).map(k => (
              <option key={k} value={k}>
                {LAYER_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        {hasDated ? (
          <fieldset className='type-meta grid grid-cols-2 gap-3 font-semibold'>
            <legend className='mb-1'>Festival dates</legend>
            <label>
              From
              <input
                type='date'
                value={from}
                onChange={e => update({ from: e.target.value })}
                className='field-control mt-1 block w-full font-normal'
              />
            </label>
            <label>
              To
              <input
                type='date'
                value={to}
                onChange={e => update({ to: e.target.value })}
                className='field-control mt-1 block w-full font-normal'
              />
            </label>
          </fieldset>
        ) : (
          <p className='text-kapwa-text-support type-meta'>
            No festival dates are recorded yet, so there is no date filter.
          </p>
        )}

        <div className='flex items-center justify-between gap-3 pt-2'>
          <button
            type='button'
            onClick={onClearAll}
            className='text-kapwa-text-brand min-h-11 px-1 text-sm font-bold'
          >
            Clear all
          </button>
          <button
            type='button'
            onClick={onClose}
            className='bg-kapwa-bg-brand-default text-kapwa-text-inverse min-h-11 rounded-control px-5 text-sm font-bold'
          >
            Show {resultCount} result{resultCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
