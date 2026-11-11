import { useState } from 'react';

import { LAYER_LABEL, type Rec, teaser } from '@/lib/tourism/explore';

import { LAYER_COLOR, LAYER_ICON, LAYER_LETTER, townTint } from './layerMeta';
import { DatePill, LocationPill } from './StatusPills';

interface Props {
  rec: Rec;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Image-first result card. The 16:10 frame is sized before the photo loads,
 * so nothing shifts; without a photo it shows a municipality-tinted gradient
 * with the layer icon instead.
 */
export default function RecordCard({ rec, selected, onSelect }: Props) {
  const [loaded, setLoaded] = useState(false);
  const tint = rec.image?.color ?? townTint(rec.town);
  const Icon = LAYER_ICON[rec.layer];

  return (
    <button
      type='button'
      aria-pressed={selected}
      onClick={() => onSelect(rec.id)}
      className={`group bg-kapwa-bg-surface border-kapwa-border-weak flex h-full w-full flex-col overflow-hidden rounded-panel border text-left shadow-elev-1 transition-[box-shadow,transform] duration-(--dur-fast) ease-out-expo hover:shadow-elev-2 motion-safe:hover:-translate-y-0.5 ${selected ? 'ring-2 ring-[#1D4FB0]' : ''}`}
    >
      <span
        className='relative block aspect-[16/10] w-full overflow-hidden'
        style={{
          // Blurred colour placeholder: a soft wash of the photo's (or town's) colour.
          background: `radial-gradient(120% 90% at 30% 20%, color-mix(in oklab, ${tint} 35%, white), ${tint})`,
        }}
      >
        {rec.image ? (
          <>
            <img
              src={rec.image.src}
              alt={rec.image.alt}
              width={1600}
              height={1000}
              loading='lazy'
              decoding='async'
              onLoad={() => setLoaded(true)}
              className={`h-full w-full object-cover transition-opacity duration-(--dur-base) ease-out-expo motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className='type-meta absolute right-0 bottom-0 max-w-full truncate bg-black/55 px-2 py-0.5 text-white'>
              Photo: {rec.image.credit}
            </span>
          </>
        ) : (
          <span
            aria-hidden='true'
            className='absolute inset-0 flex items-center justify-center'
          >
            <Icon className='h-10 w-10 text-white/85' strokeWidth={1.5} />
          </span>
        )}
      </span>

      <span className='flex flex-1 flex-col gap-1.5 p-3'>
        <span className='text-kapwa-text-strong type-body line-clamp-2 font-semibold'>
          {rec.name}
        </span>
        {rec.townName && (
          <span className='text-kapwa-text-support type-meta'>
            {rec.townName}
          </span>
        )}
        <span className='flex flex-wrap items-center gap-1.5'>
          <span className='type-meta border-kapwa-border-weak text-kapwa-text-strong inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold'>
            <span
              aria-hidden='true'
              className='flex h-4 w-4 items-center justify-center rounded-full text-[9px] leading-none font-bold text-white'
              style={{ background: LAYER_COLOR[rec.layer] }}
            >
              {LAYER_LETTER[rec.layer]}
            </span>
            {LAYER_LABEL[rec.layer]}
          </span>
          {rec.layer === 'event' && <DatePill rec={rec} />}
          {rec.placement !== 'exact' && (
            <LocationPill placement={rec.placement} />
          )}
        </span>
        {rec.description && (
          <span className='text-kapwa-text-support type-meta line-clamp-1'>
            {teaser(rec.description)}
          </span>
        )}
      </span>
    </button>
  );
}
