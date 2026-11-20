import { useState } from 'react';

import type { Rec } from '@/lib/tourism/explore';
import type { TourismImage as Photo } from '@/types/tourism';

import { LAYER_ICON } from './layerMeta';

type Layer = Rec['layer'];

// Fallback tiles use only brand blue, orange and one existing teal (Tailwind
// teal-600, the repo's "Dark Teal"). Orange-700 keeps the white icon at 3:1+.
const TILE: Record<Layer, string> = {
  place: 'bg-kapwa-brand-600',
  stay: 'bg-kapwa-brand-700',
  event: 'bg-kapwa-orange-700',
  product: 'bg-teal-600',
};

interface Props {
  /** Verified photo from `tourism-images.json`; omit for the fallback tile. */
  image?: Photo;
  layer: Layer;
}

/**
 * Photo frame with a fixed 16:10 ratio, so the layout is set before the image
 * loads. Lazy-loaded, with its alt text and a visible credit line. Without a
 * photo, or if the photo fails, it shows the layer's fallback tile.
 */
export default function TourismImage({ image, layer }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const Icon = LAYER_ICON[layer];
  const showPhoto = !!image && !failed;
  const credit = image ? `Photo: ${image.credit}` : '';

  return (
    <span
      className={`relative block aspect-[16/10] w-full overflow-hidden ${TILE[layer]} ${showPhoto && !loaded ? 'skeleton-shimmer' : ''}`}
    >
      {showPhoto ? (
        <>
          <img
            src={image.src}
            alt={image.alt}
            width={1600}
            height={1000}
            loading='lazy'
            decoding='async'
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-(--dur-base) ease-out-expo motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          <span
            title={credit}
            className='type-meta absolute right-0 bottom-0 max-w-full truncate bg-black/55 px-2 py-0.5 text-white'
          >
            {credit}
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
  );
}
